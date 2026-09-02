# Architecture

CV Tailor is a single Next.js (App Router) app. There's no database, no
auth, and no external network calls other than to a local Ollama server —
everything runs on `localhost`.

The app moves through three stages: extract text from an uploaded file (if
any), generate one structured CV object with a local LLM, then render that
object into whichever export format the user picks. Only the middle stage
touches the model; extraction and rendering are both deterministic, ordinary
code.

## 1. Extraction (no LLM)

`app/api/parse-file/route.ts` accepts an uploaded file and calls
`lib/parseFile.ts`'s `extractTextFromFile`, which converts a PDF or DOCX to
plain text entirely locally:

- PDF: `unpdf` (`getDocumentProxy` + `extractText`)
- DOCX: `mammoth` (`extractRawText`)

The resulting text is returned to the client and dropped straight into the
CV input box — the LLM never sees the original file, only this extracted
text.

## 2. Generation (one LLM call)

`app/api/generate/route.ts` validates the request (required fields, a
max-length guard on `cvText`/`jobDescription`, and a server-side allowlist of
`CURATED_MODELS` from `lib/models.ts`), then calls `generateTailoredCv` in
`lib/llm.ts`.

`generateTailoredCv` makes exactly one call to the local Ollama server via the
`ollama` npm client (`Ollama.chat`, `stream: false`), passing:

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

There is no agent loop, tool-calling, or multi-step pipeline — one prompt in,
one structured object out.

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

## Key files

- `lib/parseFile.ts` — PDF/DOCX to plain text (extraction, no LLM)
- `lib/schema.ts` — the `Cv` Zod schema and shared contact-formatting helpers
- `lib/llm.ts` — the system prompt and `generateTailoredCv` (the one LLM call)
- `lib/models.ts` — the curated, allowlisted set of Ollama models
- `lib/filename.ts` — safe filename derivation for downloads
- `lib/render/toMarkdown.ts`, `toText.ts`, `toHtml.ts` — client-side renderers
- `lib/render/toDocx.ts`, `toPdf.ts` — server-side binary renderers
- `app/api/parse-file/route.ts` — extraction endpoint
- `app/api/generate/route.ts` — generation endpoint
- `app/api/export/route.ts` — DOCX/PDF export endpoint
- `app/api/models/route.ts` — model listing/pull endpoint
- `components/ExportPanel.tsx` — renders MD/TXT/HTML client-side and drives
  DOCX/PDF export requests
