package session

import (
	"encoding/json"
	"os"
	"path/filepath"
	"sync"

	"github.com/google/uuid"
)

// Store manages session and folder persistence.
type Store struct {
	mu       sync.RWMutex
	filePath string
	data     StoreData
}

// NewStore creates a Store that reads/writes to %APPDATA%\GoConnect\sessions.json.
func NewStore() (*Store, error) {
	appData := os.Getenv("APPDATA")
	dir := filepath.Join(appData, "GoConnect")
	if err := os.MkdirAll(dir, 0700); err != nil {
		return nil, err
	}
	s := &Store{
		filePath: filepath.Join(dir, "sessions.json"),
	}
	if err := s.load(); err != nil && !os.IsNotExist(err) {
		return nil, err
	}
	return s, nil
}

func (s *Store) load() error {
	data, err := os.ReadFile(s.filePath)
	if err != nil {
		return err
	}
	return json.Unmarshal(data, &s.data)
}

func (s *Store) save() error {
	data, err := json.MarshalIndent(s.data, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(s.filePath, data, 0600)
}

// GetAllSessions returns all sessions.
func (s *Store) GetAllSessions() []Session {
	s.mu.RLock()
	defer s.mu.RUnlock()
	result := make([]Session, len(s.data.Sessions))
	copy(result, s.data.Sessions)
	return result
}

// GetSession returns a session by ID.
func (s *Store) GetSession(id string) *Session {
	s.mu.RLock()
	defer s.mu.RUnlock()
	for i := range s.data.Sessions {
		if s.data.Sessions[i].ID == id {
			sess := s.data.Sessions[i]
			return &sess
		}
	}
	return nil
}

// CreateSession adds a new session and returns it with a generated ID.
func (s *Store) CreateSession(sess Session) (Session, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	sess.ID = uuid.New().String()
	if sess.Port == 0 {
		switch sess.Protocol {
		case "ssh":
			sess.Port = 22
		case "telnet":
			sess.Port = 23
		case "rdp":
			sess.Port = 3389
		}
	}
	s.data.Sessions = append(s.data.Sessions, sess)
	return sess, s.save()
}

// UpdateSession replaces a session by ID.
func (s *Store) UpdateSession(sess Session) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	for i := range s.data.Sessions {
		if s.data.Sessions[i].ID == sess.ID {
			s.data.Sessions[i] = sess
			return s.save()
		}
	}
	return nil
}

// DeleteSession removes a session by ID.
func (s *Store) DeleteSession(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	for i := range s.data.Sessions {
		if s.data.Sessions[i].ID == id {
			s.data.Sessions = append(s.data.Sessions[:i], s.data.Sessions[i+1:]...)
			return s.save()
		}
	}
	return nil
}

// GetAllFolders returns all folders.
func (s *Store) GetAllFolders() []Folder {
	s.mu.RLock()
	defer s.mu.RUnlock()
	result := make([]Folder, len(s.data.Folders))
	copy(result, s.data.Folders)
	return result
}

// CreateFolder adds a new folder and returns it.
func (s *Store) CreateFolder(f Folder) (Folder, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	f.ID = uuid.New().String()
	s.data.Folders = append(s.data.Folders, f)
	return f, s.save()
}

// UpdateFolder replaces a folder by ID.
func (s *Store) UpdateFolder(f Folder) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	for i := range s.data.Folders {
		if s.data.Folders[i].ID == f.ID {
			s.data.Folders[i] = f
			return s.save()
		}
	}
	return nil
}

// DeleteFolder removes a folder by ID. Sessions in this folder are not deleted.
func (s *Store) DeleteFolder(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	for i := range s.data.Folders {
		if s.data.Folders[i].ID == id {
			s.data.Folders = append(s.data.Folders[:i], s.data.Folders[i+1:]...)
			return s.save()
		}
	}
	return nil
}
