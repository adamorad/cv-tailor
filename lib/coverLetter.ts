import { ollama, GenerationAbortedError } from "./llm";
import type { Cv } from "./schema";

const SYSTEM_PROMPT = `You write a short, professional cover letter for a job application, using only facts already present in the candidate's CV (provided as JSON) — do not invent employers, titles, dates, or achievements not in that CV.

Rules:
- 3-4 short paragraphs: an opening naming the role, a middle drawing 1-2 concrete connections between the candidate's actual experience and the job description, and a brief closing.
- Address the letter to the hiring team at the company if the job description names the company; otherwise use a neutral greeting like "Dear Hiring Manager," rather than a placeholder like "[Company Name]".
- Plain prose only — no markdown, no bullet points, no subject line, no placeholder brackets.
- Sign off with the candidate's name from the CV.`;

/**
 * One LLM call: writes a cover letter from an already-tailored `Cv` and the
 * job description. Throws a `GenerationAbortedError` if `signal` fires
 * before the model finishes.
 */
export async function generateCoverLetter(
  model: string,
  cv: Cv,
  jobDescription: string,
  signal?: AbortSignal,
): Promise<string> {
  const start = Date.now();
  let content = "";
  try {
    const stream = await ollama.chat({
      model,
      stream: true,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `CANDIDATE CV (JSON):\n${JSON.stringify(cv)}\n\nJOB DESCRIPTION:\n${jobDescription}`,
        },
      ],
    });
    if (signal?.aborted) stream.abort();
    else
      signal?.addEventListener("abort", () => stream.abort(), { once: true });

    for await (const chunk of stream) {
      content += chunk.message.content;
    }
  } catch (err) {
    if (signal?.aborted) {
      console.log(
        `[cv-tailor] cover-letter: aborted model=${model} ms=${Date.now() - start}`,
      );
      throw new GenerationAbortedError();
    }
    throw err;
  }
  return content.trim();
}
