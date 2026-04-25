package brief

import (
	"errors"
	"strings"
)

// BriefAnalyzeRequest is the request body for POST /brief/analyze.
type BriefAnalyzeRequest struct {
	Goal           string `json:"goal"`
	Audience       string `json:"audience"`
	Doc            string `json:"doc"`
	TargetLanguage string `json:"target_language"`
}

// ContextFile represents a file requested for additional context.
type ContextFile struct {
	Filename string `json:"filename"`
	Content  string `json:"content"`
}

// RequestedFile describes a file the model asks the user to provide.
type RequestedFile struct {
	Filename string `json:"filename"`
	Reason   string `json:"reason"`
}

// GapReport is the structured analyze response.
type GapReport struct {
	Covered        []string        `json:"covered"`
	Gaps           []string        `json:"gaps"`
	RequestedFiles []RequestedFile `json:"requested_files"`
}

// BriefGenerateRequest is the request body for POST /brief/generate.
type BriefGenerateRequest struct {
	Goal           string        `json:"goal"`
	Audience       string        `json:"audience"`
	Doc            string        `json:"doc"`
	TargetLanguage string        `json:"target_language"`
	ContextFiles   []ContextFile `json:"context_files"`
}

// Validate checks required fields for analyze.
func (r *BriefAnalyzeRequest) Validate() error {
	if strings.TrimSpace(r.Goal) == "" {
		return errors.New("goal is required")
	}

	if err := validateAudience(r.Audience); err != nil {
		return err
	}

	if strings.TrimSpace(r.Doc) == "" {
		return errors.New("doc is required")
	}

	return nil
}

// Validate checks required fields for generate.
func (r *BriefGenerateRequest) Validate() error {
	if strings.TrimSpace(r.Goal) == "" {
		return errors.New("goal is required")
	}

	if err := validateAudience(r.Audience); err != nil {
		return err
	}

	if strings.TrimSpace(r.Doc) == "" {
		return errors.New("doc is required")
	}

	return nil
}

func validateAudience(audience string) error {
	switch audience {
	case "junior", "senior", "nontechnical":
		return nil
	default:
		return errors.New("audience must be 'junior', 'senior', or 'nontechnical'")
	}
}
