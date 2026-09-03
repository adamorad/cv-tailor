import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/parseFile", () => ({
  extractTextFromFile: vi.fn(),
}));

import { extractTextFromFile } from "@/lib/parseFile";
import { POST } from "../route";

function makeRequest(formData: FormData): Request {
  return new Request("http://localhost/api/parse-file", {
    method: "POST",
    body: formData,
  });
}

describe("POST /api/parse-file", () => {
  it("rejects a missing file", async () => {
    const res = await POST(makeRequest(new FormData()));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "No file provided" });
  });

  it("rejects a file over the size limit", async () => {
    const bytes = new Uint8Array(20 * 1024 * 1024 + 1);
    const file = new File([bytes], "cv.pdf", { type: "application/pdf" });
    const formData = new FormData();
    formData.set("file", file);

    const res = await POST(makeRequest(formData));
    expect(res.status).toBe(413);
    expect(await res.json()).toEqual({ error: "File is too large (max 20MB)" });
  });

  it("returns 422 when extraction fails", async () => {
    vi.mocked(extractTextFromFile).mockRejectedValueOnce(
      new Error("Unsupported file type: cv.txt"),
    );
    const file = new File(["hello"], "cv.txt", { type: "text/plain" });
    const formData = new FormData();
    formData.set("file", file);

    const res = await POST(makeRequest(formData));
    expect(res.status).toBe(422);
    expect(await res.json()).toEqual({
      error: "Unsupported file type: cv.txt",
    });
  });

  it("returns extracted text on success", async () => {
    vi.mocked(extractTextFromFile).mockResolvedValueOnce("extracted cv text");
    const file = new File(["hello"], "cv.pdf", { type: "application/pdf" });
    const formData = new FormData();
    formData.set("file", file);

    const res = await POST(makeRequest(formData));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ text: "extracted cv text" });
  });
});
