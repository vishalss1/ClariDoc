package transform

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/vishalss1/ClariDoc/internal/gemini"
)

// TransformHandler returns an http.HandlerFunc that handles POST /transform.
// It parses JSON, validates, builds prompt, and streams SSE response.
func TransformHandler(client *gemini.Client) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		if client == nil {
			http.Error(w, "Gemini client not initialized", http.StatusServiceUnavailable)
			return
		}

		// Parse JSON body
		var req TransformRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, fmt.Sprintf("Invalid JSON: %v", err), http.StatusBadRequest)
			return
		}

		// Validate request
		if err := req.Validate(); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		// Build prompt from audience × language combination
		prompt := gemini.BuildPrompt(req.Audience, req.TargetLanguage, req.SourceLanguage, req.Content)

		// Set SSE headers
		w.Header().Set("Content-Type", "text/event-stream")
		w.Header().Set("Cache-Control", "no-cache")
		w.Header().Set("Connection", "keep-alive")

		flusher, ok := w.(http.Flusher)
		if !ok {
			http.Error(w, "Streaming not supported", http.StatusInternalServerError)
			return
		}

		// Create context with timeout
		ctx, cancel := context.WithTimeout(r.Context(), 60*time.Second)
		defer cancel()

		// Stream response
		err := client.StreamTransform(ctx, prompt, w)
		if err != nil {
			fmt.Fprintf(w, "data: [ERROR] %v\n\n", err)
		}
		flusher.Flush()
	}
}
