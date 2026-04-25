package transform

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
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
		log.Printf("transform handler called, audience=%s target=%s", req.Audience, req.TargetLanguage)

		// Validate request
		if err := req.Validate(); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		// Build prompt from audience × language combination
		prompt := gemini.BuildPrompt(req.Audience, req.TargetLanguage, req.SourceLanguage, req.Content)
		log.Printf("prompt built, length=%d", len(prompt))

		// Set SSE headers
		w.Header().Set("Content-Type", "text/event-stream")
		w.Header().Set("Cache-Control", "no-cache")
		w.Header().Set("Connection", "keep-alive")
		w.Header().Del("Content-Length")
		w.WriteHeader(http.StatusOK)

		flusher, ok := w.(http.Flusher)
		if !ok {
			log.Printf("flusher not supported")
			http.Error(w, "streaming not supported", http.StatusInternalServerError)
			return
		}
		log.Printf("flusher ok, calling StreamTransform")

		// Create context with timeout
		ctx, cancel := context.WithTimeout(r.Context(), 60*time.Second)
		defer cancel()

		// Stream response
		streamWriter := &sseWriter{
			w:       w,
			flusher: flusher,
		}

		err := client.StreamTransform(ctx, prompt, streamWriter, flusher)
		if err != nil {
			log.Printf("stream transform returned error, writing SSE error event: %v", err)
			fmt.Fprintf(w, "data: [ERROR] %v\n\n", err)
			flusher.Flush()
		}
	}
}

type sseWriter struct {
	w       io.Writer
	flusher http.Flusher
}

func (s *sseWriter) Write(p []byte) (int, error) {
	if err := writeSSEEvent(s.w, string(p)); err != nil {
		return 0, err
	}
	s.flusher.Flush()
	return len(p), nil
}

func writeSSEEvent(w io.Writer, chunk string) error {
	normalized := strings.ReplaceAll(chunk, "\r\n", "\n")
	lines := strings.Split(normalized, "\n")
	for _, line := range lines {
		if _, err := fmt.Fprintf(w, "data: %s\n", line); err != nil {
			return err
		}
	}
	_, err := fmt.Fprint(w, "\n")
	return err
}
