import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/render/toDocx", () => ({
  toDocxBuffer: vi.fn(),
}));
vi.mock("@/lib/render/toPdf", () => ({
  toPdfBuffer: vi.fn(),
}));

import { toDocxBuffer } from "@/lib/render/toDocx";
import { toPdfBuffer } from "@/lib/render/toPdf";
import { POST } from "../route";

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/export", {
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

describe("POST /api/export", () => {
  it("rejects invalid JSON body", async () => {
    const res = await POST(makeRequest("not json"));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid JSON body" });
  });

  it("rejects an invalid cv payload", async () => {
    const res = await POST(makeRequest({ cv: { bogus: true }, format: "pdf" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid CV payload" });
  });

  it("rejects an invalid format", async () => {
    const res = await POST(makeRequest({ cv: validCv, format: "txt" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: "format must be 'docx' or 'pdf'",
    });
  });

  it("returns a docx file with correct headers on success", async () => {
    vi.mocked(toDocxBuffer).mockResolvedValueOnce(Buffer.from("docx bytes"));
    const res = await POST(makeRequest({ cv: validCv, format: "docx" }));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe(
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    );
    expect(res.headers.get("Content-Disposition")).toBe(
      'attachment; filename="jane_doe.docx"',
    );
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(
      new Uint8Array(Buffer.from("docx bytes")),
    );
  });

  it("returns a pdf file with correct headers on success", async () => {
    vi.mocked(toPdfBuffer).mockResolvedValueOnce(Buffer.from("pdf bytes"));
    const res = await POST(makeRequest({ cv: validCv, format: "pdf" }));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/pdf");
    expect(res.headers.get("Content-Disposition")).toBe(
      'attachment; filename="jane_doe.pdf"',
    );
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(
      new Uint8Array(Buffer.from("pdf bytes")),
    );
  });
});
