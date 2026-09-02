# 2. One structured JSON object as the model's output

## Status

Accepted

## Context

The app needs to export a tailored CV in five formats: Markdown, plain text,
HTML, DOCX, and PDF. The model could be asked to generate each format
directly, but five separate (or five parsed-out) generations of the same
content risk drifting from each other — different wording, different section
ordering, one format missing a bullet the others have.

## Decision

Generation asks the model for exactly one structured JSON object per the
`Cv` Zod schema (`lib/schema.ts`), using `format: z.toJSONSchema(cvSchema)`
to constrain Ollama's output. All five export formats, plus the on-screen
preview, are pure, deterministic functions from that one `Cv` object
(`lib/render/*.ts`) — see [docs/ARCHITECTURE.md](../ARCHITECTURE.md) and the
README's "How it works" section.

## Consequences

- The five export formats and the preview can never drift from each other —
  they're all views of the same source of truth, not five independent
  generations.
- Rendering is ordinary deterministic code with no LLM involvement, so it's
  fast, free, and unit-testable without a model running.
- The model's raw response is still `JSON.parse`d and re-validated with
  `cvSchema.parse` as a safety net, since schema-constrained output from a
  small/weak model is a strong steer, not a hard guarantee.
