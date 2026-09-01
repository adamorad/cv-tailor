# CV Tailor

A localhost app that tailors your CV to a job description — entirely on your own machine, using a local model through [Ollama](https://ollama.com). No API key, no cloud, nothing leaves your computer.

Paste or upload (PDF/DOCX) your CV and a job description, pick a local model, and get back a tailored CV you can export as Markdown, plain text, HTML, Word (.docx), or PDF.

## Screenshots

|                                                       |                                                              |                                                         |
| ----------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------- |
| ![Hero and input screen](./docs/screenshots/hero.jpg) | ![Model picker](./docs/screenshots/model-picker.jpg)         | ![Generated CV preview](./docs/screenshots/preview.jpg) |
| Paste or upload your CV and the job description       | Pick a local model — only the one you choose gets downloaded | Get a tailored preview, ready to export                 |

## How it works

1. **Extraction** — uploaded PDF/DOCX files are converted to plain text locally (`unpdf`, `mammoth`).
2. **Generation** — a single call to your local Ollama model returns one structured JSON representation of the CV (name, summary, skills, experience, education, ...), constrained by a JSON schema. The model reorders and rewrites your existing skills/summary/bullets to match the job description — it's instructed not to invent experience you don't have.
3. **Export** — all five output formats are rendered deterministically from that one JSON object, so they never drift from each other.

There's no agent loop, no tool-calling, no multi-step pipeline — just one prompt-in/JSON-out call per generation.

## Requirements

- Node.js 20+
- [Ollama](https://ollama.com) installed and running (`ollama serve`)

You don't need to pre-pull a model — the model picker in the UI lists a few curated options (Qwen 2.5 7B/14B, Llama 3.1 8B, Mistral 7B) and downloads whichever one you pick, with a progress indicator, the first time you select it.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) (or whatever port the dev server prints).

## Tech stack

Next.js (App Router) · TypeScript · Tailwind CSS · Ollama · Zod · `docx` · `pdfmake` · `unpdf` · `mammoth`

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for release notes.

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=adamorad/cv-tailor&type=Date)](https://star-history.com/#adamorad/cv-tailor&Date)

## License

MIT — see [LICENSE](./LICENSE).
