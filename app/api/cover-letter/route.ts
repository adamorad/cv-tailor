import { generateCoverLetter } from "@/lib/coverLetter";
import { friendlyOllamaError } from "@/lib/llm";
import { cvSchema } from "@/lib/schema";
import { CURATED_MODELS } from "@/lib/models";

const MAX_LENGTH = 50_000;

export async function POST(request: Request) {
  let body: { cv?: unknown; jobDescription?: string; model?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsedCv = cvSchema.safeParse(body.cv);
  if (!parsedCv.success) {
    return Response.json({ error: "Invalid CV payload" }, { status: 400 });
  }

  const { jobDescription, model } = body;
  if (!jobDescription || !model) {
    return Response.json(
      { error: "jobDescription and model are required" },
      { status: 400 },
    );
  }
  if (jobDescription.length > MAX_LENGTH) {
    return Response.json(
      { error: `jobDescription must be under ${MAX_LENGTH} characters` },
      { status: 400 },
    );
  }
  if (!CURATED_MODELS.some((m) => m.id === model)) {
    return Response.json({ error: "Unknown model" }, { status: 400 });
  }

  try {
    const letter = await generateCoverLetter(
      model,
      parsedCv.data,
      jobDescription,
    );
    return Response.json({ letter });
  } catch (err) {
    return Response.json({ error: friendlyOllamaError(err) }, { status: 502 });
  }
}
