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
