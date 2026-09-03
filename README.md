<p align="center">
  <img src="./docs/logo.png" alt="CV Tailor" width="480">
</p>

A localhost app that tailors your CV to a job description — entirely on your own machine, using a local model through [Ollama](https://ollama.com). No API key, no cloud, nothing leaves your computer.

Paste or upload (PDF/DOCX) your CV and a job description, pick a local model, and get back a tailored CV you can export as Markdown, plain text, HTML, Word (.docx), or PDF.

## Screenshots

**Paste or upload your CV and the job description**
![Hero and input screen](./docs/screenshots/hero.jpg)

**Pick a local model — only the one you choose gets downloaded**
![Model picker](./docs/screenshots/model-picker.jpg)

**Get a tailored preview, ready to export**
![Generated CV preview](./docs/screenshots/preview.jpg)

## How it works

1. **Extraction** — uploaded PDF/DOCX files are converted to plain text locally (`unpdf`, `mammoth`).
2. **Generation** — a single call to your local Ollama model returns one structured JSON representation of the CV (name, summary, skills, experience, education, ...), constrained by a JSON schema. The model reorders and rewrites your existing skills/summary/bullets to match the job description — it's instructed not to invent experience you don't have.
3. **Export** — all five output formats are rendered deterministically from that one JSON object, so they never drift from each other.

There's no agent loop, no tool-calling, no multi-step pipeline — just one prompt-in/JSON-out call per generation.

## Requirements

- Node.js 20+
- [Ollama](https://ollama.com) installed and running (`ollama serve`)

You don't need to pre-pull a model — the model picker in the UI lists a few curated, small-footprint options (Qwen 2.5 1.5B/3B/7B, Llama 3.2 3B — 1GB to 4.7GB) and downloads whichever one you pick, with a progress indicator, the first time you select it.

### Choosing a model

Local models need roughly their own size in RAM to run comfortably, on top of whatever your OS and other apps are already using. As a rule of thumb, based on your machine's total RAM:

| RAM   | Recommended                 | Notes                                                           |
| ----- | --------------------------- | --------------------------------------------------------------- |
| 8GB   | Qwen 2.5 1.5B               | Leaves headroom for everything else running                     |
| 16GB  | Qwen 2.5 3B or Llama 3.2 3B | Comfortable; Qwen 2.5 7B will work but is tight                 |
| 32GB+ | Qwen 2.5 7B                 | The highest-quality option in this app, runs with room to spare |

Apple Silicon (M-series) Macs handle all four options well thanks to fast unified memory; on Intel Macs or slower GPUs, expect generation to take noticeably longer regardless of size. If you have the RAM and want a bigger model than the curated list offers, `ollama pull` any model yourself and add it to the list in `lib/models.ts`.

## FAQ

**Why local instead of a cloud AI API?**
Privacy and cost, deliberately: your CV and the job description you're applying to are personal and sometimes sensitive, so nothing about them should leave your machine — no API key to manage, no per-call cost, no third party seeing your data. See [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) and the `[0.1.0]` entry in [CHANGELOG.md](./CHANGELOG.md) for how this shaped the project from the start.

**Why these four specific models?**
Qwen 2.5 1.5B/3B/7B and Llama 3.2 3B were chosen for a small footprint (1GB–4.7GB) so the app stays usable on modest hardware without a long download or huge RAM commitment. See "Choosing a model" above for the RAM-based recommendation.

**Can I use a bigger or different model?**
Yes — `ollama pull` any model you want, then add an entry for it to the `CURATED_MODELS` array in `lib/models.ts` (each entry is `{ id, label, sizeGb, description }`, where `id` is the Ollama model tag). It'll then show up in the in-app model picker like the built-in options.

## Getting started

### macOS via Homebrew

```bash
brew tap adamorad/cv-tailor
brew install cv-tailor
cv-tailor
```

`cv-tailor` starts the app in the background (if it isn't already running)
and opens it in your default browser. Ollama is a separate dependency —
`brew install ollama && ollama serve` if you don't already have it running.

### From source

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) (or whatever port the dev server prints).

### Running with Docker

A `docker-compose.yml` and `Dockerfile` are included as a secondary,
community-convenience path — not the primary documented workflow above, and
not as thoroughly exercised. It runs Ollama and the app as two services:

```bash
docker compose up --build
```

Then open [http://localhost:3000](http://localhost:3000); Ollama runs at
`http://ollama:11434` inside the compose network, with model downloads
persisted in a named volume.

GPU acceleration for Ollama inside Docker requires extra host configuration
(NVIDIA Container Toolkit, or Apple Silicon passthrough limitations) that
this compose file does not set up — see
[Ollama's own Docker docs](https://github.com/ollama/ollama/blob/main/docs/docker.md)
for that. Without it, generation runs on CPU inside the container, which is
noticeably slower than running Ollama natively on the host.

## Tech stack

Next.js (App Router) · TypeScript · Tailwind CSS · Ollama · Zod · `docx` · `pdfmake` · `unpdf` · `mammoth`

## Cleaning up

The app itself is just a Node project — deleting the `cv-tailor` folder removes it entirely. The models it downloaded live in Ollama's own data directory, separate from the app, so they need their own cleanup:

**Remove just the models this app pulled** (keeps Ollama installed for other uses):

```bash
ollama list                 # see what's installed
ollama rm qwen2.5:1.5b      # remove one by name
ollama rm llama3.2:3b qwen2.5:3b qwen2.5:7b   # or several at once
```

**Remove every model Ollama has** (still keeps Ollama itself installed):

```bash
ollama list | tail -n +2 | awk '{print $1}' | xargs -n1 ollama rm
```

**Uninstall Ollama entirely** (macOS, if you don't need it for anything else): quit it from the menu bar, then:

```bash
sudo rm -rf /Applications/Ollama.app
rm -rf ~/.ollama                                              # models + config, can be tens of GB
rm -rf ~/Library/Application\ Support/Ollama
```

## Troubleshooting

**"Couldn't reach Ollama" error**
Ollama isn't running, or isn't reachable on the port the app expects (`localhost:11434`). Start it with `ollama serve` (or launch the Ollama app) and try again.

**A model pull or generation seems stuck**
The first generation with a given model includes a cold load into memory, which can take a while — especially for larger models (7B) or slower hardware (Intel Macs, weaker GPUs). Give it a minute or two before assuming it's hung; subsequent generations with the same model are faster since it stays loaded.

**"Unknown model" error**
The app's curated model list and Ollama's installed models can get out of sync (e.g. you removed a model with `ollama rm` in another terminal). Refresh the page to re-sync the picker with what's actually installed.

**PDF/DOCX upload failing**
Only `.pdf` and `.docx` files are supported — `.doc` (old Word format) and other file types aren't. If the extension is right and it's still failing, the file itself may be corrupted or password-protected; try opening it in another app first to confirm it's readable.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for local setup and pre-PR checks, and [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) for how the pieces fit together. This project follows the [Contributor Covenant](./CODE_OF_CONDUCT.md).

## Security

This app is designed for `localhost` only and has no authentication — see [SECURITY.md](./SECURITY.md) before exposing it any other way, and for how to report a vulnerability.

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for release notes.

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=adamorad/cv-tailor&type=Date)](https://star-history.com/#adamorad/cv-tailor&Date)

## Credits

Built with:

- [Next.js](https://nextjs.org) — the app framework
- [Ollama](https://ollama.com) — runs the local LLM
- [Zod](https://zod.dev) — the `Cv` schema, request validation, and JSON schema generation for structured output
- [docx](https://docx.js.org) — DOCX export
- [pdfmake](https://pdfmake.org) — PDF export
- [unpdf](https://github.com/unjs/unpdf) — PDF text extraction
- [mammoth](https://github.com/mwilliamson/mammoth.js) — DOCX text extraction
- [Tailwind CSS](https://tailwindcss.com) — styling

## License

MIT — see [LICENSE](./LICENSE).
