package main

import (
	"context"
	"fmt"
	"os"

	wailsRuntime "github.com/wailsapp/wails/v2/pkg/runtime"

	"goconnect/internal/connection"
	"goconnect/internal/crypto"
	"goconnect/internal/session"
	"goconnect/internal/settings"
)

// App struct holds the application state and provides Wails-bound methods.
type App struct {
	ctx      context.Context
	store    *session.Store
	manager  *connection.Manager
	settings *settings.Store
}

// NewApp creates a new App application struct.
func NewApp() *App {
	return &App{
		manager: connection.NewManager(),
	}
}

// startup is called when the app starts.
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	a.manager.SetContext(ctx)

	store, err := session.NewStore()
	if err != nil {
		fmt.Println("Failed to initialize session store:", err)
		return
	}
	a.store = store
	a.settings = settings.NewStore()
}

// shutdown is called when the app is closing.
func (a *App) shutdown(ctx context.Context) {
	a.manager.CloseAll()
}

// --- Session CRUD ---

// GetSessions returns all saved sessions.
func (a *App) GetSessions() []session.Session {
	if a.store == nil {
		return nil
	}
	return a.store.GetAllSessions()
}

// GetSession returns a single session by ID.
func (a *App) GetSession(id string) *session.Session {
	if a.store == nil {
		return nil
	}
	return a.store.GetSession(id)
}

// CreateSession creates a new session.
func (a *App) CreateSession(sess session.Session) (session.Session, error) {
	if a.store == nil {
		return sess, fmt.Errorf("store not initialized")
	}
	return a.store.CreateSession(sess)
}

// UpdateSession updates an existing session.
func (a *App) UpdateSession(sess session.Session) error {
	if a.store == nil {
		return fmt.Errorf("store not initialized")
	}
	return a.store.UpdateSession(sess)
}

// DeleteSession deletes a session and its stored password.
func (a *App) DeleteSession(id string) error {
	if a.store == nil {
		return fmt.Errorf("store not initialized")
	}
	crypto.DeletePassword(id)
	return a.store.DeleteSession(id)
}

// --- Folder CRUD ---

// GetFolders returns all folders.
func (a *App) GetFolders() []session.Folder {
	if a.store == nil {
		return nil
	}
	return a.store.GetAllFolders()
}

// CreateFolder creates a new folder.
func (a *App) CreateFolder(f session.Folder) (session.Folder, error) {
	if a.store == nil {
		return f, fmt.Errorf("store not initialized")
	}
	return a.store.CreateFolder(f)
}

// UpdateFolder updates a folder.
func (a *App) UpdateFolder(f session.Folder) error {
	if a.store == nil {
		return fmt.Errorf("store not initialized")
	}
	return a.store.UpdateFolder(f)
}

// DeleteFolder deletes a folder.
func (a *App) DeleteFolder(id string) error {
	if a.store == nil {
		return fmt.Errorf("store not initialized")
	}
	return a.store.DeleteFolder(id)
}

// --- Password Management ---

// SavePassword stores a password for a session in Windows Credential Manager.
func (a *App) SavePassword(sessionID, password string) error {
	return crypto.SavePassword(sessionID, password)
}

// GetPassword retrieves a stored password for a session.
func (a *App) GetPassword(sessionID string) (string, error) {
	return crypto.GetPassword(sessionID)
}

// --- Connection Management ---

// ConnectSSH opens an SSH connection for the given session ID.
func (a *App) ConnectSSH(sessionID string, cols, rows int) (string, error) {
	sess := a.store.GetSession(sessionID)
	if sess == nil {
		return "", fmt.Errorf("session not found: %s", sessionID)
	}

	password, _ := crypto.GetPassword(sessionID)

	params := connection.SSHConnectParams{
		Host:       sess.Host,
		Port:       sess.Port,
		Username:   sess.Username,
		Password:   password,
		AuthMethod: sess.AuthMethod,
		Cols:       cols,
		Rows:       rows,
	}
	if sess.AuthMethod == "keyfile" {
		params.KeyFilePath = sess.KeyFilePath
	}
	if sess.SSHOptions != nil && sess.SSHOptions.JumpHost != "" {
		params.JumpHost = sess.SSHOptions.JumpHost
		params.JumpPort = sess.SSHOptions.JumpPort
		params.JumpUser = sess.SSHOptions.JumpUser
	}

	conn, err := connection.NewSSHConnection(params)
	if err != nil {
		return "", err
	}

	info := &connection.ConnInfo{
		Session:  sess.Name,
		Protocol: "ssh",
		Host:     sess.Host,
		Port:     sess.Port,
		Username: sess.Username,
		Cols:     cols,
		Rows:     rows,
	}
	a.manager.Add(conn, info)
	return conn.ID(), nil
}

// ConnectTelnet opens a Telnet connection for the given session ID.
func (a *App) ConnectTelnet(sessionID string, cols, rows int) (string, error) {
	sess := a.store.GetSession(sessionID)
	if sess == nil {
		return "", fmt.Errorf("session not found: %s", sessionID)
	}

	params := connection.TelnetConnectParams{
		Host: sess.Host,
		Port: sess.Port,
		Cols: cols,
		Rows: rows,
	}

	conn, err := connection.NewTelnetConnection(params)
	if err != nil {
		return "", err
	}

	info := &connection.ConnInfo{
		Session:  sess.Name,
		Protocol: "telnet",
		Host:     sess.Host,
		Port:     sess.Port,
		Username: sess.Username,
		Cols:     cols,
		Rows:     rows,
	}
	a.manager.Add(conn, info)
	return conn.ID(), nil
}

// ConnectRDP launches an RDP session for the given session ID.
func (a *App) ConnectRDP(sessionID string) (string, error) {
	sess := a.store.GetSession(sessionID)
	if sess == nil {
		return "", fmt.Errorf("session not found: %s", sessionID)
	}

	password, _ := crypto.GetPassword(sessionID)

	params := connection.RDPLaunchParams{
		Host:     sess.Host,
		Port:     sess.Port,
		Username: sess.Username,
		Password: password,
	}
	if sess.RDPOptions != nil {
		params.Width = sess.RDPOptions.Width
		params.Height = sess.RDPOptions.Height
		params.ColorDepth = sess.RDPOptions.ColorDepth
		params.FullScreen = sess.RDPOptions.FullScreen
		params.DriveRedirect = sess.RDPOptions.DriveRedirect
		params.ClipboardRedirect = sess.RDPOptions.ClipboardRedirect
		params.AudioRedirect = sess.RDPOptions.AudioRedirect
	}

	rdpFile, err := connection.LaunchRDP(params)
	if err != nil {
		return "", err
	}
	return rdpFile, nil
}

// ConnectSerial opens a serial port connection for the given session ID.
func (a *App) ConnectSerial(sessionID string) (string, error) {
	sess := a.store.GetSession(sessionID)
	if sess == nil {
		return "", fmt.Errorf("session not found: %s", sessionID)
	}
	if sess.SerialOptions == nil {
		return "", fmt.Errorf("serial options not configured for session: %s", sessionID)
	}

	params := connection.SerialConnectParams{
		PortName: sess.SerialOptions.PortName,
		BaudRate: sess.SerialOptions.BaudRate,
		DataBits: sess.SerialOptions.DataBits,
		StopBits: sess.SerialOptions.StopBits,
		Parity:   sess.SerialOptions.Parity,
		FlowCtrl: sess.SerialOptions.FlowCtrl,
	}

	conn, err := connection.NewSerialConnection(params)
	if err != nil {
		return "", err
	}

	info := &connection.ConnInfo{
		Session:  sess.Name,
		Protocol: "serial",
		Host:     sess.SerialOptions.PortName,
		Port:     sess.SerialOptions.BaudRate,
		Cols:     80,
		Rows:     24,
	}
	a.manager.Add(conn, info)
	return conn.ID(), nil
}

// ListSerialPorts returns available COM ports on the system.
func (a *App) ListSerialPorts() ([]string, error) {
	return connection.ListSerialPorts()
}

// QuickConnectSSH connects to an SSH host without saving a session.
func (a *App) QuickConnectSSH(host string, port int, username, password string, cols, rows int) (string, error) {
	params := connection.SSHConnectParams{
		Host:       host,
		Port:       port,
		Username:   username,
		Password:   password,
		AuthMethod: "password",
		Cols:       cols,
		Rows:       rows,
	}

	conn, err := connection.NewSSHConnection(params)
	if err != nil {
		return "", err
	}

	info := &connection.ConnInfo{
		Session:  fmt.Sprintf("%s@%s", username, host),
		Protocol: "ssh",
		Host:     host,
		Port:     port,
		Username: username,
		Cols:     cols,
		Rows:     rows,
	}
	a.manager.Add(conn, info)
	return conn.ID(), nil
}

// --- Terminal I/O ---

// SendInput sends keyboard input to a connection (raw string, no base64).
func (a *App) SendInput(connID, data string) error {
	return a.manager.SendInput(connID, data)
}

// ResizeTerminal changes the terminal size for a connection.
func (a *App) ResizeTerminal(connID string, cols, rows int) error {
	return a.manager.ResizeTerminal(connID, cols, rows)
}

// Disconnect closes a connection.
func (a *App) Disconnect(connID string) {
	a.manager.Remove(connID)
}

// GetConnectionInfo returns info about an active connection.
func (a *App) GetConnectionInfo(connID string) *connection.ConnInfo {
	return a.manager.GetInfo(connID)
}

// GetActiveConnections returns info about all active connections.
func (a *App) GetActiveConnections() []*connection.ConnInfo {
	return a.manager.GetAllInfo()
}

// --- Settings ---

// GetSettings returns application settings.
func (a *App) GetSettings() *settings.Settings {
	return a.settings.Get()
}

// UpdateSettings saves application settings.
func (a *App) UpdateSettings(s *settings.Settings) error {
	return a.settings.Update(s)
}

// --- File Operations ---

// ExportSessions exports all sessions to a JSON file.
func (a *App) ExportSessions() (string, error) {
	filePath, err := wailsRuntime.SaveFileDialog(a.ctx, wailsRuntime.SaveDialogOptions{
		Title:           "Export Sessions",
		DefaultFilename: "goconnect-sessions.json",
		Filters: []wailsRuntime.FileFilter{
			{DisplayName: "JSON Files (*.json)", Pattern: "*.json"},
		},
	})
	if err != nil {
		return "", err
	}
	if filePath == "" {
		return "", nil
	}
	return filePath, a.store.ExportToFile(filePath)
}

// ImportSessions imports sessions from a JSON file.
func (a *App) ImportSessions() (int, error) {
	filePath, err := wailsRuntime.OpenFileDialog(a.ctx, wailsRuntime.OpenDialogOptions{
		Title: "Import Sessions",
		Filters: []wailsRuntime.FileFilter{
			{DisplayName: "JSON Files (*.json)", Pattern: "*.json"},
		},
	})
	if err != nil {
		return 0, err
	}
	if filePath == "" {
		return 0, nil
	}
	return a.store.ImportFromFile(filePath)
}

// SaveTerminalOutput opens a file save dialog and writes terminal content to the selected file.
func (a *App) SaveTerminalOutput(content string) (string, error) {
	filePath, err := wailsRuntime.SaveFileDialog(a.ctx, wailsRuntime.SaveDialogOptions{
		Title: "Save Terminal Output",
		DefaultFilename: "terminal.log",
		Filters: []wailsRuntime.FileFilter{
			{DisplayName: "Log Files (*.log)", Pattern: "*.log"},
			{DisplayName: "Text Files (*.txt)", Pattern: "*.txt"},
			{DisplayName: "All Files (*.*)", Pattern: "*.*"},
		},
	})
	if err != nil {
		return "", err
	}
	if filePath == "" {
		return "", nil // User cancelled
	}
	if err := os.WriteFile(filePath, []byte(content), 0644); err != nil {
		return "", fmt.Errorf("failed to save file: %w", err)
	}
	return filePath, nil
}
