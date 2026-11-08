import { ollama, friendlyOllamaError } from "@/lib/llm";
import { CURATED_MODELS } from "@/lib/models";

/** Ollama tags this model as embedding-only (no chat/completion support). */
function isEmbeddingOnly(model: {
  capabilities?: string[];
  model: string;
}): boolean {
  if (model.capabilities) return !model.capabilities.includes("completion");
  return /embed/i.test(model.model);
}

function formatExtraLabel(id: string): string {
  const [name, tag] = id.split(":");
  const words = name.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return tag && tag !== "latest" ? `${words} (${tag})` : words;
}

export async function GET() {
  try {
    const { models: installedModels } = await ollama.list();
    const installed = new Set(installedModels.map((m) => m.model));
    const curatedIds = new Set(CURATED_MODELS.map((m) => m.id));

    const curated = CURATED_MODELS.map((m) => ({
      ...m,
      downloaded: installed.has(m.id),
    }));

    // Any other chat-capable model already on this machine, so the picker
    // reflects what's actually installed instead of only the curated list.
    const extras = installedModels
      .filter((m) => !curatedIds.has(m.model) && !isEmbeddingOnly(m))
      .map((m) => ({
        id: m.model,
        label: formatExtraLabel(m.model),
        sizeGb: Math.round((m.size / 1e9) * 10) / 10,
        description: "Already installed on this machine.",
        downloaded: true,
      }));

    return Response.json({ models: [...curated, ...extras] });
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
