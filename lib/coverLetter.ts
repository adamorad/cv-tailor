import { ollama } from "./llm";
import type { Cv } from "./schema";

const SYSTEM_PROMPT = `You write a short, professional cover letter for a job application, using only facts already present in the candidate's CV (provided as JSON) — do not invent employers, titles, dates, or achievements not in that CV.

Rules:
- 3-4 short paragraphs: an opening naming the role, a middle drawing 1-2 concrete connections between the candidate's actual experience and the job description, and a brief closing.
- Address the letter to the hiring team at the company if the job description names the company; otherwise use a neutral greeting like "Dear Hiring Manager," rather than a placeholder like "[Company Name]".
- Plain prose only — no markdown, no bullet points, no subject line, no placeholder brackets.
- Sign off with the candidate's name from the CV.`;

/** One LLM call: writes a cover letter from an already-tailored `Cv` and the job description. */
export async function generateCoverLetter(
  model: string,
  cv: Cv,
  jobDescription: string,
): Promise<string> {
  const response = await ollama.chat({
    model,
    stream: false,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `CANDIDATE CV (JSON):\n${JSON.stringify(cv)}\n\nJOB DESCRIPTION:\n${jobDescription}`,
      },
    ],
  });
  return response.message.content.trim();
}
