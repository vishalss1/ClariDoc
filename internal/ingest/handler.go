package ingest

import (
	"encoding/json"
	"io"
	"net/http"
	"strings"
)

// IngestHandler returns an http.HandlerFunc that handles POST /ingest.
// Accepts multipart/form-data with file upload OR raw text/plain body.
// Returns JSON: { "content": "<extracted markdown>" }
func IngestHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		var content string
		var err error

		// Check if this is a multipart form (file upload)
		if strings.HasPrefix(r.Header.Get("Content-Type"), "multipart/form-data") {
			err = r.ParseMultipartForm(10 << 20) // 10MB max
			if err != nil {
				http.Error(w, "Failed to parse multipart form", http.StatusBadRequest)
				return
			}

			file, header, err := r.FormFile("file")
			if err != nil {
				http.Error(w, "No file uploaded", http.StatusBadRequest)
				return
			}
			defer file.Close()

			content, err = ParseFile(file, header)
			if err == ErrUnsupportedFormat {
				http.Error(w, err.Error(), http.StatusBadRequest)
				return
			}
			if err != nil {
				http.Error(w, "Failed to read file", http.StatusInternalServerError)
				return
			}
		} else {
			// Read raw body for text/plain or other content types
			body, err := io.ReadAll(r.Body)
			if err != nil {
				http.Error(w, "Failed to read request body", http.StatusInternalServerError)
				return
			}
			defer r.Body.Close()

			content = ParseText(string(body))
		}

		if strings.TrimSpace(content) == "" {
			http.Error(w, "No content provided", http.StatusBadRequest)
			return
		}

		// Return JSON response
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"content": content})
	}
}
