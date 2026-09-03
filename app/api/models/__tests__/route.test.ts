import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/diskSpace", () => ({
  getAvailableBytes: vi.fn(),
}));

vi.mock("@/lib/llm", () => ({
  ollama: { list: vi.fn(), pull: vi.fn() },
  friendlyOllamaError: vi.fn(() => "friendly error"),
}));

import { ollama } from "@/lib/llm";
import { CURATED_MODELS } from "@/lib/models";
import { getAvailableBytes } from "@/lib/diskSpace";
import { GET, POST } from "../route";

const PLENTY_OF_SPACE = 100 * 1024 ** 3;

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
    vi.mocked(getAvailableBytes).mockResolvedValueOnce(PLENTY_OF_SPACE);
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
    vi.mocked(getAvailableBytes).mockResolvedValueOnce(PLENTY_OF_SPACE);
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

describe("POST /api/models — disk space check", () => {
  it("rejects with 400 when free space is under size + margin", async () => {
    vi.mocked(getAvailableBytes).mockResolvedValueOnce(1 * 1024 ** 3);

    const res = await POST(makeRequest({ model: "qwen2.5:7b" }));

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/not enough disk space/i);
    expect(data.error).toMatch(/qwen 2\.5 7b/i);
  });

  it("does not reject when free space clears size + margin", async () => {
    vi.mocked(getAvailableBytes).mockResolvedValueOnce(PLENTY_OF_SPACE);
    vi.mocked(ollama.pull).mockResolvedValueOnce(
      (async function* () {
        yield { status: "success" };
      })() as unknown as Awaited<ReturnType<typeof ollama.pull>>,
    );

    const res = await POST(makeRequest({ model: "qwen2.5:1.5b" }));

    expect(res.status).toBe(200);
  });
});
