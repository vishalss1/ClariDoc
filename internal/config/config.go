package config

import (
	"log"
	"os"
	"strings"

	"github.com/joho/godotenv"
)

// Config holds all runtime configuration loaded from environment variables.
type Config struct {
	Port         string
	Provider     string
	GeminiAPIKey string
	GroqAPIKey   string
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

	provider := strings.ToLower(strings.TrimSpace(os.Getenv("PROVIDER")))
	if provider == "" {
		provider = "gemini"
	}

	return Config{
		Port:         port,
		Provider:     provider,
		GeminiAPIKey: os.Getenv("GEMINI_API_KEY"),
		GroqAPIKey:   os.Getenv("GROQ_API_KEY"),
	}
}

// LogProviderWarnings logs provider-specific configuration warnings.
func (c Config) LogProviderWarnings() {
	if c.Provider == "gemini" && strings.TrimSpace(c.GeminiAPIKey) == "" {
		log.Println("Warning: GEMINI_API_KEY is empty while PROVIDER=gemini")
	}
	if c.Provider == "groq" && strings.TrimSpace(c.GroqAPIKey) == "" {
		log.Println("Warning: GROQ_API_KEY is empty while PROVIDER=groq")
	}
}
