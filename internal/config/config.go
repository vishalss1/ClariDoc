package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

// Config holds all runtime configuration loaded from environment variables.
type Config struct {
	Port         string
	GeminiAPIKey string
}

// Load reads .env (if present) and returns normalized config values.
func Load() Config {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using system environment")
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	return Config{
		Port:         port,
		GeminiAPIKey: os.Getenv("GEMINI_API_KEY"),
	}
}
