# 3. No streamed preview of in-progress generation

## Status

Accepted

## Context

`generateTailoredCv` and `generateCoverLetter` (`lib/llm.ts`, `lib/coverLetter.ts`)
both call `ollama.chat({ stream: true, ... })`. That streaming is purely an
internal implementation detail: the `ollama` client only exposes an abort
hook (`stream.abort()`) on the stream object the call eventually resolves
to, not on the initial request itself, so `stream: true` is what makes
cancellation (the client's Cancel button, via an `AbortSignal`) and a
wall-clock timeout (`withTimeout`'s `AbortSignal.any([signal,
AbortSignal.timeout(...)])`) possible in the first place — see
[docs/ARCHITECTURE.md](../ARCHITECTURE.md)'s "Generation" section. Both
functions accumulate the streamed chunks into `content` in a `for await`
loop and only return once the stream ends; nothing about that has anything
to do with showing partial output to the user. It's about being able to
stop a hung or unwanted request, not about progressive rendering.

The UI reflects this: `components/GenerationProgress.tsx` shows a synthetic
"trickle" bar that eases toward 90% on a fixed time constant and holds
there until the request resolves, explicitly because "Ollama's chat API
gives no incremental progress for a single completion" — it does not, and
was never meant to, represent real per-token progress.

## Decision

Partial/in-progress generation content is never sent to the client. The
`for await` loop in `lib/llm.ts` and `lib/coverLetter.ts` stays entirely
server-side; `app/api/generate/route.ts` and `app/api/cover-letter/route.ts`
return a single JSON response only after the whole stream has been consumed,
parsed, and (for the CV) validated against `cvSchema`. The client only ever
sees the final, complete result — never a token, a partial JSON fragment, or
a partial cover-letter sentence.

## Consequences

- A tailored CV is a single structured `Cv` object validated against
  `cvSchema` (ADR 2), not free text — a partial JSON object mid-generation
  isn't meaningfully renderable as a CV preview. You can't cleanly show
  "half a bullet point," and streaming raw JSON tokens to a UI that expects
  a complete, schema-validated object would require real client-side
  partial-JSON-parsing complexity (tracking which fields are structurally
  complete enough to render vs. mid-token) to buy a preview of a document
  that, per the README's benchmark numbers, usually finishes in well under
  a minute (11-50s across the curated models on a Mac mini M4/16GB) for a
  local, single-user tool. That complexity didn't seem worth it here.
- The cover letter is plain text (no `format`/JSON schema constraint,
  unlike CV generation), which could stream more naturally token-by-token
  without any partial-parsing problem. It currently doesn't, for
  consistency with CV generation and because `generateCoverLetter` reuses
  the same accumulate-then-return call pattern in `lib/llm.ts`.
- The tradeoff: no live "typing" feedback during generation, which is a
  familiar, reassuring pattern in other AI tools. The user has to trust
  `GenerationProgress`'s synthetic bar rather than seeing real evidence
  that work is happening. If generation is unusually slow (a large model
  on modest hardware, well past the benchmarked range), the wait feels more
  dead than a token-by-token view would.
- This could be revisited. Streaming the cover letter's plain text to the
  client would be more tractable than streaming structured CV JSON, since
  it has no schema to satisfy before it's renderable — if the tradeoff
  above is ever reconsidered, that's the smaller change.
