package settings

import (
	"encoding/json"
	"os"
	"path/filepath"
	"sync"
)

// Settings holds application settings.
type Settings struct {
	Theme      string `json:"theme"`      // "dark", "light", "dracula", "monokai", "solarized"
	FontSize   int    `json:"fontSize"`   // 12-24
	FontFamily string `json:"fontFamily"` // font name
	CursorStyle string `json:"cursorStyle"` // "block", "underline", "bar"
	ScrollbackLines int `json:"scrollbackLines"` // 1000-100000
	CursorBlink bool   `json:"cursorBlink"`
}

// DefaultSettings returns sensible defaults.
func DefaultSettings() *Settings {
	return &Settings{
		Theme:           "dark",
		FontSize:        14,
		FontFamily:      "'Cascadia Code', 'Consolas', 'Courier New', monospace",
		CursorStyle:     "block",
		ScrollbackLines: 10000,
		CursorBlink:     true,
	}
}

// Store manages settings persistence.
type Store struct {
	settings *Settings
	mu       sync.RWMutex
	filePath string
}

// NewStore creates a settings store, loading from disk if available.
func NewStore() *Store {
	appData := os.Getenv("APPDATA")
	dir := filepath.Join(appData, "GoConnect")
	os.MkdirAll(dir, 0755)

	s := &Store{
		settings: DefaultSettings(),
		filePath: filepath.Join(dir, "settings.json"),
	}
	s.load()
	return s
}

func (s *Store) load() {
	data, err := os.ReadFile(s.filePath)
	if err != nil {
		return
	}
	var settings Settings
	if err := json.Unmarshal(data, &settings); err != nil {
		return
	}
	s.settings = &settings
}

func (s *Store) save() error {
	data, err := json.MarshalIndent(s.settings, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(s.filePath, data, 0644)
}

// Get returns current settings.
func (s *Store) Get() *Settings {
	s.mu.RLock()
	defer s.mu.RUnlock()
	copy := *s.settings
	return &copy
}

// Update saves new settings.
func (s *Store) Update(settings *Settings) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.settings = settings
	return s.save()
}
