package ingest

import (
	"io"
	"mime/multipart"
	"path/filepath"
	"strings"
)

// ParseFile extracts content from an uploaded file.
// Accepts only .md and .txt files.
func ParseFile(file multipart.File, header *multipart.FileHeader) (string, error) {
	ext := strings.ToLower(filepath.Ext(header.Filename))
	if ext != ".md" && ext != ".txt" {
		return "", ErrUnsupportedFormat
	}

	defer file.Close()

	// Read all content from the file
	content, err := io.ReadAll(file)
	if err != nil {
		return "", err
	}

	return ParseText(string(content)), nil
}

// ParseText normalizes raw text input.
// Trims whitespace and normalizes line endings to \n.
func ParseText(raw string) string {
	raw = strings.TrimSpace(raw)
	raw = strings.ReplaceAll(raw, "\r\n", "\n")
	raw = strings.ReplaceAll(raw, "\r", "\n")
	return raw
}
