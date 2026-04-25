package transform

import (
	"errors"
	"strings"
)

// TransformRequest represents the JSON body for POST /transform.
type TransformRequest struct {
	Content       string `json:"content"`
	Audience      string `json:"audience"`
	TargetLanguage string `json:"target_language"`
	SourceLanguage string `json:"source_language"`
}

// Validate checks that the request has required fields with valid values.
func (r *TransformRequest) Validate() error {
	if strings.TrimSpace(r.Content) == "" {
		return errors.New("content is required")
	}

	switch r.Audience {
	case "junior", "senior", "nontechnical":
		// valid
	default:
		return errors.New("audience must be 'junior', 'senior', or 'nontechnical'")
	}

	if r.TargetLanguage == "" {
		return errors.New("target_language is required")
	}

	if r.SourceLanguage == "" {
		return errors.New("source_language is required")
	}

	return nil
}
