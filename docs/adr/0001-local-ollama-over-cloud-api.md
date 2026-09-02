# 1. Local Ollama over a cloud LLM API

## Status

Accepted

## Context

CV Tailor needs one LLM call to tailor a CV toward a job description. A CV
and the job description it's paired with are personal, often sensitive
documents. A cloud LLM API would require an API key, a per-call cost, and
sending that data to a third party.

## Decision

Generation calls a local Ollama server (`lib/llm.ts`) instead of a paid
cloud LLM API. There is no external network call anywhere in the app other
than to Ollama on `localhost` — see [docs/ARCHITECTURE.md](../ARCHITECTURE.md).

## Consequences

- No API key to configure, no per-call cost, and nothing about the user's CV
  or target job leaves their machine — this was the explicit design goal
  from `v0.1.0` (see `CHANGELOG.md`).
- Output quality and speed are bounded by whatever model the user's hardware
  can run locally, rather than a large hosted model — the curated model list
  and RAM guidance in the README exist to manage that trade-off.
- The app depends on the user having Ollama installed and running
  (`ollama serve`); there's no fallback cloud path.
