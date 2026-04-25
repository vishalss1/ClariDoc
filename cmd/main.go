package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/vishalss1/ClariDoc/internal/brief"
	"github.com/vishalss1/ClariDoc/internal/config"
	"github.com/vishalss1/ClariDoc/internal/gemini"
	"github.com/vishalss1/ClariDoc/internal/ingest"
	"github.com/vishalss1/ClariDoc/internal/locale"
	"github.com/vishalss1/ClariDoc/internal/transform"
)

func main() {
	cfg := config.Load()
	provider := strings.ToLower(strings.TrimSpace(os.Getenv("PROVIDER")))
	if provider == "" {
		provider = "gemini"
	}
	groqAPIKey := os.Getenv("GROQ_API_KEY")

	// Initialize AI client
	var geminiClient *gemini.Client
	if provider == "gemini" && cfg.GeminiAPIKey == "" {
		log.Println("Warning: GEMINI_API_KEY is empty while PROVIDER=gemini")
	}
	if provider == "groq" && strings.TrimSpace(groqAPIKey) == "" {
		log.Println("Warning: GROQ_API_KEY is empty while PROVIDER=groq")
	}

	{
		var err error
		geminiClient, err = gemini.NewClient(context.Background(), provider, cfg.GeminiAPIKey, groqAPIKey)
		if err != nil {
			log.Printf("Warning: Failed to initialize AI client (provider=%s): %v", provider, err)
		} else {
			log.Printf("AI client initialized (provider=%s)", provider)
		}
	}

	mux := http.NewServeMux()
	mux.Handle("/transform", apiLogMiddleware(corsMiddleware(transform.TransformHandler(geminiClient))))
	mux.Handle("/ingest", apiLogMiddleware(corsMiddleware(ingest.IngestHandler())))
	mux.Handle("/locale", apiLogMiddleware(corsMiddleware(locale.LocaleHandler())))
	mux.Handle("/brief/analyze", apiLogMiddleware(corsMiddleware(brief.AnalyzeHandler(geminiClient))))
	mux.Handle("/brief/generate", apiLogMiddleware(corsMiddleware(brief.GenerateHandler(geminiClient))))
	mux.Handle("/", corsMiddleware(http.FileServer(http.Dir("frontend"))))

	fmt.Printf("ClariDoc server starting on port %s\n", cfg.Port)
	log.Fatal(http.ListenAndServe(":"+cfg.Port, mux))
}

// corsMiddleware adds CORS headers for API and static routes.
func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

type statusRecorder struct {
	http.ResponseWriter
	statusCode int
}

func (sr *statusRecorder) WriteHeader(code int) {
	sr.statusCode = code
	sr.ResponseWriter.WriteHeader(code)
}

func (sr *statusRecorder) Flush() {
	if flusher, ok := sr.ResponseWriter.(http.Flusher); ok {
		flusher.Flush()
	}
}

// apiLogMiddleware logs API hits with method, path, status, duration, and client.
func apiLogMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		rec := &statusRecorder{
			ResponseWriter: w,
			statusCode:     http.StatusOK,
		}

		next.ServeHTTP(rec, r)

		log.Printf(
			"API %s %s status=%d duration=%s client=%s",
			r.Method,
			r.URL.Path,
			rec.statusCode,
			time.Since(start).Truncate(time.Millisecond),
			r.RemoteAddr,
		)
	})
}
