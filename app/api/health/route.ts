import { ollama } from "@/lib/llm";

/** Reports whether the app can reach its local Ollama server. For scripting/monitoring, not the UI. */
export async function GET() {
  try {
    await ollama.list();
    return Response.json({ status: "ok", ollama: "reachable" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json(
      { status: "degraded", ollama: "unreachable", error: message },
      { status: 503 },
    );
  }
}
