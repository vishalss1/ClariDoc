# ClariDoc

> Not just clearer docs — the right context for the right person.

ClariDoc bridges the gap between what a doc says and what a reader needs to *do*. It has two product modes built sequentially: **Clarify** (Phase 1–8) and **Brief** (post-launch roadmap).

Built in Go, Gemini 2.0 Flash, Google Maps Geocoding for locale inference, deployed on Cloud Run.

---

## Problem

Docs are written by the person who built the thing. They know the context. The reader doesn't.

This gap causes:
- Junior devs getting lost mid-task because the doc assumes knowledge they don't have
- Non-English speakers excluded by language and register simultaneously
- Non-technical stakeholders unable to extract what they actually need
- Real productivity loss: the reader has the doc, has the goal, but can't bridge them

## Two Product Modes

### Mode 1 — Clarify (Phases 1–8, build now)
Takes any doc → explains it for your level and language.

Two axes:
- **Audience** → Junior Dev | Senior Dev | Non-Technical
- **Output language** → detected from region via Maps Geocoding, user-selectable

Backend derives prompt strategy from the combination. No mode names exposed to the user.

### Mode 2 — Brief (post-launch roadmap)
Takes a doc + your stated goal → identifies what's vague or missing relative to your work → asks for specific files from your repo → produces a precise, personalized work briefing.

Not a rewrite of the doc. A briefing: "Here's what this means for your work. Here's what to do. Here's what to watch out for."

---

## Stack

| Layer | Technology |
|---|---|
| Backend | Go (`net/http`, no framework) |
| AI | Gemini 2.0 Flash via Gemini API |
| Geo/Locale | Google Maps Geocoding API |
| Frontend | Vanilla JS + HTML (single file) |
| Deployment | Google Cloud Run |

---

## Project Structure

```
claridoc/
├── cmd/
│   └── main.go                  # HTTP server, route registration
├── internal/
│   ├── gemini/
│   │   ├── client.go            # Gemini API wrapper, streaming support
│   │   └── prompts.go           # Prompt builders per audience × language combination
│   ├── transform/
│   │   ├── handler.go           # HTTP handler, audience+language → prompt dispatch
│   │   └── models.go            # TransformRequest / TransformResponse types
│   ├── ingest/
│   │   └── parser.go            # Plain text, markdown, .md/.txt file upload parsing
│   └── locale/
│       └── maps.go              # Maps Geocoding API → country_code + language suggestions
├── frontend/
│   ├── index.html               # Shell: DOM structure, loads CSS + JS
│   ├── css/
│   │   ├── base.css             # Reset, typography, CSS variables (colors, spacing, fonts)
│   │   ├── layout.css           # Two-column output, page grid, responsive breakpoints
│   │   └── components.css       # Buttons, dropdowns, file input, audience selector, panels
│   └── js/
│       ├── api.js               # All fetch calls: /ingest, /locale, /transform, /brief/*
│       ├── locale.js            # Region input → GET /locale → populate language dropdown
│       ├── ingest.js            # File upload + paste handling → POST /ingest → fill textarea
│       ├── transform.js         # Audience selector state, transform button → SSE stream
│       ├── render.js            # Markdown rendering via marked.js, stream buffer → DOM update
│       └── main.js              # Entry point: wires all modules on DOMContentLoaded
├── .env.example
├── Dockerfile
├── go.mod
└── CLAUDE.md
```

---

## Audience × Language → Prompt Matrix

| Audience | Same language | Different language |
|---|---|---|
| Junior Dev | Simplify (plain language, beginner-friendly) | Simplify + Translate |
| Senior Dev | No-op (pass-through or structure-only) | Translate only |
| Non-Technical | Stakeholder summary | Stakeholder summary + Translate |

### Prompt contract (all transforms)
- Code blocks (` ``` `) are **never** modified
- Inline code is preserved
- Doc structure and headers retained where possible
- Output is always valid Markdown

---

## API Contract

### `POST /transform`
```json
// Request
{
  "content": "# My README\n...",
  "audience": "junior",           // "junior" | "senior" | "nontechnical"
  "target_language": "Hindi",
  "source_language": "English"
}

// Response: text/event-stream, newline-delimited chunks
data: ## Getting Started\n
data: यह प्रोजेक्ट...
```

### `POST /ingest`
- Accepts `multipart/form-data` with `.md` or `.txt`
- Returns `{ "content": "<extracted markdown>" }`
- Frontend calls this on file select, result fills the textarea

### `GET /locale?region=Karnataka,India`
- Calls Maps Geocoding API
- Returns `{ "country_code": "IN", "suggested_languages": ["Hindi", "Kannada", "Tamil", "English"] }`
- Frontend calls on region input blur → populates language dropdown

---

## Data Flow

```
User pastes doc OR uploads file
        │
        ▼
[POST /ingest] → parser.go → clean markdown string
        │
        ▼
User types region → [GET /locale] → Maps Geocoding API
                                         │
                                         ▼
                              suggested_languages list
                                         │
                                         ▼
                              Language dropdown pre-filled
        │
        ▼
User selects: Audience (Junior | Senior | Non-Technical) + Target Language
        │
        ▼
[POST /transform] → prompts.go derives strategy from audience × language
        │
        ▼
gemini/client.go → Gemini 2.0 Flash (streaming)
        │
        ▼
Frontend streams output → side-by-side render (original left, transformed right)
```

---

## Prompt Templates

### Junior Dev, same language
```
System: You are a technical writing assistant. Rewrite the following documentation
in plain, beginner-friendly language. Explain jargon. Use short sentences.
Preserve all code blocks and inline code exactly. Return valid Markdown only.
User: <content>
```

### Junior Dev, different language
```
System: You are a technical writing assistant. First simplify the following
documentation into plain, beginner-friendly language. Then translate the result
into <target_language>. Preserve all code blocks exactly. Return valid Markdown only.
User: <content>
```

### Senior Dev, different language
```
System: You are a technical translator. Translate the following documentation into
<target_language>. Do not simplify. Do not modify any code blocks or inline code.
Preserve structure. Return valid Markdown only.
User: <content>
```

### Non-Technical, same language
```
System: You are a technical communicator. Rewrite the following documentation as a
non-technical summary for a business stakeholder. Remove implementation detail.
Focus on what it does, why it matters, and how to get started. Return valid Markdown only.
User: <content>
```

### Non-Technical, different language
```
System: You are a technical communicator. Rewrite the following documentation as a
non-technical summary for a business stakeholder, then translate into <target_language>.
Remove implementation detail. Return valid Markdown only.
User: <content>
```

---

## Frontend Layout

```
[ Region input (text) ]  →  on blur → GET /locale → fills language dropdown

[ Doc input: textarea (paste) | file upload button (.md, .txt) ]

[ Audience: Junior Dev | Senior Dev | Non-Technical ]  (button group)

[ Output language: dropdown ]

[ Transform → ]

──────────────────────────────────────────────────
|  Original                |  Transformed         |
|  (markdown rendered)     |  (streams in live)   |
──────────────────────────────────────────────────
```

Streaming via `fetch` + `ReadableStream`. Output panel updates token-by-token.
Markdown rendered in both panels via `marked.js` from CDN.

---

## Environment Variables

```env
GEMINI_API_KEY=
MAPS_API_KEY=
PORT=8080
```

---

## Dockerfile

```dockerfile
FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY . .
RUN go build -o claridoc ./cmd/main.go

FROM alpine:latest
WORKDIR /app
COPY --from=builder /app/claridoc .
EXPOSE 8080
CMD ["./claridoc"]
```

```bash
gcloud run deploy claridoc \
  --source . \
  --region asia-south1 \
  --allow-unauthenticated \
  --set-env-vars GEMINI_API_KEY=$GEMINI_API_KEY,MAPS_API_KEY=$MAPS_API_KEY
```

---

## Build Phases

Each phase is self-contained and independently testable before moving to the next.
Do not proceed to the next phase until the current phase's "Done when" condition is met.

---

### Phase 1 — Project Scaffold

**Goal:** Repo compiles, server starts, all routes registered, env loaded.

**Files to create:**
- `go.mod` — module `github.com/yourhandle/claridoc`, Go 1.22
- `.env.example` — `GEMINI_API_KEY=`, `MAPS_API_KEY=`, `PORT=8080`
- `cmd/main.go` — `net/http` server, reads PORT from env, registers stub handlers for `POST /transform`, `POST /ingest`, `GET /locale`, `GET /` (serves frontend)

**Dependencies:**
```bash
go get google.golang.org/genai
go get github.com/joho/godotenv
```

**Done when:** `go run ./cmd/main.go` starts on :8080, all routes return 200 stub responses, no compilation errors.

---

### Phase 2 — Gemini Core

**Goal:** Gemini client initializes, all 5 prompt strategies build correctly, streaming works.

**Files to create:**
- `internal/gemini/client.go`
  - `NewClient(apiKey string) (*Client, error)` — wraps `genai.NewClient`
  - `StreamTransform(ctx context.Context, prompt string, w io.Writer) error` — calls Gemini 2.0 Flash, streams response chunks to `w`
- `internal/gemini/prompts.go`
  - `BuildPrompt(audience, targetLang, sourceLang, content string) string`
  - Audience values: `"junior"`, `"senior"`, `"nontechnical"`
  - Same-language check: `strings.EqualFold(targetLang, sourceLang)`
  - Returns fully assembled prompt string (system + user content)

**Done when:** Standalone test in `cmd/main.go` (guarded by a flag or temp `_test.go`) calls `StreamTransform` with a sample README and prints streamed chunks to stdout.

---

### Phase 3 — Transform Endpoint

**Goal:** `POST /transform` accepts JSON, dispatches to Gemini, streams SSE response to caller.

**Files to create:**
- `internal/transform/models.go`
  - `TransformRequest { Content, Audience, TargetLanguage, SourceLanguage string }`
  - Validation: `Audience` must be `junior|senior|nontechnical`, `Content` non-empty
- `internal/transform/handler.go`
  - `TransformHandler(geminiClient *gemini.Client) http.HandlerFunc`
  - Parses JSON body → validates → calls `prompts.BuildPrompt` → calls `gemini.StreamTransform`
  - Sets `Content-Type: text/event-stream`, `Cache-Control: no-cache`
  - Writes each chunk as `data: <chunk>\n\n`, flushes after each

**Done when:**
```bash
curl -X POST http://localhost:8080/transform \
  -H "Content-Type: application/json" \
  -d '{"content":"# Hello\nThis is a test.","audience":"junior","target_language":"English","source_language":"English"}'
```
Returns streamed markdown output.

---

### Phase 4 — Ingest Endpoint

**Goal:** `POST /ingest` handles both file upload and raw text body, returns clean markdown.

**Files to create:**
- `internal/ingest/parser.go`
  - `ParseFile(file multipart.File, header *multipart.FileHeader) (string, error)` — accepts `.md`, `.txt` only, rejects others with 400
  - `ParseText(raw string) string` — trims whitespace, normalizes line endings to `\n`
- Add `IngestHandler` in `internal/transform/handler.go` (or separate file)
  - Detects `multipart/form-data` vs `text/plain` body
  - Routes to `ParseFile` or `ParseText`
  - Returns `{ "content": "..." }`

**Done when:**
```bash
curl -X POST http://localhost:8080/ingest -F "file=@README.md"
# returns { "content": "..." }

curl -X POST http://localhost:8080/ingest -H "Content-Type: text/plain" -d "# Hello"
# returns { "content": "# Hello" }
```

---

### Phase 5 — Locale Endpoint

**Goal:** `GET /locale?region=X` returns country code and ordered language suggestions.

**Files to create:**
- `internal/locale/maps.go`
  - `GetLocale(region, apiKey string) (countryCode string, languages []string, err error)`
  - Calls `https://maps.googleapis.com/maps/api/geocode/json?address=<region>&key=<apiKey>`
  - Extracts `country` short name from `address_components`
  - Maps country code → language list via internal static map (cover at minimum: IN, US, GB, DE, FR, ES, PT, JP, CN, KR, RU, AR, BR, ID, NG, EG, PK, BD, VN, TR)
  - English always appended if not already present
- Register `LocaleHandler` in `cmd/main.go`

**Done when:**
```bash
curl "http://localhost:8080/locale?region=Karnataka,India"
# returns { "country_code": "IN", "suggested_languages": ["Hindi","Kannada","Tamil","English"] }
```

---

### Phase 6 — Wire & Integration

**Goal:** All handlers wired in `cmd/main.go`, CORS enabled, gemini client passed via dependency injection, server production-ready.

**Changes to `cmd/main.go`:**
- Load `.env` via `godotenv.Load()`
- Initialize `gemini.NewClient(os.Getenv("GEMINI_API_KEY"))`
- Pass client into `TransformHandler`
- Pass `MAPS_API_KEY` into `LocaleHandler`
- Add CORS middleware: `Access-Control-Allow-Origin: *` for dev
- `GET /` serves `frontend/` directory via `http.FileServer(http.Dir("frontend"))` — serves index.html, css/, js/ statically

**Done when:** All three endpoints work end-to-end via curl against a single running server instance with no hardcoded keys.

---

### Phase 7 — Frontend

**Goal:** Working multi-file UI — region → locale → input → transform → streaming side-by-side output.

No build step, no framework, no bundler. ES modules via `<script type="module">`.

**`frontend/index.html`**
- DOM shell only: header, input section, audience selector, language dropdown, output columns
- Loads `css/base.css`, `css/layout.css`, `css/components.css`
- Single script tag: `<script type="module" src="js/main.js">`
- `marked.js` loaded from CDN: `https://cdn.jsdelivr.net/npm/marked/marked.min.js`

**`frontend/css/base.css`**
- CSS custom properties: `--color-bg`, `--color-surface`, `--color-primary`, `--color-text`, `--color-muted`, `--radius`, `--font-mono`
- Typography: system font stack, code font for output panels
- Reset: box-sizing, margin, padding

**`frontend/css/layout.css`**
- Page grid: centered container, max-width 1200px
- Two-column output: `display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem`
- Responsive: single column below 768px

**`frontend/css/components.css`**
- Audience button group: active state via `.active` class
- File input styling, textarea, language dropdown
- Output panels: scrollable, monospace, border

**`frontend/js/api.js`**
- `postIngest(formData)` → `POST /ingest`, returns `{ content }`
- `getLocale(region)` → `GET /locale?region=...`, returns `{ suggested_languages }`
- `streamTransform(payload, onChunk, onDone)` → `POST /transform`, reads `ReadableStream`, calls `onChunk(chunk)` per token

**`frontend/js/locale.js`**
- Exports `initLocale(regionInput, languageSelect)`
- On `blur`: calls `api.getLocale` → clears and repopulates `<select>` options

**`frontend/js/ingest.js`**
- Exports `initIngest(fileInput, textarea)`
- On file select: calls `api.postIngest` → sets `textarea.value` to returned content

**`frontend/js/transform.js`**
- Exports `initTransform(buttons, languageSelect, textarea, originalPanel, outputPanel)`
- Tracks active audience value via button click handlers
- On Transform click: reads audience + language + content → calls `api.streamTransform`
- Passes `onChunk` to `render.appendChunk`, `onDone` to `render.finalizeRender`

**`frontend/js/render.js`**
- Exports `renderMarkdown(panel, content)` — full render via `marked.parse()`
- Exports `appendChunk(panel, chunk)` — appends raw chunk to buffer, re-renders markdown live
- Exports `finalizeRender(panel)` — final pass after stream ends

**`frontend/js/main.js`**
- `import` all modules
- On `DOMContentLoaded`: query selectors for all elements, call all `init*` functions

**Done when:** Full user flow works in browser — paste a README, select Junior Dev + Hindi, click Transform, see streamed Hindi output on the right. Network tab shows separate CSS/JS files loading correctly.

---

### Phase 8 — Deploy

**Goal:** Live public URL on Cloud Run for demo.

**Steps:**
1. Write `Dockerfile` (multi-stage, golang:1.22-alpine builder + alpine runtime)
2. Embed entire `frontend/` directory via `go:embed` in `cmd/main.go`:
   ```go
   //go:embed frontend
   var frontendFS embed.FS
   // serve via http.FileServer(http.FS(frontendFS))
   ```
3. `gcloud run deploy` with `GEMINI_API_KEY` and `MAPS_API_KEY` set as env vars
4. Smoke test: hit `/transform`, `/ingest`, `/locale` against live URL
5. Confirm SSE streaming works over HTTPS (check `Transfer-Encoding: chunked`)

**Done when:** Demo URL is publicly accessible, full flow works end-to-end over HTTPS.

---

## Google Solutions Challenge Alignment

| Criterion | ClariDoc |
|---|---|
| UN SDG | SDG 10 — Reduced Inequalities (language/access barriers in tech) |
| Google tech | Gemini API (core transform + gap analysis), Maps Platform (locale inference) |
| Real-world impact | Reduces friction for junior devs, non-English speakers, and non-technical stakeholders navigating real work |
| Technical depth | Streaming API, audience×language prompt matrix, multi-turn gap analysis, Go backend, Cloud Run |
| Demo | Paste any README → select audience + language → live output in 30s |

---

## Mode 2 — Brief (Post-Launch Roadmap)

> "I have this doc and I need to do X. What exactly do I do?"

### Problem it solves

Clarify mode explains a doc. Brief mode tells you what to *do* with it. A junior dev mid-task doesn't need the whole doc simplified — they need a precise answer to "given my goal, given this doc, what are my next steps and what am I missing?"

### Flow

```
User states goal: "I need to add a new payment provider to the checkout service"
        │
        ▼
User uploads/pastes the relevant doc (architecture doc, onboarding guide, etc.)
        │
        ▼
[POST /brief/analyze]
Gemini reads doc + goal → identifies:
  - What the doc covers that's relevant to the goal
  - What's vague or missing relative to the goal
  - What specific files/context would fill the gaps
        │
        ▼
ClariDoc responds with a gap report:
  "To add a payment provider, this doc references PaymentGateway interface
   but never defines it. Please paste: internal/payment/gateway.go"
        │
        ▼
User pastes requested file(s) — one at a time or all at once
        │
        ▼
[POST /brief/generate]
Gemini now has: goal + doc + requested context files
Generates a precise work briefing:
  - What you are looking at (in plain terms for your level)
  - What you need to implement/change
  - What to watch out for (edge cases, dependencies, gotchas)
  - Suggested first step
        │
        ▼
Output streamed to user. No codebase scan. No guessing.
```

### Key design constraints

- ClariDoc never scans an entire codebase — it asks for specific files only
- Gap detection is relative to the user's stated goal, not generic doc quality
- Each requested file is justified: ClariDoc explains *why* it needs it
- Briefing output is audience-aware (same Junior/Senior/Non-Technical axis as Clarify)
- Session-stateful: the goal + doc + collected files are held in a session for the multi-turn gap-fill loop

### New endpoints (Brief mode)

#### `POST /brief/analyze`
```json
// Request
{
  "goal": "Add a new payment provider to the checkout service",
  "audience": "junior",
  "doc": "# Checkout Service Architecture\n...",
  "target_language": "English"
}

// Response
{
  "covered": ["PaymentGateway interface exists", "checkout flow documented"],
  "gaps": ["PaymentGateway interface definition not in doc", "Error handling contract unclear"],
  "requested_files": [
    {
      "filename": "internal/payment/gateway.go",
      "reason": "Doc references PaymentGateway interface but never defines its methods"
    }
  ]
}
```

#### `POST /brief/generate`
```json
// Request
{
  "goal": "Add a new payment provider to the checkout service",
  "audience": "junior",
  "doc": "# Checkout Service Architecture\n...",
  "context_files": [
    { "filename": "gateway.go", "content": "type PaymentGateway interface {..." }
  ],
  "target_language": "English"
}

// Response: streamed SSE — the work briefing
```

### New files (Brief mode)

```
internal/
  brief/
    handler.go       # /brief/analyze and /brief/generate handlers
    models.go        # BriefRequest, GapReport, ContextFile types
    prompts.go       # gap detection prompt + briefing generation prompt
```

### Prompt strategy (Brief mode)

**Gap detection prompt:**
```
System: You are a senior engineer helping a <audience> complete a specific task.
You will be given a goal and a doc. Identify:
1. What the doc covers that is directly relevant to the goal.
2. What is vague, missing, or assumed in the doc relative to this goal.
3. Specific files the user should provide to fill those gaps. For each file,
   state exactly why it is needed. Ask for the minimum number of files possible.
Return JSON only: { covered, gaps, requested_files: [{filename, reason}] }

User: Goal: <goal>\n\nDoc:\n<doc>
```

**Briefing generation prompt:**
```
System: You are a senior engineer briefing a <audience> on exactly what to do.
You have their goal, the relevant doc, and the context files they provided.
Write a precise work briefing in <target_language>:
- What they are looking at (plain terms for their level)
- What they need to implement or change, step by step
- Dependencies and gotchas to watch for
- A concrete first step
Be specific. Reference actual function names, types, and file paths from the context.
Do not pad. Do not repeat the doc back to them.

User: Goal: <goal>\n\nDoc:\n<doc>\n\nContext:\n<context_files>
```

### Build order (Brief mode, after Phase 8)

```
Phase 9:  internal/brief/models.go + prompts.go
Phase 10: POST /brief/analyze — gap detection, returns JSON gap report
Phase 11: POST /brief/generate — briefing generation, streamed SSE
Phase 12: Frontend — Brief tab: goal input → gap report UI → file paste loop → streaming briefing output
```
