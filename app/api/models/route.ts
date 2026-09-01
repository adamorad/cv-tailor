import { ollama, friendlyOllamaError } from "@/lib/llm";
import { CURATED_MODELS } from "@/lib/models";

export async function GET() {
  try {
    const { models } = await ollama.list();
    const installed = new Set(models.map((m) => m.model));
    const withStatus = CURATED_MODELS.map((m) => ({
      ...m,
      downloaded: installed.has(m.id),
    }));
    return Response.json({ models: withStatus });
  } catch (err) {
    return Response.json({ error: friendlyOllamaError(err) }, { status: 502 });
  }
}

export async function POST(request: Request) {
  let body: { model?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { model } = body;
  if (!model || !CURATED_MODELS.some((m) => m.id === model)) {
    return Response.json({ error: "Unknown model" }, { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const progress = await ollama.pull({ model, stream: true });
        for await (const chunk of progress) {
          controller.enqueue(encoder.encode(JSON.stringify(chunk) + "\n"));
        }
      } catch (err) {
        controller.enqueue(
          encoder.encode(
            JSON.stringify({
              status: "error",
              error: friendlyOllamaError(err),
            }) + "\n",
          ),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson" },
  });
}
