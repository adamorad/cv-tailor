# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- Adversarial fixture coverage for `sanitizeFilenameBase` in `lib/filename.ts`: very long strings (10,000+ characters), control characters, null bytes, unicode/emoji/RTL mixes, path-traversal variants, and entirely non-alphanumeric input, asserting the output is always non-empty, capped at 100 characters, and never contains `/`, `\`, `..`, or control characters. Plus `loadHistory()` tests covering entries with an invalid `cv` shape, missing/mistyped `id`/`createdAt`, and a wholly-garbage array.
- A wall-clock timeout on CV generation (4 minutes) and cover letter generation (2 minutes, shorter output), so a hung Ollama call (accepts the request, then never responds) gives up on its own with a clear `GenerationTimeoutError`/504 instead of hanging forever — distinct from the existing manual-cancel `GenerationAbortedError`/499. Combines the caller's cancel signal with `AbortSignal.timeout()` via `AbortSignal.any()`, and covers both the initial request and the streaming phase (the `ollama` client only exposes an abort hook on the stream it eventually returns, so the initial connect is separately raced against the same signal).
- Cancel and Remove affordances in the model picker: a Cancel button on an in-progress model download that actually aborts the underlying `ollama.pull()` stream server-side, and a Remove button on a downloaded model that calls a new `DELETE /api/models` endpoint (backed by `ollama.delete()`), so downloaded models no longer need to be removed manually via `ollama rm <model>`.
- A Cancel button during CV and cover letter generation. Cancelling aborts the in-progress Ollama stream server-side (not just the client-side fetch), so the model actually stops generating instead of finishing unseen.
- A disk-space check before pulling a model in `POST /api/models`: rejects with a 400 (before the download stream starts) if free space is under the model's `sizeGb` plus a 1GB safety margin, instead of starting a multi-gigabyte download that could fill the disk.
- Unit tests for all six `app/api/*/route.ts` handlers (request validation, length guards, model-allowlist checks, malformed JSON, and success paths), colocated under `app/api/<route>/__tests__/route.test.ts`, plus a `vitest.config.mts` `@` alias so route files under test can resolve their real `@/lib/*` imports. Fixed leftover duplicated/incorrect rows in `docs/API.md`'s `POST /api/cover-letter` responses table and a stale "All four routes" intro line.
- `@vitest/coverage-v8` and a `test:coverage` script, plus a `Coverage (report-only)` CI step uploading the `coverage/` directory as a build-job artifact (no threshold enforcement, no external coverage service).
- A live Ollama-reachability check driving the sidebar's badge: it polls `GET /api/health` on mount, every 20s, and on window focus, and switches from "On-device" (green dot) to "Ollama unreachable" (red dot) when the local server can't be reached — purely informational, doesn't block Generate.
- `app/error.tsx` and `app/not-found.tsx`, matching the app's existing design language, replacing Next.js's default fallback pages for uncaught render errors and unmatched routes.
- A `.github/workflows/codeql.yml` running CodeQL static analysis (JavaScript/TypeScript) on every push and PR to `main`, plus a weekly schedule.
- Playwright E2E coverage for the actual generate → preview → export flow (`e2e/generate-flow.spec.ts`): mocked `/api/generate` and `/api/export`, driven entirely through the rendered UI (the real "Paste text instead" toggle, model picker, Generate button), asserting the tailored preview renders, the run lands in the sidebar History panel, and a Word-format download fires. Plus `e2e/cover-letter-and-cancel.spec.ts` covering cover-letter generation and cancelling an in-flight CV generation back to idle.
- `.editorconfig` pinning UTF-8, LF, a final newline, trimmed trailing whitespace, and 2-space indentation to match the repo's existing conventions.
- Edge-case coverage for all five `lib/render/*` renderers: empty optional sections (no skills/experience/certifications), a bare-minimum Cv (only a name, everything else empty), very long content (a long single bullet, a multi-paragraph summary), unicode (CJK, Arabic, Hebrew, emoji), and format-specific special characters (markdown-significant characters in `toMarkdown`, HTML-significant characters in ordinary — not just link — fields in `toHtml`). The `toDocx`/`toPdf` unicode and long-content tests round-trip the generated buffer back to text via `mammoth`/`unpdf` (already app dependencies) to assert content actually survived, not just that generation didn't throw.
- Component tests for `HistoryPanel` and `CoverLetterPanel`, colocated under `components/__tests__/*.test.tsx`, using `@testing-library/react` and `@testing-library/jest-dom` (new devDependencies, along with `jsdom`). These opt into a DOM environment per-file via a `// @vitest-environment jsdom` docblock, leaving `vitest.config.mts`'s global `node` environment untouched for the existing route/lib tests; `vitest.config.mts`'s `include` glob now also matches `*.test.tsx`. Covers `HistoryPanel`'s empty state, entry rendering (name/title/relative time), select/clear clicks; and `CoverLetterPanel`'s initial button state, a mocked `fetch` request/response round trip, a calm non-OK error state, clipboard copy of the live textarea content, and the download blob's content/type.

### Fixed

- `loadHistory()` in `lib/storage.ts` only checked that the parsed localStorage value was an array, never that each entry actually had the `HistoryEntry` shape or that `cv` was a valid `Cv` (per `cvSchema`). A corrupted entry (partial write, devtools tampering, a future migration bug) would flow straight into React state, where `HistoryPanel`/`CvPreview` assume a valid shape and could crash or render garbage. Now each entry is validated with `cvSchema.safeParse` plus type checks on `id`/`createdAt`, and invalid entries are dropped individually rather than discarding the whole list (or crashing) — a wholly-garbage array still degrades to `[]`, unchanged.
- `sanitizeFilenameBase` in `lib/filename.ts` had no cap on output length, so a sufficiently long `cv.name` (a pathological LLM output, unlikely but possible) could produce a filename long enough to trip a filesystem's path-length limit and break the CV download. Output is now capped at 100 characters.
- `toPdfBuffer` mutated its input `Cv` in place: `job.bullets` and `cv.certifications` arrays were passed directly to pdfmake's `ul` content field, and pdfmake rewrites each array element in place during PDF layout, replacing the original bullet/certification strings with pdfmake's internal layout objects. Any caller holding onto the same `Cv` object after calling `toPdfBuffer` (e.g. exporting to another format afterward, or a test asserting on the object post-export) would see corrupted data. Fixed by passing a shallow copy (`[...job.bullets]`, `[...cv.certifications]`) instead of the original array reference. Caught by a new `toPdfBuffer` edge-case test that read a fixture's bullet text back after export.

### Changed

- CI's `npm audit` step now fails the build on a `critical`-severity vulnerability (previously report-only via `continue-on-error`); high/moderate/low still just report, since there's no triage process for those yet.
- `docs/ARCHITECTURE.md` refreshed to match the current codebase: corrected the stale `stream: false` claim (generation actually uses `stream: true`, needed for cancellation/timeout), and added coverage of cover letter generation, the client-side persistence layer (`lib/storage.ts`), the model pull/cancel/delete lifecycle (`app/api/models/route.ts`, `lib/diskSpace.ts`), and the health-check/error-boundary pages — all of which had shipped since the doc was last updated.

## [0.2.0] - 2026-09-02

### Added

- GitHub Actions CI (lint, typecheck, build, test on every push/PR).
- A Vitest unit test suite: `sanitizeFilenameBase`, `contactParts`/`contactBasicParts`, and all five `lib/render/*` renderers, including a regression test for the HTML-export XSS fix.
- `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `docs/ARCHITECTURE.md`.
- GitHub issue templates, a PR template, `.github/dependabot.yml`, and `CODEOWNERS`.
- A 50,000-character length guard on `cvText`/`jobDescription` in `/api/generate`.
- Security response headers (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`) via `next.config.ts`.
- `.nvmrc` and an `engines` field pinning Node 20+.
- Repo topics and a proper GitHub Release for `v0.1.0`.
- Real drag-and-drop file upload for the CV and job description cards, with a dashed-border drop overlay and a persistent hint so the affordance is discoverable without dragging first. Unsupported file types are rejected client-side with a clear message.
- Each input card now defaults to a drop zone instead of an empty text box, with a "Paste text instead" toggle and a "Clear" button to revert.
- A trickle-style progress bar during CV generation (Ollama reports no incremental progress for a single completion, so this eases toward ~90% on a curve tuned to typical generation time rather than faking a real percentage).
- README: a "Choosing a model" guide keyed to system RAM, and a "Cleaning up" section covering how to remove downloaded models and uninstall Ollama.
- A Playwright E2E smoke test (mocked `/api/models`, no real Ollama needed) covering the landing page, drop-zone/paste-text toggle, model picker, and Generate button gating, plus an automated axe-core accessibility scan — both run in a separate `.github/workflows/e2e.yml`.
- `docs/API.md` (full request/response reference for all routes), two ADRs (`docs/adr/`) explaining the local-Ollama and structured-JSON-schema decisions, and JSDoc on the exported `lib/` functions.
- A README FAQ, Troubleshooting section, and Credits section.
- An optional `Dockerfile` and `docker-compose.yml` for running the app alongside Ollama in containers — a secondary, community-convenience path, not the primary documented workflow.
- `npm audit` and an SBOM-generation step in CI (report-only; doesn't block builds).
- A `Content-Security-Policy` header alongside the existing security headers.
- A `.github/workflows/release.yml` that auto-generates GitHub Release notes when a `v*` tag is pushed, complementing (not replacing) the hand-curated changelog.
- A pre-commit hook (husky + lint-staged) that runs `eslint --fix` on staged files, installed automatically via `npm install`.
- `GET /api/health`, reporting whether the app can reach its local Ollama server — for scripting/monitoring, not the UI.
- Local-only structured logging around each generation call (model, timing, outcome — never CV/job-description content), and a friendlier error when a picked model doesn't support structured output at all.
- An explicit "Data & telemetry" section in `SECURITY.md` stating plainly that the app sends zero telemetry and only ever talks to your local Ollama server.
- Session restore: the CV/job description text and picked model are saved to `localStorage` as you type and restored on next visit.
- CV history: each successful generation is saved locally (last 20) and shown in the sidebar, so you can revisit a previous result without regenerating.
- Cover letter generation: a "Generate cover letter" button in the preview produces an editable, grounded cover letter (`POST /api/cover-letter`) from the tailored CV and job description, with Copy and Download `.txt` actions.
- `bin/cv-tailor`, a launcher script that starts the production server (if not already running) and opens it in the default browser — installed by the new Homebrew formula (`adamorad/cv-tailor` tap).

### Changed

- Swapped the curated model list for smaller options: Qwen 2.5 1.5B/3B/7B and Llama 3.2 3B (1GB–4.7GB), replacing Llama 3.1 8B, Mistral 7B, and Qwen 2.5 14B (4.4GB–9GB).
- Shrunk the CV/JD input boxes by 40%.
- Replaced the top bar with a persistent left sidebar (logo, "On-device" badge) on wider screens; a compact top bar remains on mobile.

### Fixed

- A genuine WCAG AA contrast failure on the "Upload PDF/DOCX" button (4.15:1, needs 4.5:1) and, after merging the sidebar and accessibility work together, a second one on the sidebar's "On-device" badge (4.41:1) — both caught by the new automated axe-core scan, not manual review.

- Smaller models (first observed with Qwen 2.5 3B) would occasionally invent a contact link (e.g. a LinkedIn URL) not present in the source CV, or concatenate the company name into the `role` field. The prompt now explicitly forbids inventing contact details and requires each field to hold only what it's for.
- The page never declared `color-scheme`, so some browsers layered their own automatic dark theming on top of the app's own dark-mode CSS, rendering cards as a muddy half-inverted gray. Added `color-scheme: light dark`.
- The initial sidebar implementation put the mobile header and main content as flex siblings in a row instead of stacking them, squeezing all page content into a ~48px sliver on narrow screens. Fixed by wrapping them in their own column.
- Neither `eslint.config.mjs` nor `vitest.config.mts` excluded `.claude/` (git worktree scaffolding used by background agents, each a full checkout with its own `node_modules`). Lint went from clean to 926 errors and the test run picked up an unrelated package's internal test suite from a nested `node_modules`. Both configs now exclude `.claude/**` and `**/node_modules/**` properly.

## [0.1.0] - 2026-09-01

### Added

- Local CV tailoring via a single call to a user-selected Ollama model (Qwen 2.5 7B, Qwen 2.5 14B, Llama 3.1 8B, Mistral 7B) — no API key, nothing leaves the machine.
- In-UI model picker that lazily downloads only the model you pick, with a live progress ring.
- CV and job description input by paste or PDF/DOCX upload.
- Export to Markdown, plain text, HTML, Word (.docx), and PDF, all rendered from one structured CV schema so formats never drift from each other.
- Apple HIG-inspired UI: frosted header, App Store-style model install pattern, segmented export format control, a generation-time skeleton state, and a reveal animation for the finished preview.

### Fixed

- Escaped HTML export against attribute-breakout/XSS via LLM-generated contact links (also restricted clickable links to `http(s)://`).
- Enforced the curated-model allowlist server-side on `/api/generate`, not just in the UI.
- Sanitized export filenames against `Content-Disposition` header injection.
- Guarded against a race where re-clicking a model mid-download could start a second concurrent pull.
- Handled malformed JSON request bodies, oversized file uploads, and malformed model output with clear, user-facing errors instead of raw stack traces.
- Deduplicated contact-line formatting, previously copy-pasted across five renderers, into shared helpers.
