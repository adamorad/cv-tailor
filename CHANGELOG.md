# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- Real drag-and-drop file upload for the CV and job description cards, with a dashed-border drop overlay and a persistent hint so the affordance is discoverable without dragging first. Unsupported file types are rejected client-side with a clear message.
- Each input card now defaults to a drop zone instead of an empty text box, with a "Paste text instead" toggle and a "Clear" button to revert.
- A trickle-style progress bar during CV generation (Ollama reports no incremental progress for a single completion, so this eases toward ~90% on a curve tuned to typical generation time rather than faking a real percentage).
- README: a "Choosing a model" guide keyed to system RAM, and a "Cleaning up" section covering how to remove downloaded models and uninstall Ollama.

### Changed

- Swapped the curated model list for smaller options: Qwen 2.5 1.5B/3B/7B and Llama 3.2 3B (1GB–4.7GB), replacing Llama 3.1 8B, Mistral 7B, and Qwen 2.5 14B (4.4GB–9GB).
- Shrunk the CV/JD input boxes by 40%.
- Replaced the top bar with a persistent left sidebar (logo, "On-device" badge) on wider screens; a compact top bar remains on mobile.

### Fixed

- Smaller models (first observed with Qwen 2.5 3B) would occasionally invent a contact link (e.g. a LinkedIn URL) not present in the source CV, or concatenate the company name into the `role` field. The prompt now explicitly forbids inventing contact details and requires each field to hold only what it's for.
- The page never declared `color-scheme`, so some browsers layered their own automatic dark theming on top of the app's own dark-mode CSS, rendering cards as a muddy half-inverted gray. Added `color-scheme: light dark`.
- The initial sidebar implementation put the mobile header and main content as flex siblings in a row instead of stacking them, squeezing all page content into a ~48px sliver on narrow screens. Fixed by wrapping them in their own column.

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
