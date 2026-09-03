import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/llm", () => ({
  ollama: { list: vi.fn(), pull: vi.fn() },
  friendlyOllamaError: vi.fn(() => "friendly error"),
}));

import { ollama } from "@/lib/llm";
import { CURATED_MODELS } from "@/lib/models";
import { GET, POST } from "../route";

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/models", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("GET /api/models", () => {
  it("returns curated models with downloaded status", async () => {
    vi.mocked(ollama.list).mockResolvedValueOnce({
      models: [{ model: CURATED_MODELS[0].id }],
    } as Awaited<ReturnType<typeof ollama.list>>);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.models).toHaveLength(CURATED_MODELS.length);
    expect(body.models[0]).toEqual({ ...CURATED_MODELS[0], downloaded: true });
    expect(body.models[1].downloaded).toBe(false);
  });

  it("returns 502 when ollama is unreachable", async () => {
    vi.mocked(ollama.list).mockRejectedValueOnce(new Error("ECONNREFUSED"));
    const res = await GET();
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: "friendly error" });
  });
});

describe("POST /api/models", () => {
  it("rejects invalid JSON body", async () => {
    const res = await POST(makeRequest("not json"));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid JSON body" });
  });

  it("rejects an unknown model", async () => {
    const res = await POST(makeRequest({ model: "not-a-model" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Unknown model" });
  });

  it("rejects a missing model", async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Unknown model" });
  });

  it("streams ndjson progress chunks on success", async () => {
    async function* progress() {
      yield { status: "pulling manifest" };
      yield { status: "success" };
    }
    vi.mocked(ollama.pull).mockResolvedValueOnce(
      progress() as unknown as Awaited<ReturnType<typeof ollama.pull>>,
    );

    const res = await POST(makeRequest({ model: CURATED_MODELS[0].id }));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/x-ndjson");

    const text = await res.text();
    const lines = text
      .trim()
      .split("\n")
      .map((l) => JSON.parse(l));
    expect(lines).toEqual([
      { status: "pulling manifest" },
      { status: "success" },
    ]);
  });

  it("emits an error chunk when the pull fails partway through", async () => {
    vi.mocked(ollama.pull).mockRejectedValueOnce(new Error("boom"));
    const res = await POST(makeRequest({ model: CURATED_MODELS[0].id }));
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(JSON.parse(text.trim())).toEqual({
      status: "error",
      error: "friendly error",
    });
  });
});
