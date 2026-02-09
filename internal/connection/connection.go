package connection

import "io"

// Connection represents an active protocol connection (SSH, Telnet, etc.).
type Connection interface {
	// ID returns the unique connection identifier.
	ID() string
	// Write sends data to the remote end.
	Write(data []byte) (int, error)
	// Reader returns a reader for the remote output stream.
	Reader() io.Reader
	// Resize changes the terminal dimensions.
	Resize(cols, rows int) error
	// Close terminates the connection.
	Close() error
}

// ConnInfo holds metadata about an active connection for the frontend.
type ConnInfo struct {
	ConnID   string `json:"connId"`
	Session  string `json:"sessionName"`
	Protocol string `json:"protocol"`
	Host     string `json:"host"`
	Port     int    `json:"port"`
	Username string `json:"username"`
	Cols     int    `json:"cols"`
	Rows     int    `json:"rows"`
}
