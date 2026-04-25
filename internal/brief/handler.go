package brief

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/vishalss1/ClariDoc/internal/gemini"
)

// AnalyzeHandler handles POST /brief/analyze and returns structured gap report JSON.
func AnalyzeHandler(geminiClient *gemini.Client) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		if geminiClient == nil {
			http.Error(w, "Gemini client not initialized", http.StatusServiceUnavailable)
			return
		}

		var req BriefAnalyzeRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, fmt.Sprintf("Invalid JSON: %v", err), http.StatusBadRequest)
			return
		}

		if err := req.Validate(); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		prompt := BuildAnalyzePrompt(req.Audience, req.Goal, req.Doc)
		ctx, cancel := context.WithTimeout(r.Context(), 60*time.Second)
		defer cancel()

		raw, err := geminiClient.GenerateText(ctx, prompt)
		if err != nil {
			http.Error(w, fmt.Sprintf("Analyze failed: %v", err), http.StatusBadGateway)
			return
		}

		report, err := parseGapReport(raw)
		if err != nil {
			http.Error(w, fmt.Sprintf("Failed to parse gap report JSON: %v", err), http.StatusBadGateway)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(report); err != nil {
			http.Error(w, "Failed to encode response", http.StatusInternalServerError)
			return
		}
	}
}

// GenerateHandler handles POST /brief/generate and streams the briefing via SSE.
func GenerateHandler(geminiClient *gemini.Client) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		if geminiClient == nil {
			http.Error(w, "Gemini client not initialized", http.StatusServiceUnavailable)
			return
		}

		var req BriefGenerateRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, fmt.Sprintf("Invalid JSON: %v", err), http.StatusBadRequest)
			return
		}

		if err := req.Validate(); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		prompt := BuildGeneratePrompt(
			req.Audience,
			req.TargetLanguage,
			req.Goal,
			req.Doc,
			req.ContextFiles,
		)

		w.Header().Set("Content-Type", "text/event-stream")
		w.Header().Set("Cache-Control", "no-cache")
		w.Header().Set("Connection", "keep-alive")

		flusher, ok := w.(http.Flusher)
		if !ok {
			http.Error(w, "Streaming not supported", http.StatusInternalServerError)
			return
		}

		ctx, cancel := context.WithTimeout(r.Context(), 60*time.Second)
		defer cancel()

		streamWriter := &briefSSEWriter{
			w:       w,
			flusher: flusher,
		}

		if err := geminiClient.StreamTransform(ctx, prompt, streamWriter, flusher); err != nil {
			fmt.Fprintf(w, "data: [ERROR] %v\n\n", err)
			flusher.Flush()
		}
	}
}

type briefSSEWriter struct {
	w       io.Writer
	flusher http.Flusher
}

func (s *briefSSEWriter) Write(p []byte) (int, error) {
	if err := writeBriefSSEEvent(s.w, string(p)); err != nil {
		return 0, err
	}
	s.flusher.Flush()
	return len(p), nil
}

func writeBriefSSEEvent(w io.Writer, chunk string) error {
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

func parseGapReport(raw string) (GapReport, error) {
	clean := strings.TrimSpace(raw)
	clean = stripMarkdownCodeFence(clean)

	var report GapReport
	if err := json.Unmarshal([]byte(clean), &report); err != nil {
		return GapReport{}, err
	}

	return report, nil
}

func stripMarkdownCodeFence(raw string) string {
	if !strings.HasPrefix(raw, "```") {
		return raw
	}

	lines := strings.Split(raw, "\n")
	if len(lines) < 2 {
		return raw
	}

	start := 0
	end := len(lines) - 1

	if strings.HasPrefix(strings.TrimSpace(lines[start]), "```") {
		start++
	}
	if end >= start && strings.HasPrefix(strings.TrimSpace(lines[end]), "```") {
		end--
	}
	if end < start {
		return raw
	}

	return strings.Join(lines[start:end+1], "\n")
}
