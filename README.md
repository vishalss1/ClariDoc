# ClariDoc

> Not just clearer docs — the right context for the right person.

ClariDoc turns documentation into audience-ready explanations and execution briefs. Built for Google Solutions Challenge 2025.

## Live App

[claridoc.onrender.com](https://claridoc.onrender.com)

---

## What It Does

### Clarify Mode
Paste or upload any technical doc → get a transformed version tailored to your level and language.

- **Audience:** Junior Dev | Senior Dev | Non-Technical
- **Output language:** 97 languages including Hinglish
- Streamed markdown output, copy or download as `.md`

### Brief Mode
You have a doc and a goal. ClariDoc tells you exactly what to do.

- Enter your goal + paste the doc
- ClariDoc identifies what's vague or missing relative to your goal
- Paste the requested context files
- Get a precise, actionable work briefing — streamed

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Go (`net/http`, no framework) |
| AI | Gemini API / Groq (toggled via `PROVIDER` env var) |
| Frontend | Vanilla HTML / CSS / JS (ES modules, no build step) |

---

## Project Structure

```
cmd/main.go                 # Server, routing, API logging
internal/
  config/                   # Environment loading
  gemini/                   # AI client (Gemini + Groq) + prompt builders
  transform/                # POST /transform
  brief/                    # POST /brief/analyze, POST /brief/generate
  ingest/                   # POST /ingest
  locale/                   # GET /locale — static language list
frontend/
  index.html                # Landing page
  transform.html            # Clarify mode
  brief.html                # Brief mode
  css/                      # base, layout, components
  js/                       # api, transform, brief, render, locale, main
```

---

## Run Locally

### Prerequisites
- Go 1.23+
- Gemini API key ([aistudio.google.com](https://aistudio.google.com)) or Groq API key ([console.groq.com](https://console.groq.com))

### Environment

Create `.env` in project root:

```env
GEMINI_API_KEY=your_gemini_key
GROQ_API_KEY=your_groq_key
PROVIDER=groq          # "gemini" or "groq"
PORT=8080
```

### Start

```bash
go mod tidy
go run ./cmd/main.go
```

Then open:
- `http://localhost:8080/transform.html` — Clarify mode
- `http://localhost:8080/brief.html` — Brief mode

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/locale` | Returns list of 97 supported languages |
| `POST` | `/ingest` | Accepts `.md` or `.txt` upload, returns clean markdown |
| `POST` | `/transform` | Transforms doc by audience × language (SSE stream) |
| `POST` | `/brief/analyze` | Analyzes doc + goal, returns gap report JSON |
| `POST` | `/brief/generate` | Generates work briefing from doc + context files (SSE stream) |

---

## Switching AI Providers

Set `PROVIDER` in `.env`:

```env
PROVIDER=groq     # faster, Llama 3.3 70B on Groq LPU
PROVIDER=gemini   # Gemini 2.0 Flash
```

No code changes needed. Both providers use the same prompt strategy and streaming interface.

---

## Notes

- All API hits are logged with method, path, status, duration, and client IP
- Code blocks in docs are never modified by any transform
- Brief mode never scans a codebase — it asks for specific files only
