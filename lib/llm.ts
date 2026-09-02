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

/**
 * Makes the app's one LLM call: asks the model to tailor `cvText` toward
 * `jobDescription`, constrained to the `Cv` JSON schema. Throws if the
 * response can't be parsed or doesn't validate against `cvSchema`.
 */
export async function generateTailoredCv(
  model: string,
  cvText: string,
  jobDescription: string,
): Promise<Cv> {
  const response = await ollama.chat({
    model,
    stream: false,
    format: z.toJSONSchema(cvSchema),
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `SOURCE CV:\n${cvText}\n\nJOB DESCRIPTION:\n${jobDescription}`,
      },
    ],
  });

  try {
    const parsed = JSON.parse(response.message.content);
    return cvSchema.parse(parsed);
  } catch {
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
