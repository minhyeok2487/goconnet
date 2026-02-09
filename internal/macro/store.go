package macro

import (
	"encoding/json"
	"os"
	"path/filepath"
	"sync"

	"github.com/google/uuid"
)

// Step represents a single recorded action.
type Step struct {
	Data  string `json:"data"`            // The input data sent
	Delay int    `json:"delay,omitempty"` // Delay in ms before this step
}

// Macro represents a recorded sequence of terminal inputs.
type Macro struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Steps []Step `json:"steps"`
}

// Store manages macro persistence.
type Store struct {
	mu       sync.RWMutex
	filePath string
	macros   []Macro
}

// NewStore creates a macro Store that reads/writes to %APPDATA%\GoConnect\macros.json.
func NewStore() *Store {
	appData := os.Getenv("APPDATA")
	dir := filepath.Join(appData, "GoConnect")
	os.MkdirAll(dir, 0700)

	s := &Store{
		filePath: filepath.Join(dir, "macros.json"),
	}
	s.load()
	return s
}

func (s *Store) load() {
	data, err := os.ReadFile(s.filePath)
	if err != nil {
		return
	}
	json.Unmarshal(data, &s.macros)
}

func (s *Store) save() error {
	data, err := json.MarshalIndent(s.macros, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(s.filePath, data, 0600)
}

// GetAll returns all macros.
func (s *Store) GetAll() []Macro {
	s.mu.RLock()
	defer s.mu.RUnlock()
	result := make([]Macro, len(s.macros))
	copy(result, s.macros)
	return result
}

// Create adds a new macro.
func (s *Store) Create(m Macro) (Macro, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	m.ID = uuid.New().String()
	s.macros = append(s.macros, m)
	return m, s.save()
}

// Update replaces a macro by ID.
func (s *Store) Update(m Macro) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	for i := range s.macros {
		if s.macros[i].ID == m.ID {
			s.macros[i] = m
			return s.save()
		}
	}
	return nil
}

// Delete removes a macro by ID.
func (s *Store) Delete(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	for i := range s.macros {
		if s.macros[i].ID == id {
			s.macros = append(s.macros[:i], s.macros[i+1:]...)
			return s.save()
		}
	}
	return nil
}
