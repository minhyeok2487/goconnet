package connection

import (
	"fmt"
	"io"
	"sync"
	"time"

	"github.com/google/uuid"
	"go.bug.st/serial"
)

// SerialConnection wraps a serial port connection.
type SerialConnection struct {
	id     string
	port   serial.Port
	reader io.Reader
	mu     sync.Mutex
	closed bool
}

// SerialConnectParams holds parameters for creating a serial connection.
type SerialConnectParams struct {
	PortName string // "COM1", "COM3", etc.
	BaudRate int    // 9600, 19200, 38400, 57600, 115200
	DataBits int    // 7, 8
	StopBits int    // 1, 2 (1=OneStopBit, 2=TwoStopBits)
	Parity   string // "none", "odd", "even", "mark", "space"
	FlowCtrl string // "none", "hardware", "software"
}

// NewSerialConnection opens a serial port connection.
func NewSerialConnection(params SerialConnectParams) (*SerialConnection, error) {
	if params.BaudRate == 0 {
		params.BaudRate = 9600
	}
	if params.DataBits == 0 {
		params.DataBits = 8
	}

	mode := &serial.Mode{
		BaudRate: params.BaudRate,
		DataBits: params.DataBits,
	}

	// Stop bits
	switch params.StopBits {
	case 2:
		mode.StopBits = serial.TwoStopBits
	default:
		mode.StopBits = serial.OneStopBit
	}

	// Parity
	switch params.Parity {
	case "odd":
		mode.Parity = serial.OddParity
	case "even":
		mode.Parity = serial.EvenParity
	case "mark":
		mode.Parity = serial.MarkParity
	case "space":
		mode.Parity = serial.SpaceParity
	default:
		mode.Parity = serial.NoParity
	}

	port, err := serial.Open(params.PortName, mode)
	if err != nil {
		return nil, fmt.Errorf("failed to open serial port %s: %w", params.PortName, err)
	}

	// Set read timeout so Read() returns quickly with available data
	// instead of blocking indefinitely
	port.SetReadTimeout(100 * time.Millisecond)

	// Flow control
	if params.FlowCtrl == "hardware" {
		port.SetDTR(true)
		port.SetRTS(true)
	}

	conn := &SerialConnection{
		id:   uuid.New().String(),
		port: port,
	}
	conn.reader = &serialReader{port: port, conn: conn}
	return conn, nil
}

// ListSerialPorts returns available serial (COM) ports on the system.
func ListSerialPorts() ([]string, error) {
	ports, err := serial.GetPortsList()
	if err != nil {
		return nil, fmt.Errorf("failed to list serial ports: %w", err)
	}
	return ports, nil
}

func (c *SerialConnection) ID() string { return c.id }

func (c *SerialConnection) Write(data []byte) (int, error) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.closed {
		return 0, fmt.Errorf("connection closed")
	}
	return c.port.Write(data)
}

func (c *SerialConnection) Reader() io.Reader {
	return c.reader
}

func (c *SerialConnection) Resize(cols, rows int) error {
	// Serial connections don't support terminal resize
	return nil
}

func (c *SerialConnection) Close() error {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.closed {
		return nil
	}
	c.closed = true
	return c.port.Close()
}

// serialReader wraps serial port reads, filtering out timeout zero-reads
// so the manager readLoop doesn't treat them as errors.
type serialReader struct {
	port serial.Port
	conn *SerialConnection
}

func (r *serialReader) Read(p []byte) (int, error) {
	for {
		r.conn.mu.Lock()
		closed := r.conn.closed
		r.conn.mu.Unlock()
		if closed {
			return 0, io.EOF
		}

		n, err := r.port.Read(p)
		if n > 0 {
			return n, nil
		}
		// Timeout with 0 bytes - just retry
		if err == nil {
			continue
		}
		return 0, err
	}
}
