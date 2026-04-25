package locale

import (
	"encoding/json"
	"net/http"
)

// LocaleHandler returns an http.HandlerFunc that handles GET /locale.
// No query parameters required.
// Returns JSON: { "languages": ["English", "Hindi", "Spanish", ...] }
func LocaleHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		languages := SupportedLanguages()

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"languages": languages,
		})
	}
}
