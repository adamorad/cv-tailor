# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- Cancel and Remove affordances in the model picker: a Cancel button on an in-progress model download that actually aborts the underlying `ollama.pull()` stream server-side, and a Remove button on a downloaded model that calls a new `DELETE /api/models` endpoint (backed by `ollama.delete()`), so downloaded models no longer need to be removed manually via `ollama rm <model>`.
- A Cancel button during CV and cover letter generation. Cancelling aborts the in-progress Ollama stream server-side (not just the client-side fetch), so the model actually stops generating instead of finishing unseen.
- A disk-space check before pulling a model in `POST /api/models`: rejects with a 400 (before the download stream starts) if free space is under the model's `sizeGb` plus a 1GB safety margin, instead of starting a multi-gigabyte download that could fill the disk.
- Unit tests for all six `app/api/*/route.ts` handlers (request validation, length guards, model-allowlist checks, malformed JSON, and success paths), colocated under `app/api/<route>/__tests__/route.test.ts`, plus a `vitest.config.mts` `@` alias so route files under test can resolve their real `@/lib/*` imports. Fixed leftover duplicated/incorrect rows in `docs/API.md`'s `POST /api/cover-letter` responses table and a stale "All four routes" intro line.
- `@vitest/coverage-v8` and a `test:coverage` script, plus a `Coverage (report-only)` CI step uploading the `coverage/` directory as a build-job artifact (no threshold enforcement, no external coverage service).
- A live Ollama-reachability check driving the sidebar's badge: it polls `GET /api/health` on mount, every 20s, and on window focus, and switches from "On-device" (green dot) to "Ollama unreachable" (red dot) when the local server can't be reached — purely informational, doesn't block Generate.
- `app/error.tsx` and `app/not-found.tsx`, matching the app's existing design language, replacing Next.js's default fallback pages for uncaught render errors and unmatched routes.
- A `.github/workflows/codeql.yml` running CodeQL static analysis (JavaScript/TypeScript) on every push and PR to `main`, plus a weekly schedule.

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
