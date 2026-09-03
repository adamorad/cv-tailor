import { Ollama } from "ollama";
import { z } from "zod";
import { cvSchema, type Cv } from "./schema";

/** Shared Ollama client. Defaults to localhost; override with `OLLAMA_HOST` (e.g. for Docker). */
export const ollama = new Ollama({
  host: process.env.OLLAMA_HOST ?? "http://localhost:11434",
});

const SYSTEM_PROMPT = `You are a CV tailoring assistant. Given a candidate's existing CV and a target job description, produce a tailored version of the CV as structured JSON matching the provided schema.

Truthfulness:
- Do not invent experience, employers, titles, dates, metrics, or skills the candidate does not have. Only reorder, re-emphasize, rephrase, and select from what's in the source CV.
- Never invent a number. Only quantify a bullet (%, $, counts, time saved) if the source CV already states or clearly implies that figure.
- Never move an achievement bullet to a different employer than the one it appears under in the source CV. Rephrasing a bullet must not change which job it belongs to, and must not add a technology or detail the source didn't mention for that job.
- Never invent contact details. Copy email, phone, location, and links (e.g. LinkedIn, GitHub, a portfolio site) verbatim from the source CV only if present; if the source CV doesn't include one, leave it empty. Do not guess a URL from the candidate's name.

Keyword and skill matching:
- Reorder and rewrite the skills list and experience bullets to foreground what's most relevant to the job description.
- Where the candidate's own experience genuinely matches a term the job description uses, prefer the job description's terminology (e.g. "CI/CD pipelines" vs "build automation") — but only when it's an honest description of what they did, never to paper over a gap.
- Keep the summary truthful but framed toward the job description and the seniority level it implies.

Writing quality:
- Start each bullet with a strong past-tense action verb for past roles, present tense for the current role. Avoid weak openers like "Responsible for" or "Worked on".
- Cut filler adjectives ("passionate", "hard-working", "dynamic") and empty phrases. Every bullet should state what was done and, where truthfully known, its outcome.
- Keep bullets concise — one line of impact, not a run-on sentence.
- Order experience bullets within each role by relevance to the job description, most relevant first.

Formatting:
- Keep each field to only what it's for: "role" is the job title alone (never the company or dates appended to it), "company" is the employer name alone. Don't concatenate fields together.
- Leave a field as an empty string or empty array if the source CV has nothing for it.
- Output must be valid JSON matching the schema exactly — no markdown, no commentary.`;

/** Thrown instead of a normal error when generation was cancelled via `signal`. */
export class GenerationAbortedError extends Error {
  constructor() {
    super("Generation was cancelled");
    this.name = "GenerationAbortedError";
  }
}

/** Thrown instead of a normal error when generation hit its wall-clock timeout, as opposed to being cancelled by the caller. */
export class GenerationTimeoutError extends Error {
  constructor() {
    super(
      "Ollama didn't respond in time — it may be stuck; try restarting it or picking a different model.",
    );
    this.name = "GenerationTimeoutError";
  }
}

// A 7B model has taken 30s+ in manual testing on modest hardware; this leaves
// generous headroom while still bounding a genuinely hung request.
const GENERATION_TIMEOUT_MS = 4 * 60_000;

/**
 * Combines an optional caller `signal` with a wall-clock timeout, so a hung
 * Ollama call still gives up on its own. `AbortSignal.any` needs an array of
 * actual signals, so the timeout is always included and the caller signal
 * only when present.
 */
export function withTimeout(
  signal: AbortSignal | undefined,
  timeoutMs: number,
): AbortSignal {
  const timeout = AbortSignal.timeout(timeoutMs);
  return signal ? AbortSignal.any([signal, timeout]) : timeout;
}

/** True if `signal` (from `withTimeout`) aborted because its timeout fired, not because the caller cancelled it. */
export function isTimeoutAbort(signal: AbortSignal): boolean {
  return (
    signal.reason instanceof DOMException &&
    signal.reason.name === "TimeoutError"
  );
}

/**
 * Rejects with `signal`'s abort reason as soon as it fires, without waiting
 * for `promise`. Needed because `ollama.chat()`'s initial request has no way
 * to accept an external abort signal — only the stream it eventually
 * resolves to does — so without this, a hang before that resolution
 * (connection accepted but no response ever sent) can't be timed out.
 */
export function raceSignal<T>(
  promise: Promise<T>,
  signal: AbortSignal,
): Promise<T> {
  if (signal.aborted) return Promise.reject(signal.reason);
  return new Promise<T>((resolve, reject) => {
    signal.addEventListener("abort", () => reject(signal.reason), {
      once: true,
    });
    promise.then(resolve, reject);
  });
}

/**
 * Makes the app's one LLM call: asks the model to tailor `cvText` toward
 * `jobDescription`, constrained to the `Cv` JSON schema. Throws if the
 * response can't be parsed or doesn't validate against `cvSchema`, a
 * `GenerationAbortedError` if `signal` fires before the model finishes, or a
 * `GenerationTimeoutError` if it hasn't finished within `GENERATION_TIMEOUT_MS`.
 */
export async function generateTailoredCv(
  model: string,
  cvText: string,
  jobDescription: string,
  signal?: AbortSignal,
): Promise<Cv> {
  const start = Date.now();
  // Local-only: logs metadata (model, timing, outcome), never CV/JD content.
  console.log(`[cv-tailor] generate: start model=${model}`);

  const combinedSignal = withTimeout(signal, GENERATION_TIMEOUT_MS);

  let content = "";
  try {
    const stream = await raceSignal(
      ollama.chat({
        model,
        stream: true,
        format: z.toJSONSchema(cvSchema),
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `SOURCE CV:\n${cvText}\n\nJOB DESCRIPTION:\n${jobDescription}`,
          },
        ],
      }),
      combinedSignal,
    );
    if (combinedSignal.aborted) stream.abort();
    else
      combinedSignal.addEventListener("abort", () => stream.abort(), {
        once: true,
      });

    for await (const chunk of stream) {
      content += chunk.message.content;
    }
  } catch (err) {
    if (combinedSignal.aborted) {
      if (isTimeoutAbort(combinedSignal)) {
        console.log(
          `[cv-tailor] generate: timed-out model=${model} ms=${Date.now() - start}`,
        );
        throw new GenerationTimeoutError();
      }
      console.log(
        `[cv-tailor] generate: aborted model=${model} ms=${Date.now() - start}`,
      );
      throw new GenerationAbortedError();
    }
    const message = err instanceof Error ? err.message : String(err);
    console.log(
      `[cv-tailor] generate: failed model=${model} ms=${Date.now() - start} error=${message}`,
    );
    if (/does not support|not supported|unsupported/i.test(message)) {
      throw new Error(
        `${model} doesn't support structured output, which this app requires. Try a different model from the picker.`,
      );
    }
    throw err;
  }

  try {
    const parsed = JSON.parse(content);
    const cv = cvSchema.parse(parsed);
    console.log(
      `[cv-tailor] generate: ok model=${model} ms=${Date.now() - start}`,
    );
    return cv;
  } catch {
    console.log(
      `[cv-tailor] generate: bad-schema model=${model} ms=${Date.now() - start}`,
    );
    throw new Error(
      `${model} returned a response that didn't match the expected CV structure. Try again, or pick a different model.`,
    );
  }
}

/** Maps a low-level fetch/Ollama error to a message a user can act on. */
export function friendlyOllamaError(err: unknown): string {
  const message = err instanceof Error ? err.message : "Unknown error";
  if (/ECONNREFUSED|fetch failed/i.test(message)) {
    return "Couldn't reach Ollama at localhost:11434 — make sure it's running (`ollama serve`).";
  }
  return message;
}
