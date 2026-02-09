package session

// Session represents a saved connection session.
type Session struct {
	ID            string         `json:"id"`
	Name          string         `json:"name"`
	FolderID      string         `json:"folderId"`
	Protocol      string         `json:"protocol"` // "ssh" | "telnet" | "rdp" | "serial"
	Host          string         `json:"host"`
	Port          int            `json:"port"`
	Username      string         `json:"username"`
	AuthMethod    string         `json:"authMethod"` // "password" | "keyfile" | "agent"
	KeyFilePath   string         `json:"keyFilePath,omitempty"`
	SSHOptions    *SSHOptions    `json:"sshOptions,omitempty"`
	RDPOptions    *RDPOptions    `json:"rdpOptions,omitempty"`
	SerialOptions *SerialOptions `json:"serialOptions,omitempty"`
}

// SSHOptions holds SSH-specific connection options.
type SSHOptions struct {
	KeepAliveInterval int    `json:"keepAliveInterval"` // seconds, 0 = disabled
	Compression       bool   `json:"compression"`
	JumpHost          string `json:"jumpHost,omitempty"`
	JumpPort          int    `json:"jumpPort,omitempty"`
	JumpUser          string `json:"jumpUser,omitempty"`
}

// RDPOptions holds RDP-specific connection options.
type RDPOptions struct {
	Width            int    `json:"width"`
	Height           int    `json:"height"`
	ColorDepth       int    `json:"colorDepth"` // 15, 16, 24, 32
	FullScreen       bool   `json:"fullScreen"`
	DriveRedirect    bool   `json:"driveRedirect"`
	ClipboardRedirect bool  `json:"clipboardRedirect"`
	AudioRedirect    string `json:"audioRedirect"` // "local" | "remote" | "none"
}

// SerialOptions holds serial port connection options.
type SerialOptions struct {
	PortName string `json:"portName"` // "COM1", "COM3", etc.
	BaudRate int    `json:"baudRate"` // 9600, 19200, 38400, 57600, 115200
	DataBits int    `json:"dataBits"` // 7, 8
	StopBits int    `json:"stopBits"` // 1, 2
	Parity   string `json:"parity"`   // "none" | "odd" | "even" | "mark" | "space"
	FlowCtrl string `json:"flowCtrl"` // "none" | "hardware" | "software"
}

// Folder represents a folder for organizing sessions.
type Folder struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	ParentID string `json:"parentId,omitempty"`
}

// StoreData is the root structure persisted to sessions.json.
type StoreData struct {
	Sessions []Session `json:"sessions"`
	Folders  []Folder  `json:"folders"`
}
