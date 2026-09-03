import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/llm", () => ({
  ollama: { list: vi.fn() },
}));

import { ollama } from "@/lib/llm";
import { GET } from "../route";

describe("GET /api/health", () => {
  it("returns ok when ollama is reachable", async () => {
    vi.mocked(ollama.list).mockResolvedValueOnce(
      {} as Awaited<ReturnType<typeof ollama.list>>,
    );
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok", ollama: "reachable" });
  });

  it("returns degraded when ollama is unreachable", async () => {
    vi.mocked(ollama.list).mockRejectedValueOnce(new Error("ECONNREFUSED"));
    const res = await GET();
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({
      status: "degraded",
      ollama: "unreachable",
      error: "ECONNREFUSED",
    });
  });
});
