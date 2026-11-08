import { Ollama } from "ollama";
import { z } from "zod";
import { cvSchema, fitToOnePage, type Cv } from "./schema";

export const ollama = new Ollama({ host: "http://localhost:11434" });

const SYSTEM_PROMPT = `You are a CV tailoring assistant. Given a candidate's existing CV and a target job description, produce a tailored version of the CV as structured JSON matching the provided schema.

Truthfulness:
- Do not invent experience, employers, titles, dates, metrics, or skills the candidate does not have. Only reorder, re-emphasize, rephrase, and select from what's in the source CV.
- Never invent a number. Only quantify a bullet (%, $, counts, time saved) if the source CV already states or clearly implies that figure.
- Never move an achievement bullet to a different employer than the one it appears under in the source CV. Rephrasing a bullet must not change which job it belongs to, and must not add a technology or detail the source didn't mention for that job.

Keyword and skill matching:
- Group the candidate's skills into 3-5 short, concrete categories (e.g. "Data Platforms & Orchestration", "Databases & Performance Engineering") — reuse the source CV's own groupings if it has them, otherwise infer sensible ones from context. Never invent a skill that isn't in the source CV.
- Within each group and across groups, foreground what's most relevant to the job description first.
- Where the candidate's own experience genuinely matches a term the job description uses, prefer the job description's terminology (e.g. "CI/CD pipelines" vs "build automation") — but only when it's an honest description of what they did, never to paper over a gap.
- Keep the summary truthful but framed toward the job description and the seniority level it implies.

Writing quality:
- Start each bullet with a strong past-tense action verb for past roles, present tense for the current role. Avoid weak openers like "Responsible for" or "Worked on".
- Cut filler adjectives ("passionate", "hard-working", "dynamic") and empty phrases. Every bullet should state what was done and, where truthfully known, its outcome.
- Keep bullets concise — one line of impact, not a run-on sentence.
- Order experience bullets within each role by relevance to the job description, most relevant first.

Length — the result must fit on a single printed page:
- Summary: 3-4 sentences, no more.
- Most recent 1-2 roles: at most 5-6 bullets each. Older roles: at most 2-3 bullets each, keeping only what's most relevant to the job description.
- List at most 4-5 roles total; omit the least relevant older roles if the candidate has more than that.
- Keep each skill group to at most 6-8 items.

Formatting:
- Leave a field as an empty string or empty array if the source CV has nothing for it.
- Output must be valid JSON matching the schema exactly — no markdown, no commentary.`;

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
    return fitToOnePage(cvSchema.parse(parsed));
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
