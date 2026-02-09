package connection

import (
	"fmt"
	"io"
	"os"
	"sync"
	"time"

	"github.com/google/uuid"
	"golang.org/x/crypto/ssh"
)

// SSHConnection wraps an SSH session with PTY support.
type SSHConnection struct {
	id      string
	client  *ssh.Client
	session *ssh.Session
	stdin   io.WriteCloser
	stdout  io.Reader
	cols    int
	rows    int
	mu      sync.Mutex
	closed  bool
}

// SSHConnectParams holds parameters for creating an SSH connection.
type SSHConnectParams struct {
	Host        string
	Port        int
	Username    string
	Password    string
	KeyFilePath string
	AuthMethod  string // "password" | "keyfile" | "agent"
	Cols        int
	Rows        int
	// Jump host fields
	JumpHost string
	JumpPort int
	JumpUser string
	JumpPass string
}

// NewSSHConnection establishes an SSH connection with a PTY.
func NewSSHConnection(params SSHConnectParams) (*SSHConnection, error) {
	if params.Cols == 0 {
		params.Cols = 80
	}
	if params.Rows == 0 {
		params.Rows = 24
	}

	authMethods, err := buildAuthMethods(params)
	if err != nil {
		return nil, fmt.Errorf("auth setup failed: %w", err)
	}

	config := &ssh.ClientConfig{
		User:            params.Username,
		Auth:            authMethods,
		HostKeyCallback: ssh.InsecureIgnoreHostKey(),
	}

	addr := fmt.Sprintf("%s:%d", params.Host, params.Port)

	var client *ssh.Client

	if params.JumpHost != "" {
		// Connect via jump host
		client, err = connectViaJumpHost(params, config, addr)
	} else {
		client, err = ssh.Dial("tcp", addr, config)
	}
	if err != nil {
		return nil, fmt.Errorf("SSH dial failed: %w", err)
	}

	session, err := client.NewSession()
	if err != nil {
		client.Close()
		return nil, fmt.Errorf("session creation failed: %w", err)
	}

	modes := ssh.TerminalModes{
		ssh.ECHO:          1,
		ssh.TTY_OP_ISPEED: 14400,
		ssh.TTY_OP_OSPEED: 14400,
	}
	if err := session.RequestPty("xterm-256color", params.Rows, params.Cols, modes); err != nil {
		session.Close()
		client.Close()
		return nil, fmt.Errorf("PTY request failed: %w", err)
	}

	stdin, err := session.StdinPipe()
	if err != nil {
		session.Close()
		client.Close()
		return nil, err
	}
	stdout, err := session.StdoutPipe()
	if err != nil {
		session.Close()
		client.Close()
		return nil, err
	}

	if err := session.Shell(); err != nil {
		session.Close()
		client.Close()
		return nil, fmt.Errorf("shell start failed: %w", err)
	}

	return &SSHConnection{
		id:      uuid.New().String(),
		client:  client,
		session: session,
		stdin:   stdin,
		stdout:  stdout,
		cols:    params.Cols,
		rows:    params.Rows,
	}, nil
}

func buildAuthMethods(params SSHConnectParams) ([]ssh.AuthMethod, error) {
	var methods []ssh.AuthMethod

	switch params.AuthMethod {
	case "keyfile":
		keyData, err := os.ReadFile(params.KeyFilePath)
		if err != nil {
			return nil, fmt.Errorf("failed to read key file: %w", err)
		}
		var signer ssh.Signer
		if params.Password != "" {
			signer, err = ssh.ParsePrivateKeyWithPassphrase(keyData, []byte(params.Password))
		} else {
			signer, err = ssh.ParsePrivateKey(keyData)
		}
		if err != nil {
			return nil, fmt.Errorf("failed to parse key: %w", err)
		}
		methods = append(methods, ssh.PublicKeys(signer))
	case "password", "":
		if params.Password != "" {
			methods = append(methods, ssh.Password(params.Password))
			methods = append(methods, ssh.KeyboardInteractive(
				func(user, instruction string, questions []string, echos []bool) ([]string, error) {
					answers := make([]string, len(questions))
					for i := range answers {
						answers[i] = params.Password
					}
					return answers, nil
				},
			))
		}
	}
	return methods, nil
}

func connectViaJumpHost(params SSHConnectParams, targetConfig *ssh.ClientConfig, targetAddr string) (*ssh.Client, error) {
	jumpConfig := &ssh.ClientConfig{
		User:            params.JumpUser,
		Auth:            []ssh.AuthMethod{ssh.Password(params.JumpPass)},
		HostKeyCallback: ssh.InsecureIgnoreHostKey(),
	}
	jumpAddr := fmt.Sprintf("%s:%d", params.JumpHost, params.JumpPort)

	jumpClient, err := ssh.Dial("tcp", jumpAddr, jumpConfig)
	if err != nil {
		return nil, fmt.Errorf("jump host dial failed: %w", err)
	}

	conn, err := jumpClient.Dial("tcp", targetAddr)
	if err != nil {
		jumpClient.Close()
		return nil, fmt.Errorf("jump host tunnel failed: %w", err)
	}

	ncc, chans, reqs, err := ssh.NewClientConn(conn, targetAddr, targetConfig)
	if err != nil {
		conn.Close()
		jumpClient.Close()
		return nil, err
	}

	return ssh.NewClient(ncc, chans, reqs), nil
}

func (c *SSHConnection) ID() string { return c.id }

func (c *SSHConnection) Write(data []byte) (int, error) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.closed {
		return 0, fmt.Errorf("connection closed")
	}
	return c.stdin.Write(data)
}

func (c *SSHConnection) Reader() io.Reader {
	return c.stdout
}

func (c *SSHConnection) Resize(cols, rows int) error {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.closed {
		return fmt.Errorf("connection closed")
	}
	c.cols = cols
	c.rows = rows
	return c.session.WindowChange(rows, cols)
}

func (c *SSHConnection) Close() error {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.closed {
		return nil
	}
	c.closed = true
	c.session.Close()
	return c.client.Close()
}

// KeepAlive sends periodic keep-alive requests.
// Call this in a goroutine. It stops when the connection is closed.
func (c *SSHConnection) KeepAlive(intervalSec int) {
	if intervalSec <= 0 {
		return
	}
	ticker := time.NewTicker(time.Duration(intervalSec) * time.Second)
	defer ticker.Stop()
	for range ticker.C {
		c.mu.Lock()
		closed := c.closed
		c.mu.Unlock()
		if closed {
			return
		}
		_, _, err := c.client.SendRequest("keepalive@openssh.com", true, nil)
		if err != nil {
			return
		}
	}
}
