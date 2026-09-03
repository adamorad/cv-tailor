import {
  generateTailoredCv,
  friendlyOllamaError,
  GenerationAbortedError,
  GenerationTimeoutError,
} from "@/lib/llm";
import {
  withGenerationLock,
  GenerationInProgressError,
} from "@/lib/concurrencyGuard";
import { CURATED_MODELS } from "@/lib/models";

export async function POST(request: Request) {
  let body: { cvText?: string; jobDescription?: string; model?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { cvText, jobDescription, model } = body;

  if (!cvText || !jobDescription || !model) {
    return Response.json(
      { error: "cvText, jobDescription, and model are all required" },
      { status: 400 },
    );
  }

  const MAX_LENGTH = 50_000;
  if (cvText.length > MAX_LENGTH || jobDescription.length > MAX_LENGTH) {
    return Response.json(
      {
        error: `cvText and jobDescription must each be under ${MAX_LENGTH} characters`,
      },
      { status: 400 },
    );
  }

  if (!CURATED_MODELS.some((m) => m.id === model)) {
    return Response.json({ error: "Unknown model" }, { status: 400 });
  }

  try {
    const cv = await withGenerationLock(() =>
      generateTailoredCv(model, cvText, jobDescription, request.signal),
    );
    return Response.json({ cv });
  } catch (err) {
    if (err instanceof GenerationInProgressError) {
      return Response.json({ error: err.message }, { status: 409 });
    }
    if (err instanceof GenerationAbortedError) {
      // Client already disconnected — nothing to deliver a body to.
      return new Response(null, { status: 499 });
    }
    if (err instanceof GenerationTimeoutError) {
      // Client is still waiting — give it a real error, unlike the cancel case above.
      return Response.json({ error: err.message }, { status: 504 });
    }
    return Response.json({ error: friendlyOllamaError(err) }, { status: 502 });
  }
}
