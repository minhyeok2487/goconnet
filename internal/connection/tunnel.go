package connection

import (
	"fmt"
	"io"
	"net"
	"os"
	"sync"

	"github.com/google/uuid"
	"golang.org/x/crypto/ssh"
)

// TunnelType defines the port forwarding direction.
type TunnelType string

const (
	TunnelLocal TunnelType = "local" // Local port -> Remote host via SSH
)

// TunnelInfo holds metadata about an active tunnel.
type TunnelInfo struct {
	ID         string     `json:"id"`
	Type       TunnelType `json:"type"`
	LocalAddr  string     `json:"localAddr"`
	RemoteAddr string     `json:"remoteAddr"`
	SSHHost    string     `json:"sshHost"`
	SSHPort    int        `json:"sshPort"`
	SSHUser    string     `json:"sshUser"`
	Active     bool       `json:"active"`
}

// TunnelParams holds parameters for creating a tunnel.
type TunnelParams struct {
	Type       TunnelType `json:"type"`
	LocalHost  string     `json:"localHost"`
	LocalPort  int        `json:"localPort"`
	RemoteHost string     `json:"remoteHost"`
	RemotePort int        `json:"remotePort"`
	SSHHost    string     `json:"sshHost"`
	SSHPort    int        `json:"sshPort"`
	SSHUser    string     `json:"sshUser"`
	SSHPass    string     `json:"sshPass"`
	KeyFile    string     `json:"keyFile"`
}

// Tunnel represents an active SSH tunnel.
type Tunnel struct {
	id       string
	info     TunnelInfo
	client   *ssh.Client
	listener net.Listener
	done     chan struct{}
	mu       sync.Mutex
	closed   bool
}

// TunnelManager manages SSH tunnels.
type TunnelManager struct {
	tunnels map[string]*Tunnel
	mu      sync.RWMutex
}

// NewTunnelManager creates a TunnelManager.
func NewTunnelManager() *TunnelManager {
	return &TunnelManager{
		tunnels: make(map[string]*Tunnel),
	}
}

// CreateLocalTunnel creates a local port forwarding tunnel.
func (tm *TunnelManager) CreateLocalTunnel(params TunnelParams) (*TunnelInfo, error) {
	client, err := sshDialForTunnel(params)
	if err != nil {
		return nil, err
	}

	localAddr := fmt.Sprintf("%s:%d", params.LocalHost, params.LocalPort)
	remoteAddr := fmt.Sprintf("%s:%d", params.RemoteHost, params.RemotePort)

	listener, err := net.Listen("tcp", localAddr)
	if err != nil {
		client.Close()
		return nil, fmt.Errorf("failed to listen on %s: %w", localAddr, err)
	}

	id := uuid.New().String()
	info := TunnelInfo{
		ID:         id,
		Type:       TunnelLocal,
		LocalAddr:  listener.Addr().String(),
		RemoteAddr: remoteAddr,
		SSHHost:    params.SSHHost,
		SSHPort:    params.SSHPort,
		SSHUser:    params.SSHUser,
		Active:     true,
	}

	tunnel := &Tunnel{
		id:       id,
		info:     info,
		client:   client,
		listener: listener,
		done:     make(chan struct{}),
	}

	tm.mu.Lock()
	tm.tunnels[id] = tunnel
	tm.mu.Unlock()

	go func() {
		for {
			select {
			case <-tunnel.done:
				return
			default:
			}
			conn, err := listener.Accept()
			if err != nil {
				return
			}
			go func(localConn net.Conn) {
				remoteConn, err := client.Dial("tcp", remoteAddr)
				if err != nil {
					localConn.Close()
					return
				}
				go copyAndClose(localConn, remoteConn)
				go copyAndClose(remoteConn, localConn)
			}(conn)
		}
	}()

	return &info, nil
}

// CloseTunnel stops a tunnel by ID.
func (tm *TunnelManager) CloseTunnel(id string) error {
	tm.mu.Lock()
	tunnel, ok := tm.tunnels[id]
	if ok {
		delete(tm.tunnels, id)
	}
	tm.mu.Unlock()

	if !ok {
		return fmt.Errorf("tunnel not found: %s", id)
	}
	return tunnel.Close()
}

// GetAllTunnels returns info about all tunnels.
func (tm *TunnelManager) GetAllTunnels() []TunnelInfo {
	tm.mu.RLock()
	defer tm.mu.RUnlock()
	result := make([]TunnelInfo, 0, len(tm.tunnels))
	for _, t := range tm.tunnels {
		result = append(result, t.info)
	}
	return result
}

// CloseAllTunnels closes all tunnels.
func (tm *TunnelManager) CloseAllTunnels() {
	tm.mu.Lock()
	tunnels := make([]*Tunnel, 0, len(tm.tunnels))
	for _, t := range tm.tunnels {
		tunnels = append(tunnels, t)
	}
	tm.tunnels = make(map[string]*Tunnel)
	tm.mu.Unlock()

	for _, t := range tunnels {
		t.Close()
	}
}

// Close shuts down a tunnel.
func (t *Tunnel) Close() error {
	t.mu.Lock()
	defer t.mu.Unlock()
	if t.closed {
		return nil
	}
	t.closed = true
	close(t.done)
	if t.listener != nil {
		t.listener.Close()
	}
	if t.client != nil {
		t.client.Close()
	}
	return nil
}

func sshDialForTunnel(params TunnelParams) (*ssh.Client, error) {
	var authMethods []ssh.AuthMethod
	if params.SSHPass != "" {
		authMethods = append(authMethods, ssh.Password(params.SSHPass))
	}
	if params.KeyFile != "" {
		keyData, err := os.ReadFile(params.KeyFile)
		if err == nil {
			signer, err := ssh.ParsePrivateKey(keyData)
			if err == nil {
				authMethods = append(authMethods, ssh.PublicKeys(signer))
			}
		}
	}

	config := &ssh.ClientConfig{
		User:            params.SSHUser,
		Auth:            authMethods,
		HostKeyCallback: ssh.InsecureIgnoreHostKey(),
	}

	addr := fmt.Sprintf("%s:%d", params.SSHHost, params.SSHPort)
	return ssh.Dial("tcp", addr, config)
}

func copyAndClose(dst, src net.Conn) {
	io.Copy(dst, src)
	dst.Close()
}
