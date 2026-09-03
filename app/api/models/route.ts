import { tmpdir } from "node:os";
import { ollama, friendlyOllamaError } from "@/lib/llm";
import { CURATED_MODELS } from "@/lib/models";
import { getAvailableBytes } from "@/lib/diskSpace";

const GB = 1024 ** 3;
// sizeGb is approximate and Ollama needs temp/working space during extraction.
const PULL_SAFETY_MARGIN_GB = 1;

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
  const modelOption = CURATED_MODELS.find((m) => m.id === model);
  if (!modelOption) {
    return Response.json({ error: "Unknown model" }, { status: 400 });
  }

  try {
    const requiredBytes = (modelOption.sizeGb + PULL_SAFETY_MARGIN_GB) * GB;
    const availableBytes = await getAvailableBytes(tmpdir());
    if (availableBytes < requiredBytes) {
      const availableGb = (availableBytes / GB).toFixed(1);
      return Response.json(
        {
          error: `Not enough disk space to download ${modelOption.label} (~${modelOption.sizeGb}GB needed, ~${availableGb}GB free).`,
        },
        { status: 400 },
      );
    }
  } catch {
    // Disk space check is best-effort; don't block a pull if it fails.
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const progress = await ollama.pull({
          model: modelOption.id,
          stream: true,
        });
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
