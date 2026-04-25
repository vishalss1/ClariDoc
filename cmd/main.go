package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/joho/godotenv"
	"github.com/vishalss1/ClariDoc/internal/gemini"
	"github.com/vishalss1/ClariDoc/internal/ingest"
	"github.com/vishalss1/ClariDoc/internal/locale"
	"github.com/vishalss1/ClariDoc/internal/transform"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using system environment")
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	// Initialize Gemini client
	apiKey := os.Getenv("GEMINI_API_KEY")
	var geminiClient *gemini.Client
	if apiKey != "" {
		var err error
		geminiClient, err = gemini.NewClient(context.Background(), apiKey)
		if err != nil {
			log.Printf("Warning: Failed to initialize Gemini client: %v", err)
		} else {
			log.Println("Gemini client initialized")
		}
	}

	// Register routes
	http.HandleFunc("/", handleIndex)
	http.HandleFunc("/test-gemini", handleTestGemini(geminiClient))
	http.HandleFunc("/transform", transform.TransformHandler(geminiClient))
	http.HandleFunc("/ingest", ingest.IngestHandler())
	http.HandleFunc("/locale", locale.LocaleHandler())

	fmt.Printf("ClariDoc server starting on port %s\n", port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}

func handleIndex(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/" {
		http.NotFound(w, r)
		return
	}
	w.Header().Set("Content-Type", "text/html")
	w.WriteHeader(http.StatusOK)
	fmt.Fprintln(w, "<!DOCTYPE html><html><head><title>ClariDoc</title></head><body><h1>ClariDoc - Phase 5 Complete</h1><p>Server is running.</p><ul><li>Test Ingest: <code>curl -X POST /ingest -F 'file=@README.md'</code></li><li>Test Locale: <code>curl 'http://localhost:8080/locale?region=Karnataka,India'</code> (requires MAPS_API_KEY)</li><li>Test Transform: <code>curl -X POST /transform -H 'Content-Type: application/json' -d '{\"content\":\"# Test\",\"audience\":\"junior\",\"target_language\":\"English\",\"source_language\":\"English\"}'</code></li></ul></body></html>")
}

func handleTestGemini(client *gemini.Client) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if client == nil {
			http.Error(w, "Gemini client not initialized (missing GEMINI_API_KEY)", http.StatusServiceUnavailable)
			return
		}

		w.Header().Set("Content-Type", "text/event-stream")
		w.Header().Set("Cache-Control", "no-cache")

		// Test prompt: junior dev, same language
		prompt := gemini.BuildPrompt("junior", "English", "English", "# Hello World\n\nThis is a **test** of the Gemini streaming system.\n\n```go\nfunc main() {\n\tfmt.Println(\"Hello\")\n}\n```\n\nEnd of test.")

		ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
		defer cancel()

		flusher, ok := w.(http.Flusher)
		if !ok {
			http.Error(w, "Streaming not supported", http.StatusInternalServerError)
			return
		}

		fmt.Fprint(w, "data: Starting Gemini stream...\n\n")
		flusher.Flush()

		err := client.StreamTransform(ctx, prompt, &streamWriter{w, flusher})
		if err != nil {
			fmt.Fprintf(w, "data: Error: %v\n\n", err)
		} else {
			fmt.Fprint(w, "data: \n\n[DONE]\n\n")
		}
		flusher.Flush()
	}
}

// streamWriter wraps http.ResponseWriter to write "data: " prefixed SSE chunks
type streamWriter struct {
	w       http.ResponseWriter
	flusher http.Flusher
}

func (sw *streamWriter) Write(p []byte) (int, error) {
	// Write as SSE data line
	fmt.Fprintf(sw.w, "data: %s\n\n", strings.TrimSpace(string(p)))
	sw.flusher.Flush()
	return len(p), nil
}


