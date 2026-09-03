import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/coverLetter", () => ({
  generateCoverLetter: vi.fn(),
}));
vi.mock("@/lib/llm", () => ({
  friendlyOllamaError: vi.fn(() => "friendly error"),
  GenerationAbortedError: class GenerationAbortedError extends Error {},
}));

import { generateCoverLetter } from "@/lib/coverLetter";
import { POST } from "../route";

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/cover-letter", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

const validCv = {
  name: "Jane Doe",
  title: "Engineer",
  contact: { email: "", phone: "", location: "", links: [] },
  summary: "",
  skills: [],
  experience: [],
  education: [],
  certifications: [],
};

describe("POST /api/cover-letter", () => {
  it("rejects invalid JSON body", async () => {
    const res = await POST(makeRequest("not json"));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid JSON body" });
  });

  it("rejects an invalid cv payload", async () => {
    const res = await POST(
      makeRequest({
        cv: { bogus: true },
        jobDescription: "jd",
        model: "qwen2.5:3b",
      }),
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid CV payload" });
  });

  it("rejects a missing field", async () => {
    const res = await POST(makeRequest({ cv: validCv }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: "jobDescription and model are required",
    });
  });

  it("rejects an over-length jobDescription", async () => {
    const res = await POST(
      makeRequest({
        cv: validCv,
        jobDescription: "a".repeat(50_001),
        model: "qwen2.5:3b",
      }),
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: "jobDescription must be under 50000 characters",
    });
  });

  it("rejects an unknown model", async () => {
    const res = await POST(
      makeRequest({ cv: validCv, jobDescription: "jd", model: "not-a-model" }),
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Unknown model" });
  });

  it("returns 502 with a friendly message when generation fails", async () => {
    vi.mocked(generateCoverLetter).mockRejectedValueOnce(new Error("boom"));
    const res = await POST(
      makeRequest({ cv: validCv, jobDescription: "jd", model: "qwen2.5:3b" }),
    );
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: "friendly error" });
  });

  it("returns the generated letter on success", async () => {
    vi.mocked(generateCoverLetter).mockResolvedValueOnce(
      "Dear Hiring Manager,",
    );
    const res = await POST(
      makeRequest({ cv: validCv, jobDescription: "jd", model: "qwen2.5:3b" }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ letter: "Dear Hiring Manager," });
  });
});
