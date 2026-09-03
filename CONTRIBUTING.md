# Contributing

## Setup

```bash
git clone https://github.com/adamorad/cv-tailor.git
cd cv-tailor
npm install
```

You also need [Ollama](https://ollama.com) installed and running locally:

```bash
ollama serve
```

Then start the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) (or whatever port the dev server prints).

## Testing changes manually

There's no build step needed to test a change — just run `npm run dev` and use the UI against a real local model. Pick one of the curated models in the model picker (the smallest, Qwen 2.5 1.5B, is fastest to pull and iterate with) and run a real generation to see your change in effect.

## Testing and Ollama

The automated test suite never needs a real Ollama server: `npm test` mocks
the `ollama` client entirely (see `app/api/*/__tests__/route.test.ts` and
`lib/__tests__/*.test.ts` — every call to `ollama.chat`/`.list`/`.pull`/
`.delete` is a `vi.mock`), and `npm run test:e2e` intercepts `/api/models`,
`/api/health`, `/api/generate`, `/api/cover-letter`, and `/api/export` at the
network level via Playwright's `page.route` (see `e2e/*.spec.ts`). Both
commands work with zero Ollama setup — don't install or start Ollama just to
run the test suite.

You only need a real Ollama server for manual end-to-end verification of a
UI flow (paste CV/JD, generate, verify output), which the mocked test suite
doesn't cover:

```bash
ollama serve
ollama pull qwen2.5:1.5b   # smallest/fastest curated model, ~14s per generation — see README's "Choosing a model"
npm run dev
```

Then walk through the flow at `http://localhost:3000` against the real
model. Use `qwen2.5:1.5b` for fast iteration; its tailoring quality is lower
than the bigger curated models, so don't judge prompt-quality changes by it
alone — see README's "Choosing a model" for real generation-time benchmarks
across the curated set.

If something looks broken and you're not sure whether it's the app or
Ollama, rule Ollama in or out first:

```bash
curl -s localhost:11434/api/tags   # real Ollama server directly
curl -s localhost:3000/api/health  # the app's own reachability check
```

## Before opening a PR

Run these and make sure they all pass:

```bash
npm run lint
npx tsc --noEmit
npm run build
```

Also run `npm test` if a test suite exists at the time you read this — it may or may not have landed yet.

If your change touches `lib/llm.ts` (the system prompt), typecheck and lint won't catch a regression in prompt behavior — manually re-verify it against a real generation with Ollama running before opening the PR.

## Code style

Match the existing code style. No comments unless they explain non-obvious _why_, not _what_. Avoid adding abstraction that isn't needed for the change at hand.

## Pre-commit hook

`npm install` sets up a Husky pre-commit hook automatically, which runs `eslint --fix` on staged `*.ts`/`*.tsx` files via lint-staged. No extra setup needed.

We recommend (but don't require) writing commit messages in [Conventional Commits](https://www.conventionalcommits.org/) style (`feat:`, `fix:`, `docs:`, etc.) — the release workflow's auto-generated notes read better with them.
