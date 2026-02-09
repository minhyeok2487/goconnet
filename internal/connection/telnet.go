package connection

import (
	"fmt"
	"io"
	"net"
	"sync"
	"time"

	"github.com/google/uuid"
)

// Telnet IAC (Interpret As Command) constants
const (
	iacSE   byte = 240 // End of subnegotiation
	iacSB   byte = 250 // Subnegotiation Begin
	iacWILL byte = 251
	iacWONT byte = 252
	iacDO   byte = 253
	iacDONT byte = 254
	iacIAC  byte = 255

	// Telnet options
	optEcho    byte = 1
	optSGA     byte = 3  // Suppress Go Ahead
	optNAWS    byte = 31 // Negotiate About Window Size
	optTType   byte = 24 // Terminal Type
)

// TelnetConnection wraps a raw TCP connection with IAC negotiation.
type TelnetConnection struct {
	id     string
	conn   net.Conn
	reader *telnetReader
	cols   int
	rows   int
	mu     sync.Mutex
	closed bool
}

// TelnetConnectParams holds parameters for creating a Telnet connection.
type TelnetConnectParams struct {
	Host string
	Port int
	Cols int
	Rows int
}

// NewTelnetConnection establishes a Telnet connection.
func NewTelnetConnection(params TelnetConnectParams) (*TelnetConnection, error) {
	if params.Cols == 0 {
		params.Cols = 80
	}
	if params.Rows == 0 {
		params.Rows = 24
	}

	addr := net.JoinHostPort(params.Host, fmt.Sprintf("%d", params.Port))
	conn, err := net.DialTimeout("tcp", addr, 10*time.Second)
	if err != nil {
		return nil, fmt.Errorf("telnet dial failed: %w", err)
	}

	tc := &TelnetConnection{
		id:   uuid.New().String(),
		conn: conn,
		cols: params.Cols,
		rows: params.Rows,
	}
	tc.reader = newTelnetReader(conn, tc)
	return tc, nil
}

func (c *TelnetConnection) ID() string { return c.id }

func (c *TelnetConnection) Write(data []byte) (int, error) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.closed {
		return 0, fmt.Errorf("connection closed")
	}
	return c.conn.Write(data)
}

func (c *TelnetConnection) Reader() io.Reader {
	return c.reader
}

func (c *TelnetConnection) Resize(cols, rows int) error {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.closed {
		return fmt.Errorf("connection closed")
	}
	c.cols = cols
	c.rows = rows
	return c.sendNAWS()
}

func (c *TelnetConnection) Close() error {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.closed {
		return nil
	}
	c.closed = true
	return c.conn.Close()
}

// sendNAWS sends a Negotiate About Window Size subnegotiation.
func (c *TelnetConnection) sendNAWS() error {
	msg := []byte{
		iacIAC, iacSB, optNAWS,
		byte(c.cols >> 8), byte(c.cols & 0xff),
		byte(c.rows >> 8), byte(c.rows & 0xff),
		iacIAC, iacSE,
	}
	_, err := c.conn.Write(msg)
	return err
}

// respondToCommand handles IAC commands from the server.
func (c *TelnetConnection) respondToCommand(cmd, opt byte) {
	var resp byte
	switch cmd {
	case iacDO:
		switch opt {
		case optNAWS:
			resp = iacWILL
			// Also send window size immediately
			c.mu.Lock()
			c.sendNAWS()
			c.mu.Unlock()
		case optTType:
			resp = iacWILL
		case optSGA:
			resp = iacWILL
		default:
			resp = iacWONT
		}
	case iacWILL:
		switch opt {
		case optEcho, optSGA:
			resp = iacDO
		default:
			resp = iacDONT
		}
	case iacWONT:
		resp = iacDONT
	case iacDONT:
		resp = iacWONT
	default:
		return
	}
	c.conn.Write([]byte{iacIAC, resp, opt})
}

// respondToSubnegotiation handles IAC SB subnegotiation from the server.
func (c *TelnetConnection) respondToSubnegotiation(opt byte, _ []byte) {
	if opt == optTType {
		// Send terminal type "xterm"
		resp := []byte{iacIAC, iacSB, optTType, 0} // 0 = IS
		resp = append(resp, []byte("xterm")...)
		resp = append(resp, iacIAC, iacSE)
		c.conn.Write(resp)
	}
}

// telnetReader strips IAC commands from the stream.
type telnetReader struct {
	raw  io.Reader
	conn *TelnetConnection
	buf  [4096]byte
}

func newTelnetReader(raw io.Reader, conn *TelnetConnection) *telnetReader {
	return &telnetReader{raw: raw, conn: conn}
}

func (r *telnetReader) Read(p []byte) (int, error) {
	n, err := r.raw.Read(r.buf[:])
	if n == 0 {
		return 0, err
	}
	out := 0
	i := 0
	for i < n {
		if r.buf[i] == iacIAC && i+1 < n {
			i++
			switch r.buf[i] {
			case iacIAC:
				// Escaped 0xFF
				if out < len(p) {
					p[out] = 0xFF
					out++
				}
				i++
			case iacWILL, iacWONT, iacDO, iacDONT:
				if i+1 < n {
					r.conn.respondToCommand(r.buf[i], r.buf[i+1])
					i += 2
				} else {
					i++
				}
			case iacSB:
				// Subnegotiation: find SE
				i++
				if i < n {
					opt := r.buf[i]
					i++
					var subData []byte
					for i < n {
						if r.buf[i] == iacIAC && i+1 < n && r.buf[i+1] == iacSE {
							i += 2
							break
						}
						subData = append(subData, r.buf[i])
						i++
					}
					r.conn.respondToSubnegotiation(opt, subData)
				}
			default:
				i++
			}
		} else {
			if out < len(p) {
				p[out] = r.buf[i]
				out++
			}
			i++
		}
	}
	if out == 0 && err == nil {
		// All data was IAC commands; try reading more
		return r.Read(p)
	}
	return out, err
}
