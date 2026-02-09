package crypto

import (
	"fmt"

	"github.com/danieljoos/wincred"
)

const credPrefix = "GoConnect:"

// SavePassword stores a password in Windows Credential Manager.
func SavePassword(sessionID, password string) error {
	target := credPrefix + sessionID
	cred := wincred.NewGenericCredential(target)
	cred.CredentialBlob = []byte(password)
	cred.Persist = wincred.PersistLocalMachine
	return cred.Write()
}

// GetPassword retrieves a password from Windows Credential Manager.
func GetPassword(sessionID string) (string, error) {
	target := credPrefix + sessionID
	cred, err := wincred.GetGenericCredential(target)
	if err != nil {
		return "", fmt.Errorf("credential not found for session %s: %w", sessionID, err)
	}
	return string(cred.CredentialBlob), nil
}

// DeletePassword removes a password from Windows Credential Manager.
func DeletePassword(sessionID string) error {
	target := credPrefix + sessionID
	cred, err := wincred.GetGenericCredential(target)
	if err != nil {
		return nil // Not found is not an error for delete
	}
	return cred.Delete()
}
