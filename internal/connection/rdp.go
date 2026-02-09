package connection

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

// RDPLaunchParams holds parameters for launching an RDP session.
type RDPLaunchParams struct {
	Host              string
	Port              int
	Username          string
	Password          string
	Width             int
	Height            int
	ColorDepth        int
	FullScreen        bool
	DriveRedirect     bool
	ClipboardRedirect bool
	AudioRedirect     string // "local" | "remote" | "none"
}

// LaunchRDP generates a .rdp file and opens it with mstsc.exe.
// Returns the path to the generated .rdp file.
func LaunchRDP(params RDPLaunchParams) (string, error) {
	if params.Port == 0 {
		params.Port = 3389
	}
	if params.Width == 0 {
		params.Width = 1920
	}
	if params.Height == 0 {
		params.Height = 1080
	}
	if params.ColorDepth == 0 {
		params.ColorDepth = 32
	}
	if params.AudioRedirect == "" {
		params.AudioRedirect = "local"
	}

	var sb strings.Builder
	sb.WriteString(fmt.Sprintf("full address:s:%s:%d\r\n", params.Host, params.Port))
	sb.WriteString(fmt.Sprintf("username:s:%s\r\n", params.Username))
	sb.WriteString(fmt.Sprintf("desktopwidth:i:%d\r\n", params.Width))
	sb.WriteString(fmt.Sprintf("desktopheight:i:%d\r\n", params.Height))
	sb.WriteString(fmt.Sprintf("session bpp:i:%d\r\n", params.ColorDepth))

	if params.FullScreen {
		sb.WriteString("screen mode id:i:2\r\n")
	} else {
		sb.WriteString("screen mode id:i:1\r\n")
	}

	if params.DriveRedirect {
		sb.WriteString("drivestoredirect:s:*\r\n")
	}

	if params.ClipboardRedirect {
		sb.WriteString("redirectclipboard:i:1\r\n")
	} else {
		sb.WriteString("redirectclipboard:i:0\r\n")
	}

	switch params.AudioRedirect {
	case "local":
		sb.WriteString("audiomode:i:0\r\n")
	case "remote":
		sb.WriteString("audiomode:i:1\r\n")
	case "none":
		sb.WriteString("audiomode:i:2\r\n")
	}

	sb.WriteString("prompt for credentials:i:1\r\n")
	sb.WriteString("negotiate security layer:i:1\r\n")

	// Write to temp file
	tmpDir := filepath.Join(os.TempDir(), "GoConnect")
	os.MkdirAll(tmpDir, 0700)
	rdpFile := filepath.Join(tmpDir, fmt.Sprintf("goconnect_%s_%d.rdp", params.Host, params.Port))

	if err := os.WriteFile(rdpFile, []byte(sb.String()), 0600); err != nil {
		return "", fmt.Errorf("failed to write .rdp file: %w", err)
	}

	// If password is provided, use cmdkey to store credentials
	if params.Password != "" && params.Username != "" {
		target := fmt.Sprintf("TERMSRV/%s", params.Host)
		cmd := exec.Command("cmdkey", "/generic:"+target, "/user:"+params.Username, "/pass:"+params.Password)
		cmd.Run() // Best-effort; ignore errors
	}

	// Launch mstsc.exe
	cmd := exec.Command("mstsc", rdpFile)
	if err := cmd.Start(); err != nil {
		return "", fmt.Errorf("failed to launch mstsc.exe: %w", err)
	}

	return rdpFile, nil
}
