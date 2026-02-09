package connection

import (
	"fmt"
	"io"
	"os"
	"path/filepath"
	"sort"
	"sync"

	"github.com/pkg/sftp"
	"golang.org/x/crypto/ssh"
)

// SFTPFileInfo represents a file or directory for the frontend.
type SFTPFileInfo struct {
	Name    string `json:"name"`
	Path    string `json:"path"`
	Size    int64  `json:"size"`
	IsDir   bool   `json:"isDir"`
	ModTime int64  `json:"modTime"` // Unix timestamp
	Mode    string `json:"mode"`
}

// SFTPSession wraps an SFTP client.
type SFTPSession struct {
	id     string
	client *sftp.Client
	ssh    *ssh.Client
	mu     sync.Mutex
	closed bool
}

// SFTPManager manages SFTP sessions.
type SFTPManager struct {
	sessions map[string]*SFTPSession
	mu       sync.RWMutex
}

// NewSFTPManager creates an SFTPManager.
func NewSFTPManager() *SFTPManager {
	return &SFTPManager{
		sessions: make(map[string]*SFTPSession),
	}
}

// OpenSFTP creates an SFTP session using SSH connection parameters.
func (m *SFTPManager) OpenSFTP(id string, host string, port int, user, password, keyFile string) error {
	var authMethods []ssh.AuthMethod
	if password != "" {
		authMethods = append(authMethods, ssh.Password(password))
	}
	if keyFile != "" {
		keyData, err := os.ReadFile(keyFile)
		if err == nil {
			signer, err := ssh.ParsePrivateKey(keyData)
			if err == nil {
				authMethods = append(authMethods, ssh.PublicKeys(signer))
			}
		}
	}

	config := &ssh.ClientConfig{
		User:            user,
		Auth:            authMethods,
		HostKeyCallback: ssh.InsecureIgnoreHostKey(),
	}

	addr := fmt.Sprintf("%s:%d", host, port)
	sshClient, err := ssh.Dial("tcp", addr, config)
	if err != nil {
		return fmt.Errorf("SSH dial failed: %w", err)
	}

	sftpClient, err := sftp.NewClient(sshClient)
	if err != nil {
		sshClient.Close()
		return fmt.Errorf("SFTP session failed: %w", err)
	}

	m.mu.Lock()
	m.sessions[id] = &SFTPSession{
		id:     id,
		client: sftpClient,
		ssh:    sshClient,
	}
	m.mu.Unlock()

	return nil
}

// CloseSFTP closes an SFTP session.
func (m *SFTPManager) CloseSFTP(id string) {
	m.mu.Lock()
	sess, ok := m.sessions[id]
	if ok {
		delete(m.sessions, id)
	}
	m.mu.Unlock()

	if ok && sess != nil {
		sess.client.Close()
		sess.ssh.Close()
	}
}

// ListDir lists files in a directory.
func (m *SFTPManager) ListDir(id, path string) ([]SFTPFileInfo, error) {
	sess := m.getSession(id)
	if sess == nil {
		return nil, fmt.Errorf("SFTP session not found: %s", id)
	}

	entries, err := sess.client.ReadDir(path)
	if err != nil {
		return nil, fmt.Errorf("failed to list directory: %w", err)
	}

	result := make([]SFTPFileInfo, 0, len(entries))
	for _, entry := range entries {
		result = append(result, SFTPFileInfo{
			Name:    entry.Name(),
			Path:    path + "/" + entry.Name(),
			Size:    entry.Size(),
			IsDir:   entry.IsDir(),
			ModTime: entry.ModTime().Unix(),
			Mode:    entry.Mode().String(),
		})
	}

	// Sort: directories first, then by name
	sort.Slice(result, func(i, j int) bool {
		if result[i].IsDir != result[j].IsDir {
			return result[i].IsDir
		}
		return result[i].Name < result[j].Name
	})

	return result, nil
}

// GetHomePath returns the home directory path.
func (m *SFTPManager) GetHomePath(id string) (string, error) {
	sess := m.getSession(id)
	if sess == nil {
		return "", fmt.Errorf("SFTP session not found: %s", id)
	}
	return sess.client.Getwd()
}

// Download copies a remote file to a local path.
func (m *SFTPManager) Download(id, remotePath, localPath string) error {
	sess := m.getSession(id)
	if sess == nil {
		return fmt.Errorf("SFTP session not found: %s", id)
	}

	remoteFile, err := sess.client.Open(remotePath)
	if err != nil {
		return fmt.Errorf("failed to open remote file: %w", err)
	}
	defer remoteFile.Close()

	localFile, err := os.Create(localPath)
	if err != nil {
		return fmt.Errorf("failed to create local file: %w", err)
	}
	defer localFile.Close()

	_, err = io.Copy(localFile, remoteFile)
	return err
}

// Upload copies a local file to a remote path.
func (m *SFTPManager) Upload(id, localPath, remotePath string) error {
	sess := m.getSession(id)
	if sess == nil {
		return fmt.Errorf("SFTP session not found: %s", id)
	}

	localFile, err := os.Open(localPath)
	if err != nil {
		return fmt.Errorf("failed to open local file: %w", err)
	}
	defer localFile.Close()

	remoteFile, err := sess.client.Create(remotePath)
	if err != nil {
		return fmt.Errorf("failed to create remote file: %w", err)
	}
	defer remoteFile.Close()

	_, err = io.Copy(remoteFile, localFile)
	return err
}

// Delete removes a remote file or empty directory.
func (m *SFTPManager) Delete(id, remotePath string) error {
	sess := m.getSession(id)
	if sess == nil {
		return fmt.Errorf("SFTP session not found: %s", id)
	}

	info, err := sess.client.Stat(remotePath)
	if err != nil {
		return err
	}

	if info.IsDir() {
		return sess.client.RemoveDirectory(remotePath)
	}
	return sess.client.Remove(remotePath)
}

// Rename renames a remote file/directory.
func (m *SFTPManager) Rename(id, oldPath, newPath string) error {
	sess := m.getSession(id)
	if sess == nil {
		return fmt.Errorf("SFTP session not found: %s", id)
	}
	return sess.client.Rename(oldPath, newPath)
}

// MkDir creates a remote directory.
func (m *SFTPManager) MkDir(id, path string) error {
	sess := m.getSession(id)
	if sess == nil {
		return fmt.Errorf("SFTP session not found: %s", id)
	}
	return sess.client.MkdirAll(path)
}

// CloseAll closes all SFTP sessions.
func (m *SFTPManager) CloseAll() {
	m.mu.Lock()
	sessions := make([]*SFTPSession, 0, len(m.sessions))
	for _, s := range m.sessions {
		sessions = append(sessions, s)
	}
	m.sessions = make(map[string]*SFTPSession)
	m.mu.Unlock()

	for _, s := range sessions {
		s.client.Close()
		s.ssh.Close()
	}
}

func (m *SFTPManager) getSession(id string) *SFTPSession {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.sessions[id]
}

// Unused but kept for reference: resolve local download path
func defaultDownloadPath(filename string) string {
	home, _ := os.UserHomeDir()
	return filepath.Join(home, "Downloads", filename)
}
