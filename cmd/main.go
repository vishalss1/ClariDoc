package main

import (
	"context"
	"fmt"
	"log"
	"net/http"

	"github.com/vishalss1/ClariDoc/internal/brief"
	"github.com/vishalss1/ClariDoc/internal/config"
	"github.com/vishalss1/ClariDoc/internal/gemini"
	"github.com/vishalss1/ClariDoc/internal/ingest"
	"github.com/vishalss1/ClariDoc/internal/locale"
	"github.com/vishalss1/ClariDoc/internal/transform"
)

func main() {
	cfg := config.Load()

	// Initialize Gemini client
	var geminiClient *gemini.Client
	if cfg.GeminiAPIKey != "" {
		var err error
		geminiClient, err = gemini.NewClient(context.Background(), cfg.GeminiAPIKey)
		if err != nil {
			log.Printf("Warning: Failed to initialize Gemini client: %v", err)
		} else {
			log.Println("Gemini client initialized")
		}
	}

	mux := http.NewServeMux()
	mux.Handle("/transform", corsMiddleware(transform.TransformHandler(geminiClient)))
	mux.Handle("/ingest", corsMiddleware(ingest.IngestHandler()))
	mux.Handle("/locale", corsMiddleware(locale.LocaleHandler()))
	mux.Handle("/brief/analyze", corsMiddleware(brief.AnalyzeHandler(geminiClient)))
	mux.Handle("/brief/generate", corsMiddleware(brief.GenerateHandler(geminiClient)))
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
