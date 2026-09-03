import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/diskSpace", () => ({
  getAvailableBytes: vi.fn(),
}));

vi.mock("@/lib/llm", () => ({
  ollama: { pull: vi.fn() },
  friendlyOllamaError: (err: unknown) => String(err),
}));

import { POST } from "../route";
import { getAvailableBytes } from "@/lib/diskSpace";

describe("POST /api/models — disk space check", () => {
  it("rejects with 400 when free space is under size + margin", async () => {
    vi.mocked(getAvailableBytes).mockResolvedValue(1 * 1024 ** 3);

    const res = await POST(
      new Request("http://localhost/api/models", {
        method: "POST",
        body: JSON.stringify({ model: "qwen2.5:7b" }),
      }),
    );

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/not enough disk space/i);
    expect(data.error).toMatch(/qwen 2\.5 7b/i);
  });

  it("does not reject when free space clears size + margin", async () => {
    vi.mocked(getAvailableBytes).mockResolvedValue(100 * 1024 ** 3);

    const res = await POST(
      new Request("http://localhost/api/models", {
        method: "POST",
        body: JSON.stringify({ model: "qwen2.5:1.5b" }),
      }),
    );

    expect(res.status).toBe(200);
  });
});
