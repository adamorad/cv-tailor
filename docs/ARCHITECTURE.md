# Architecture

CV Tailor is a single Next.js (App Router) app. There's no database, no
auth, and no external network calls other than to a local Ollama server —
everything runs on `localhost`.

The app moves through three stages: extract text from an uploaded file (if
any), generate one structured CV object with a local LLM, then render that
object into whichever export format the user picks. Only the middle stage
touches the model; extraction and rendering are both deterministic, ordinary
code. Beyond that core pipeline, the app also has an optional cover-letter
generation step (a second, similar LLM call), a client-side persistence
layer for drafts and CV history, and a model lifecycle (list/pull/delete)
for managing local Ollama models — each covered in its own section below.

## 1. Extraction (no LLM)

`app/api/parse-file/route.ts` accepts an uploaded file and calls
`lib/parseFile.ts`'s `extractTextFromFile`, which converts a PDF or DOCX to
plain text entirely locally:

- PDF: `unpdf` (`getDocumentProxy` + `extractText`)
- DOCX: `mammoth` (`extractRawText`)

The resulting text is returned to the client and dropped straight into the
CV input box — the LLM never sees the original file, only this extracted
text.

## 2. Generation (CV and cover letter)

`app/api/generate/route.ts` validates the request (required fields, a
max-length guard on `cvText`/`jobDescription`, and a server-side allowlist of
`CURATED_MODELS` from `lib/models.ts`), then calls `generateTailoredCv` in
`lib/llm.ts`.

`generateTailoredCv` makes exactly one call to the local Ollama server via the
`ollama` npm client (`Ollama.chat`, `stream: true`), passing:

- a fixed system prompt that instructs the model to tailor the CV truthfully
  (no invented experience, numbers, or contact details) toward the job
  description, and
- a `format` set to a JSON schema derived from the Zod schema in
  `lib/schema.ts` via `z.toJSONSchema(cvSchema)`.

Because `format` constrains Ollama's structured output to that schema, the
model's response is (in principle) already shaped like a `Cv` object. The
response is still parsed with `JSON.parse` and re-validated with
`cvSchema.parse` as a safety net — if a smaller/weaker model produces malformed
JSON despite the schema constraint, this throws a clear error back to the
user instead of a UI rendering a garbage object.

The call streams (`stream: true`) even though the client never sees partial
output — the whole response is awaited before returning. Streaming is what
makes cancellation and a wall-clock timeout possible: the `ollama` client
only exposes an abort hook (`stream.abort()`) on the stream object the call
eventually resolves to, not on the initial request itself. `withTimeout`
(`lib/llm.ts`) combines the caller's `AbortSignal` (wired to the client's
Cancel button) with a timeout signal (`AbortSignal.timeout(GENERATION_TIMEOUT_MS)`,
4 minutes — a 7B model has taken 30s+ in manual testing on modest hardware,
leaving generous headroom) via `AbortSignal.any()` into one combined signal.
`raceSignal` races the initial `ollama.chat()` call itself against that
combined signal, since a hang before the stream resolves (connection
accepted, no response ever sent) can't be caught by `stream.abort()` alone;
once the stream does resolve, the combined signal is wired to `stream.abort()`
so an abort mid-stream actually stops Ollama from continuing to generate, not
just the client's fetch. If the combined signal fired from a caller cancel,
`generateTailoredCv` throws `GenerationAbortedError`; if it fired because the
timeout elapsed, it throws `GenerationTimeoutError` instead.
`app/api/generate/route.ts` maps the former to a bodyless 499 (the client
already disconnected) and the latter to a 504 with a real error body (the
client is still waiting).

There is no agent loop, tool-calling, or multi-step pipeline — one prompt in,
one structured object out.

### Cover letter generation

`app/api/cover-letter/route.ts` and `lib/coverLetter.ts`'s
`generateCoverLetter` follow the same shape as CV generation: request
validation (including re-validating the posted `Cv` against `cvSchema`, since
the client already has one from a prior CV generation), one `ollama.chat()`
call with `stream: true`, and the same `withTimeout`/`raceSignal`/
`GenerationAbortedError`/`GenerationTimeoutError` cancel-and-timeout
mechanics, imported directly from `lib/llm.ts` and mapped to the same 499/504
statuses. Two things differ: the timeout is shorter (2 minutes vs. 4, since a
cover letter is much shorter output than a full CV), and there's no `format`/
JSON schema constraint — the system prompt asks for plain prose (3-4 short
paragraphs, no markdown, no placeholder brackets), and the route returns
`{ letter: string }` directly instead of parsing and validating structured
output.

`components/CoverLetterPanel.tsx` drives this from the client: a "Generate
cover letter" button appears under the CV preview once a CV exists, with its
own Cancel button while a call is in flight; once generated, the letter is
editable in place, copyable to the clipboard, and downloadable as `.txt`.

## 3. Rendering (no LLM)

Everything downstream of generation works off the single `Cv` object (typed
from `cvSchema` in `lib/schema.ts`) and is purely deterministic — the same
object always renders to the same output in every format, so the five export
formats can never drift from each other or from what's shown in the preview.

`lib/render/*.ts` holds one renderer per format:

- `toMarkdown.ts`, `toText.ts`, `toHtml.ts` — pure functions from `Cv` to a
  string. These run **client-side**: `components/ExportPanel.tsx` calls them
  directly to produce the Markdown/plain-text/HTML preview and downloads,
  without a server round-trip.
- `toDocx.ts`, `toPdf.ts` — produce binary output (via `docx` and `pdfmake`
  respectively), so these run **server-side** only, through
  `app/api/export/route.ts`. That route re-validates the posted `Cv` object
  against `cvSchema`, checks `format` is `"docx"` or `"pdf"`, sanitizes the
  download filename (`lib/filename.ts`), and lazy-imports (`await import(...)`)
  only the renderer the request actually needs, keeping the two heavier
  binary-format libraries out of the route's cold-start bundle when they're
  not being used.

## 4. Client-side persistence

`lib/storage.ts` wraps every `localStorage` access in try/catch (`safeGet`/
`safeSet`) so a disabled store, private browsing, or a quota error degrades
to "nothing saved, nothing restored" instead of throwing — nothing
downstream needs to know persistence failed.

Two independent things are persisted, both driven from `app/page.tsx`:

- **Draft auto-save/restore**: `cvText`, `jobDescription`, and the selected
  `model` are saved to `localStorage` (key `cv-tailor:draft`) via `saveDraft`
  on every change, and restored once on mount via `loadDraft`. The restore
  effect is allowed to run before the save effect fires (gated on a
  `restored` flag) so the empty initial state doesn't immediately overwrite a
  saved draft before it's had a chance to load.
- **CV history**: every successful generation is prepended to a list via
  `addToHistory`, capped at 20 entries (oldest dropped first), stored under
  `cv-tailor:history`. `components/HistoryPanel.tsx` renders the list in the
  sidebar (name, title, relative time via a local `timeAgo` helper) and lets
  the user click an entry to restore that `Cv` into the preview, or clear the
  history entirely.

## 5. Model lifecycle

`app/api/models/route.ts` exposes three operations against the curated model
list in `lib/models.ts`, all backed by the `ollama` npm client:

- `GET` — lists `CURATED_MODELS` annotated with `downloaded: boolean`,
  computed by cross-referencing `ollama.list()`'s installed models.
- `POST` — pulls a model. Before starting the download, it checks free disk
  space via `lib/diskSpace.ts`'s `getAvailableBytes` (wraps
  `node:fs/promises`'s `statfs`) against the model's approximate `sizeGb`
  plus a 1GB safety margin for Ollama's own temp/working space during
  extraction, and rejects with a 400 before any data moves if there isn't
  enough room; the check is best-effort, so a failure to check doesn't block
  the pull. The pull itself streams `ollama.pull()`'s progress events back to
  the client as newline-delimited JSON (`application/x-ndjson`), and honors
  the request's `AbortSignal` by calling `progress.abort()`, so cancelling
  client-side actually stops the download server-side rather than just
  detaching the client.
- `DELETE` — removes a downloaded model via `ollama.delete()`, returning a
  404 with a friendly message if it isn't actually downloaded.

`components/ModelPicker.tsx` drives all three from a grid of model cards:
selecting a downloaded model calls `onSelect` directly; selecting one that
isn't downloaded starts a pull, showing a progress ring (parsed from each
ndjson chunk's `completed`/`total`) and a Cancel button that aborts the
client-side `fetch`, which propagates to the server via the route's signal
handling above; a downloaded, non-selected model shows a Remove button that
calls `DELETE`.

## 6. Health check, error boundary, and not-found

`app/api/health/route.ts` is a small `GET` endpoint for scripting/monitoring:
it calls `ollama.list()` and reports `{ status: "ok" }` or a 503
`{ status: "degraded" }`. `app/page.tsx`'s `useOllamaReachable` hook polls it
on mount, every 20 seconds, and on window focus, driving the sidebar's
"On-device"/"Ollama unreachable" badge — purely informational, it doesn't
block Generate.

`app/error.tsx` and `app/not-found.tsx` replace Next's default fallback
pages for uncaught render errors and unmatched routes, styled to match the
rest of the app.

## Key files

- `lib/parseFile.ts` — PDF/DOCX to plain text (extraction, no LLM)
- `lib/schema.ts` — the `Cv` Zod schema and shared contact-formatting helpers
- `lib/llm.ts` — the system prompt, `generateTailoredCv` (the CV LLM call),
  and the shared cancel/timeout helpers (`withTimeout`, `raceSignal`,
  `GenerationAbortedError`, `GenerationTimeoutError`)
- `lib/coverLetter.ts` — the cover letter system prompt and
  `generateCoverLetter`
- `lib/models.ts` — the curated, allowlisted set of Ollama models
- `lib/filename.ts` — safe filename derivation for downloads
- `lib/storage.ts` — client-side draft auto-save/restore and CV history
  (`localStorage`, degrades gracefully if unavailable)
- `lib/diskSpace.ts` — free-space check used before a model pull
- `lib/render/toMarkdown.ts`, `toText.ts`, `toHtml.ts` — client-side renderers
- `lib/render/toDocx.ts`, `toPdf.ts` — server-side binary renderers
- `app/api/parse-file/route.ts` — extraction endpoint
- `app/api/generate/route.ts` — CV generation endpoint
- `app/api/cover-letter/route.ts` — cover letter generation endpoint
- `app/api/export/route.ts` — DOCX/PDF export endpoint
- `app/api/models/route.ts` — model list/pull/delete endpoint
- `app/api/health/route.ts` — Ollama reachability check, used by the sidebar
  status badge
- `app/error.tsx`, `app/not-found.tsx` — root error boundary and 404 page
- `components/ExportPanel.tsx` — renders MD/TXT/HTML client-side and drives
  DOCX/PDF export requests
- `components/HistoryPanel.tsx` — sidebar CV history list
- `components/CoverLetterPanel.tsx` — cover letter generation UI
