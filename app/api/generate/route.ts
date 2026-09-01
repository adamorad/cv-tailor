import { generateTailoredCv, friendlyOllamaError } from "@/lib/llm";
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

  if (!CURATED_MODELS.some((m) => m.id === model)) {
    return Response.json({ error: "Unknown model" }, { status: 400 });
  }

  try {
    const cv = await generateTailoredCv(model, cvText, jobDescription);
    return Response.json({ cv });
  } catch (err) {
    return Response.json({ error: friendlyOllamaError(err) }, { status: 502 });
  }
}
