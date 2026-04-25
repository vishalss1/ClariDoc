# ClariDoc

> Not just clearer docs — the right context for the right person.

ClariDoc bridges the gap between what a doc says and what a reader needs to *do*. It has two product modes built sequentially: **Clarify** (Phase 1–8) and **Brief** (post-launch roadmap).

Built in Go, Gemini 2.0 Flash.

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
- **Output language** → user-selected directly from a language dropdown

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
| Frontend | Vanilla JS + HTML (multi-file) |
| Deployment | TBD (Render / Railway / Cloud Run) |

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
│       ├── handler.go           # GET /locale — returns static language list (Maps removed)
│       └── languages.go         # Static list of 50+ supported languages
├── frontend/
│   ├── index.html               # Shell: DOM structure, loads CSS + JS
│   ├── css/
│   │   ├── base.css             # Reset, typography, CSS variables (colors, spacing, fonts)
│   │   ├── layout.css           # Two-column output, page grid, responsive breakpoints
│   │   └── components.css       # Buttons, dropdowns, file input, audience selector, panels
│   └── js/
│       ├── api.js               # All fetch calls: /ingest, /locale, /transform, /brief/*
│       ├── locale.js            # Populates language dropdown from static GET /locale list on page load
│       ├── ingest.js            # File upload + paste handling → POST /ingest → fill textarea
│       ├── transform.js         # Audience selector state, transform button → SSE stream
│       ├── render.js            # Markdown rendering via marked.js, stream buffer → DOM update
│       └── main.js              # Entry point: wires all modules on DOMContentLoaded
├── .env.example
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

### `GET /locale`
- Returns static list of supported languages
- Returns `{ "languages": ["English", "Hindi", "Spanish", "French", "German", "Portuguese", "Japanese", "Chinese", "Korean", "Arabic", "Bengali", "Tamil", "Telugu", "Kannada", "Russian", "Indonesian", "Turkish", "Vietnamese", "Thai", "Swahili", ...] }`
- Called once on page load to populate the language dropdown
- No query params, no external API call

---

## Data Flow

```
Page load → [GET /locale] → static language list → language dropdown populated

User pastes doc OR uploads file
        │
        ▼
[POST /ingest] → parser.go → clean markdown string
        │
        ▼
User selects: Audience (Junior | Senior | Non-Technical) + Target Language (from dropdown)
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
PORT=8080
```

---

---

## Build Phases

Each phase is self-contained and independently testable before moving to the next.
Do not proceed to the next phase until the current phase's "Done when" condition is met.

---

### Phase 1 — Project Scaffold ✅ COMPLETE

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

### Phase 2 — Gemini Core ✅ COMPLETE

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

### Phase 3 — Transform Endpoint ✅ COMPLETE

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

### Phase 4 — Ingest Endpoint ✅ COMPLETE

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

### Phase 5 — Locale Endpoint ✅ COMPLETE

**Goal:** `GET /locale` returns static list of supported languages.

**Files:**
- `internal/locale/languages.go` — `SupportedLanguages() []string`, 97 languages, English first
- `internal/locale/handler.go` — returns `{ "languages": [...] }`, no query params, no external API

**Done when:**
```bash
curl "http://localhost:8080/locale"
# returns { "languages": ["English", "Hindi", "Spanish", ...] }
```

---

### Phase 6 — Wire & Integration

**Goal:** All handlers wired in `cmd/main.go`, CORS enabled, gemini client passed via dependency injection, server production-ready.

**Changes to `cmd/main.go`:**
- Load `.env` via `godotenv.Load()`
- Initialize `gemini.NewClient(os.Getenv("GEMINI_API_KEY"))`
- Pass client into `TransformHandler`
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
- `getLocale()` → `GET /locale`, returns `{ languages: [...] }` — static list, no query param
- `streamTransform(payload, onChunk, onDone)` → `POST /transform`, reads `ReadableStream`, calls `onChunk(chunk)` per token

**`frontend/js/locale.js`**
- Exports `initLocale(languageSelect)`
- On page load: calls `api.getLocale()` → populates `<select>` with full language list
- No region input, no API key, no blur event

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



## Google Solutions Challenge Alignment

| Criterion | ClariDoc |
|---|---|
| UN SDG | SDG 10 — Reduced Inequalities (language/access barriers in tech) |
| Google tech | Gemini API (core transform + gap analysis) |
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

### Build order (Brief mode, after Phase 7)

---

### Phase 8 — Brief Core (models + prompts)

**Goal:** Data types and prompt builders for both Brief endpoints defined and tested in isolation.

**Files to create:**
- `internal/brief/models.go`
  - `BriefAnalyzeRequest { Goal, Audience, Doc, TargetLanguage string }`
  - `ContextFile { Filename, Content string }`
  - `GapReport { Covered []string, Gaps []string, RequestedFiles []RequestedFile }`
  - `RequestedFile { Filename, Reason string }`
  - `BriefGenerateRequest { Goal, Audience, Doc, TargetLanguage string; ContextFiles []ContextFile }`
  - Validation: `Audience` must be `junior|senior|nontechnical`, `Goal` and `Doc` non-empty
- `internal/brief/prompts.go`
  - `BuildAnalyzePrompt(audience, goal, doc string) string` — gap detection prompt, instructs Gemini to return JSON only
  - `BuildGeneratePrompt(audience, targetLang, goal, doc string, files []ContextFile) string` — briefing prompt, audience-aware, assembles context files as named blocks

**Done when:** Both prompt builders callable, output strings inspectable via a `_test.go`, no compilation errors.

---

### Phase 9 — Brief Analyze Endpoint

**Goal:** `POST /brief/analyze` accepts goal + doc, returns structured gap report JSON.

**Files to create/modify:**
- `internal/brief/handler.go`
  - `AnalyzeHandler(geminiClient *gemini.Client) http.HandlerFunc`
  - Parses + validates `BriefAnalyzeRequest`
  - Calls `BuildAnalyzePrompt` → passes to Gemini (non-streaming, single response)
  - Parses Gemini's JSON response into `GapReport`
  - Returns `GapReport` as JSON — `Content-Type: application/json`
- Register `POST /brief/analyze` in `cmd/main.go`

**Done when:**
```bash
curl -X POST http://localhost:8080/brief/analyze   -H "Content-Type: application/json"   -d '{"goal":"Add a payment provider","audience":"junior","doc":"# Checkout Service
...","target_language":"English"}'
# returns { "covered": [...], "gaps": [...], "requested_files": [{...}] }
```

---

### Phase 10 — Brief Generate Endpoint

**Goal:** `POST /brief/generate` accepts goal + doc + context files, streams a precise work briefing.

**Files to modify:**
- `internal/brief/handler.go` (add)
  - `GenerateHandler(geminiClient *gemini.Client) http.HandlerFunc`
  - Parses + validates `BriefGenerateRequest`
  - Calls `BuildGeneratePrompt` → `gemini.StreamTransform`
  - Sets `Content-Type: text/event-stream`, streams chunks as `data: <chunk>

`
- Register `POST /brief/generate` in `cmd/main.go`

**Done when:**
```bash
curl -X POST http://localhost:8080/brief/generate   -H "Content-Type: application/json"   -d '{"goal":"Add a payment provider","audience":"junior","doc":"# Checkout
...","context_files":[{"filename":"gateway.go","content":"type PaymentGateway interface {...}"}],"target_language":"English"}'
# returns streamed markdown briefing
```

---

### Phase 11 — Brief Frontend

**Goal:** Brief tab in the UI — full multi-turn flow: goal input → gap report → file paste loop → streaming briefing output.

**Changes to `frontend/index.html`:**
- Add a tab switcher: `Clarify | Brief` — toggles which panel is visible

**New file `frontend/js/brief.js`:**
- Exports `initBrief(goalInput, audienceButtons, languageSelect, docTextarea, gapPanel, fileLoop, briefingPanel)`
- Step 1: user enters goal + pastes doc + selects audience → calls `POST /brief/analyze` → renders gap report in `gapPanel`
  - Gap report UI: lists what's covered, what's missing, and each requested file with reason
- Step 2: for each requested file — renders a labeled textarea where user pastes file content
- Step 3: Analyze button (re-analyze with pasted files) or Generate button → calls `POST /brief/generate` with all collected context → streams briefing into `briefingPanel` via `render.appendChunk`

**Add to `frontend/js/api.js`:**
- `analyzeBrief(payload)` → `POST /brief/analyze`, returns `GapReport` JSON
- `streamBrief(payload, onChunk, onDone)` → `POST /brief/generate`, reads `ReadableStream`

**Done when:** Full Brief flow works in browser — enter a goal, paste a doc, see gap report, paste a requested file, click Generate, see streamed briefing output.