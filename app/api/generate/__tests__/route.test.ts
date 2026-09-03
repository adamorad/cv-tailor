import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/llm", () => ({
  generateTailoredCv: vi.fn(),
  friendlyOllamaError: vi.fn(() => "friendly error"),
  GenerationAbortedError: class GenerationAbortedError extends Error {},
  GenerationTimeoutError: class GenerationTimeoutError extends Error {},
}));

import { generateTailoredCv, GenerationTimeoutError } from "@/lib/llm";
import { POST } from "../route";

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/generate", {
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

describe("POST /api/generate", () => {
  it("rejects invalid JSON body", async () => {
    const res = await POST(makeRequest("not json"));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid JSON body" });
  });

  it("rejects a missing field", async () => {
    const res = await POST(makeRequest({ cvText: "cv", jobDescription: "jd" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: "cvText, jobDescription, and model are all required",
    });
  });

  it("rejects an over-length field", async () => {
    const res = await POST(
      makeRequest({
        cvText: "a".repeat(50_001),
        jobDescription: "jd",
        model: "qwen2.5:3b",
      }),
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: "cvText and jobDescription must each be under 50000 characters",
    });
  });

  it("rejects an unknown model", async () => {
    const res = await POST(
      makeRequest({ cvText: "cv", jobDescription: "jd", model: "not-a-model" }),
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Unknown model" });
  });

  it("returns 502 with a friendly message when generation fails", async () => {
    vi.mocked(generateTailoredCv).mockRejectedValueOnce(new Error("boom"));
    const res = await POST(
      makeRequest({ cvText: "cv", jobDescription: "jd", model: "qwen2.5:3b" }),
    );
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: "friendly error" });
  });

  it("returns 504 with the timeout message when generation times out", async () => {
    const timeoutError = new GenerationTimeoutError();
    vi.mocked(generateTailoredCv).mockRejectedValueOnce(timeoutError);
    const res = await POST(
      makeRequest({ cvText: "cv", jobDescription: "jd", model: "qwen2.5:3b" }),
    );
    expect(res.status).toBe(504);
    expect(await res.json()).toEqual({ error: timeoutError.message });
  });

  it("returns the generated cv on success", async () => {
    vi.mocked(generateTailoredCv).mockResolvedValueOnce(validCv);
    const res = await POST(
      makeRequest({ cvText: "cv", jobDescription: "jd", model: "qwen2.5:3b" }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ cv: validCv });
  });
});
