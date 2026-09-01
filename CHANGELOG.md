# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

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
