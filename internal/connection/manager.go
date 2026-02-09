package connection

import (
	"context"
	"fmt"
	"io"
	"sync"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// Manager manages active connections and bridges them to Wails events.
type Manager struct {
	ctx   context.Context
	conns map[string]Connection
	info  map[string]*ConnInfo
	mu    sync.RWMutex
}

// NewManager creates a connection manager.
func NewManager() *Manager {
	return &Manager{
		conns: make(map[string]Connection),
		info:  make(map[string]*ConnInfo),
	}
}

// SetContext sets the Wails runtime context (called from app.startup).
func (m *Manager) SetContext(ctx context.Context) {
	m.ctx = ctx
}

// Add registers a connection and starts the output reader goroutine.
func (m *Manager) Add(conn Connection, connInfo *ConnInfo) {
	m.mu.Lock()
	connInfo.ConnID = conn.ID()
	m.conns[conn.ID()] = conn
	m.info[conn.ID()] = connInfo
	m.mu.Unlock()

	go m.readLoop(conn)
}

// readLoop reads from the connection and emits terminal data events.
// Following pomdtr/wails-terminal pattern: send string directly, no base64.
func (m *Manager) readLoop(conn Connection) {
	buf := make([]byte, 4096)
	reader := conn.Reader()
	connID := conn.ID()

	for {
		n, err := reader.Read(buf)
		if n > 0 {
			// Convert to string directly - avoids base64 encoding issues
			// Wails EventsEmit will JSON-serialize string as-is
			data := string(buf[:n])
			if m.ctx != nil {
				runtime.EventsEmit(m.ctx, "terminal:data", connID, data)
			}
		}
		if err != nil {
			if m.ctx != nil {
				errMsg := ""
				if err != io.EOF {
					errMsg = err.Error()
				}
				runtime.EventsEmit(m.ctx, "terminal:closed", connID, errMsg)
			}
			m.Remove(connID)
			return
		}
	}
}

// SendInput writes user input to a connection.
// Receives raw string from frontend (no base64).
func (m *Manager) SendInput(connID string, data string) error {
	m.mu.RLock()
	conn, ok := m.conns[connID]
	m.mu.RUnlock()
	if !ok {
		return fmt.Errorf("connection not found: %s", connID)
	}

	_, err := conn.Write([]byte(data))
	return err
}

// ResizeTerminal resizes the PTY of a connection.
func (m *Manager) ResizeTerminal(connID string, cols, rows int) error {
	m.mu.RLock()
	conn, ok := m.conns[connID]
	info := m.info[connID]
	m.mu.RUnlock()
	if !ok {
		return fmt.Errorf("connection not found: %s", connID)
	}
	if info != nil {
		info.Cols = cols
		info.Rows = rows
	}
	return conn.Resize(cols, rows)
}

// Remove closes and removes a connection.
func (m *Manager) Remove(connID string) {
	m.mu.Lock()
	conn, ok := m.conns[connID]
	if ok {
		delete(m.conns, connID)
		delete(m.info, connID)
	}
	m.mu.Unlock()
	if ok && conn != nil {
		conn.Close()
	}
}

// GetInfo returns metadata about an active connection.
func (m *Manager) GetInfo(connID string) *ConnInfo {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.info[connID]
}

// GetAllInfo returns metadata about all active connections.
func (m *Manager) GetAllInfo() []*ConnInfo {
	m.mu.RLock()
	defer m.mu.RUnlock()
	result := make([]*ConnInfo, 0, len(m.info))
	for _, info := range m.info {
		result = append(result, info)
	}
	return result
}

// CloseAll closes all active connections.
func (m *Manager) CloseAll() {
	m.mu.Lock()
	conns := make([]Connection, 0, len(m.conns))
	for _, c := range m.conns {
		conns = append(conns, c)
	}
	m.conns = make(map[string]Connection)
	m.info = make(map[string]*ConnInfo)
	m.mu.Unlock()

	for _, c := range conns {
		c.Close()
	}
}
