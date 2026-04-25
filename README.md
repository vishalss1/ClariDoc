# ClariDoc

ClariDoc turns documentation into audience-ready explanations and execution briefs.

## Live App

https://claridoc.onrender.com

## What It Does

### 1. Clarify Mode

- Paste/upload docs
- Choose audience: `Junior Dev`, `Senior Dev`, `Non-Technical`
- Choose output language (including `Hinglish`)
- Get streamed markdown output
- Copy or download output as `.md`

### 2. Brief Mode

- Enter a goal + docs
- Analyze gaps in available context
- Add requested files
- Generate a final actionable brief (streamed)
- Copy or download output as `.md`

## Tech Stack

- **Backend:** Go (`net/http`)
- **AI:** Gemini API (`google.golang.org/genai`)
- **Frontend:** Vanilla HTML/CSS/JS

## Project Structure

```text
cmd/main.go                 # server + routing + API logging
internal/config/            # environment loading
internal/gemini/            # Gemini client + prompt builders
internal/transform/         # /transform
internal/brief/             # /brief/analyze + /brief/generate
internal/ingest/            # /ingest
internal/locale/            # /locale language list
frontend/                   # index, transform, brief pages + assets
```

## Run Locally

### Prerequisites

- Go 1.23+
- Gemini API key

### Environment

Create `.env` in project root:

```env
GEMINI_API_KEY=your_api_key
PORT=8080
```

### Start

```bash
go mod tidy
go run ./cmd/main.go
```

Open:

- `http://localhost:8080/index.html`
- `http://localhost:8080/transform.html`
- `http://localhost:8080/brief.html`

## API Endpoints

- `POST /ingest`
- `GET /locale`
- `POST /transform` (SSE stream)
- `POST /brief/analyze`
- `POST /brief/generate` (SSE stream)

## Notes

- Backend logs API hits with method, path, status, duration, and client.
- If `GEMINI_API_KEY` is missing/invalid, AI endpoints won’t return usable output.
