# ClariDoc

ClariDoc helps users turn technical documentation into audience-specific explanations and execution briefs.

## Features

- Clarify mode: transform docs by audience (`junior`, `senior`, `nontechnical`) and language.
- Brief mode:
  1. analyze doc gaps for a goal,
  2. request missing context files,
  3. generate a final briefing.
- Streaming markdown output from backend APIs.
- Copy and download output as `.md` on both Transform and Brief pages.

## Tech Stack

- Backend: Go (`net/http`)
- AI: Gemini API (`google.golang.org/genai`)
- Frontend: Vanilla HTML/CSS/JS

## Project Structure

```text
cmd/main.go                 # server setup and route registration
internal/transform/         # /transform models and handler
internal/brief/             # /brief/analyze and /brief/generate
internal/ingest/            # /ingest file/text parsing
internal/locale/            # /locale supported languages list
internal/gemini/            # Gemini client and prompt builders
frontend/                   # landing + transform + brief pages and assets
```

## Requirements

- Go 1.23+
- Gemini API key

## Environment Variables

Create a `.env` in project root:

```env
GEMINI_API_KEY=your_key_here
PORT=8080
```

## Run Locally

```bash
go mod tidy
go run ./cmd/main.go
```

Server starts on `http://localhost:8080` by default.

## Frontend Pages

- `/index.html` — landing page
- `/transform.html` — Clarify tool
- `/brief.html` — Brief tool

## API Endpoints

- `POST /ingest`
  - Accepts uploaded `.md`/`.txt` file or raw text body.
  - Returns JSON:
    ```json
    { "content": "..." }
    ```

- `GET /locale`
  - Returns supported languages:
    ```json
    { "languages": ["English", "Hinglish", "Hindi", "..."] }
    ```

- `POST /transform`
  - Request body:
    ```json
    {
      "content": "markdown text",
      "audience": "junior",
      "target_language": "Hinglish",
      "source_language": "English"
    }
    ```
  - Response: `text/event-stream` (streamed markdown chunks).

- `POST /brief/analyze`
  - Request body:
    ```json
    {
      "goal": "Add Razorpay integration",
      "audience": "junior",
      "doc": "architecture markdown",
      "target_language": "English"
    }
    ```
  - Response: structured JSON gap report (`covered`, `gaps`, `requested_files`).

- `POST /brief/generate`
  - Request body:
    ```json
    {
      "goal": "Add Razorpay integration",
      "audience": "junior",
      "doc": "architecture markdown",
      "target_language": "English",
      "context_files": [
        { "filename": "internal/payment/gateway.go", "content": "..." }
      ]
    }
    ```
  - Response: `text/event-stream` (streamed briefing markdown).

## Notes

- API routes are logged in backend with method, path, status, duration, and client address.
- If `GEMINI_API_KEY` is missing/invalid, AI endpoints will not work.
