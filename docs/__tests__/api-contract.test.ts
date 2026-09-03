// Cross-checks docs/API.md's documented response tables against the actual
// route handlers. `CONTRACT` below is a hand-maintained transcription of
// each table's rows (status + exact body, or a shape check for rows docs
// mark as a generic `string`/dynamic value) — this has drifted from the
// real routes three times before (see repo history), so this file exists
// to make that drift `npm test`-detectable.
//
// If you change a route's status code or error message, update BOTH
// docs/API.md and the matching entry in `CONTRACT` here — otherwise this
// file (or docs/API.md itself) is now wrong.

import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/llm", () => ({
  ollama: { list: vi.fn(), pull: vi.fn(), delete: vi.fn() },
  generateTailoredCv: vi.fn(),
  friendlyOllamaError: vi.fn(() => "friendly error"),
  GenerationAbortedError: class GenerationAbortedError extends Error {},
  GenerationTimeoutError: class GenerationTimeoutError extends Error {},
}));
vi.mock("@/lib/concurrencyGuard", () => ({
  withGenerationLock: vi.fn((fn: () => Promise<unknown>) => fn()),
  // Mirrors the real class's message (lib/concurrencyGuard.ts) — docs/API.md
  // documents this exact string for the 409 row, so the mock needs to
  // actually produce it rather than the empty default `new Error()` message.
  GenerationInProgressError: class GenerationInProgressError extends Error {
    constructor() {
      super(
        "Another generation is already in progress — wait for it to finish or cancel it.",
      );
    }
  },
}));
vi.mock("@/lib/coverLetter", () => ({
  generateCoverLetter: vi.fn(),
}));
vi.mock("@/lib/diskSpace", () => ({
  getAvailableBytes: vi.fn(),
}));
vi.mock("@/lib/parseFile", () => ({
  extractTextFromFile: vi.fn(),
}));
vi.mock("@/lib/render/toDocx", () => ({
  toDocxBuffer: vi.fn(),
}));
vi.mock("@/lib/render/toPdf", () => ({
  toPdfBuffer: vi.fn(),
}));

import {
  ollama,
  generateTailoredCv,
  GenerationAbortedError,
  GenerationTimeoutError,
} from "@/lib/llm";
import {
  withGenerationLock,
  GenerationInProgressError,
} from "@/lib/concurrencyGuard";
import { generateCoverLetter } from "@/lib/coverLetter";
import { getAvailableBytes } from "@/lib/diskSpace";
import { extractTextFromFile } from "@/lib/parseFile";
import { toDocxBuffer } from "@/lib/render/toDocx";
import { toPdfBuffer } from "@/lib/render/toPdf";
import { CURATED_MODELS } from "@/lib/models";

import { POST as generatePOST } from "../../app/api/generate/route";
import { POST as coverLetterPOST } from "../../app/api/cover-letter/route";
import {
  GET as modelsGET,
  POST as modelsPOST,
  DELETE as modelsDELETE,
} from "../../app/api/models/route";
import { POST as parseFilePOST } from "../../app/api/parse-file/route";
import { POST as exportPOST } from "../../app/api/export/route";
import { GET as healthGET } from "../../app/api/health/route";

function jsonRequest(url: string, body: unknown, method = "POST"): Request {
  return new Request(url, {
    method,
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

/**
 * Hand-transcribed from docs/API.md's response tables. `body` is the exact
 * documented literal; rows docs document as a dynamic `{ error: string }` /
 * `{ text: string }` shape carry no literal `body` here — those tests only
 * assert the field is a string (plus, where practical, that the route
 * passes the value straight through from its dependency).
 */
const CONTRACT = {
  generate: {
    invalidJson: { status: 400, body: { error: "Invalid JSON body" } },
    missingField: {
      status: 400,
      body: {
        error: "cvText, jobDescription, and model are all required",
      },
    },
    overLength: {
      status: 400,
      body: {
        error: "cvText and jobDescription must each be under 50000 characters",
      },
    },
    unknownModel: { status: 400, body: { error: "Unknown model" } },
    inProgress: {
      status: 409,
      body: {
        error:
          "Another generation is already in progress — wait for it to finish or cancel it.",
      },
    },
    cancelled: { status: 499 },
    timeout: { status: 504 },
    upstreamError: { status: 502 },
    success: { status: 200 },
  },
  coverLetter: {
    invalidJson: { status: 400, body: { error: "Invalid JSON body" } },
    invalidCv: { status: 400, body: { error: "Invalid CV payload" } },
    missingField: {
      status: 400,
      body: { error: "jobDescription and model are required" },
    },
    overLength: {
      status: 400,
      body: { error: "jobDescription must be under 50000 characters" },
    },
    unknownModel: { status: 400, body: { error: "Unknown model" } },
    inProgress: {
      status: 409,
      body: {
        error:
          "Another generation is already in progress — wait for it to finish or cancel it.",
      },
    },
    cancelled: { status: 499 },
    timeout: { status: 504 },
    upstreamError: { status: 502 },
    success: { status: 200 },
  },
  modelsGet: {
    success: { status: 200 },
    upstreamError: { status: 502 },
  },
  modelsPost: {
    invalidJson: { status: 400, body: { error: "Invalid JSON body" } },
    unknownModel: { status: 400, body: { error: "Unknown model" } },
    diskSpace: { status: 400 },
    success: { status: 200, contentType: "application/x-ndjson" },
  },
  modelsDelete: {
    invalidJson: { status: 400, body: { error: "Invalid JSON body" } },
    unknownModel: { status: 400, body: { error: "Unknown model" } },
    notDownloaded: { status: 404 },
    upstreamError: { status: 502 },
    success: { status: 200, body: { status: "success" } },
  },
  parseFile: {
    success: { status: 200 },
    noFile: { status: 400, body: { error: "No file provided" } },
    tooLarge: {
      status: 413,
      body: { error: "File is too large (max 20MB)" },
    },
    extractionFailed: { status: 422 },
  },
  export: {
    invalidJson: { status: 400, body: { error: "Invalid JSON body" } },
    invalidCv: { status: 400, body: { error: "Invalid CV payload" } },
    invalidFormat: {
      status: 400,
      body: { error: "format must be 'docx' or 'pdf'" },
    },
    successDocx: {
      status: 200,
      contentType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    },
    successPdf: { status: 200, contentType: "application/pdf" },
  },
  health: {
    ok: { status: 200, body: { status: "ok", ollama: "reachable" } },
    degraded: { status: 503 },
  },
} as const;

describe("docs/API.md contract: POST /api/generate", () => {
  const url = "http://localhost/api/generate";
  const validBody = { cvText: "cv", jobDescription: "jd", model: "qwen2.5:3b" };

  it("400 — Invalid JSON body", async () => {
    const res = await generatePOST(jsonRequest(url, "not json"));
    expect(res.status).toBe(CONTRACT.generate.invalidJson.status);
    expect(await res.json()).toEqual(CONTRACT.generate.invalidJson.body);
  });

  it("400 — missing required field", async () => {
    const res = await generatePOST(
      jsonRequest(url, { cvText: "cv", jobDescription: "jd" }),
    );
    expect(res.status).toBe(CONTRACT.generate.missingField.status);
    expect(await res.json()).toEqual(CONTRACT.generate.missingField.body);
  });

  it("400 — over-length field", async () => {
    const res = await generatePOST(
      jsonRequest(url, { ...validBody, cvText: "a".repeat(50_001) }),
    );
    expect(res.status).toBe(CONTRACT.generate.overLength.status);
    expect(await res.json()).toEqual(CONTRACT.generate.overLength.body);
  });

  it("400 — unknown model", async () => {
    const res = await generatePOST(
      jsonRequest(url, { ...validBody, model: "not-a-model" }),
    );
    expect(res.status).toBe(CONTRACT.generate.unknownModel.status);
    expect(await res.json()).toEqual(CONTRACT.generate.unknownModel.body);
  });

  it("409 — generation already in progress", async () => {
    vi.mocked(withGenerationLock).mockRejectedValueOnce(
      new GenerationInProgressError(),
    );
    const res = await generatePOST(jsonRequest(url, validBody));
    expect(res.status).toBe(CONTRACT.generate.inProgress.status);
    expect(await res.json()).toEqual(CONTRACT.generate.inProgress.body);
  });

  it("499 — client cancelled, empty body", async () => {
    vi.mocked(generateTailoredCv).mockRejectedValueOnce(
      new GenerationAbortedError(),
    );
    const res = await generatePOST(jsonRequest(url, validBody));
    expect(res.status).toBe(CONTRACT.generate.cancelled.status);
    expect(await res.text()).toBe("");
  });

  it("504 — generation timed out", async () => {
    vi.mocked(generateTailoredCv).mockRejectedValueOnce(
      new GenerationTimeoutError(),
    );
    const res = await generatePOST(jsonRequest(url, validBody));
    expect(res.status).toBe(CONTRACT.generate.timeout.status);
    const body = await res.json();
    expect(typeof body.error).toBe("string");
  });

  it("502 — upstream/Ollama error", async () => {
    vi.mocked(generateTailoredCv).mockRejectedValueOnce(new Error("boom"));
    const res = await generatePOST(jsonRequest(url, validBody));
    expect(res.status).toBe(CONTRACT.generate.upstreamError.status);
    expect(await res.json()).toEqual({ error: "friendly error" });
  });

  it("200 — returns the generated cv", async () => {
    vi.mocked(generateTailoredCv).mockResolvedValueOnce(validCv);
    const res = await generatePOST(jsonRequest(url, validBody));
    expect(res.status).toBe(CONTRACT.generate.success.status);
    expect(await res.json()).toEqual({ cv: validCv });
  });
});

describe("docs/API.md contract: POST /api/cover-letter", () => {
  const url = "http://localhost/api/cover-letter";
  const validBody = { cv: validCv, jobDescription: "jd", model: "qwen2.5:3b" };

  it("400 — Invalid JSON body", async () => {
    const res = await coverLetterPOST(jsonRequest(url, "not json"));
    expect(res.status).toBe(CONTRACT.coverLetter.invalidJson.status);
    expect(await res.json()).toEqual(CONTRACT.coverLetter.invalidJson.body);
  });

  it("400 — invalid cv payload", async () => {
    const res = await coverLetterPOST(
      jsonRequest(url, {
        cv: { bogus: true },
        jobDescription: "jd",
        model: "qwen2.5:3b",
      }),
    );
    expect(res.status).toBe(CONTRACT.coverLetter.invalidCv.status);
    expect(await res.json()).toEqual(CONTRACT.coverLetter.invalidCv.body);
  });

  it("400 — missing required field", async () => {
    const res = await coverLetterPOST(jsonRequest(url, { cv: validCv }));
    expect(res.status).toBe(CONTRACT.coverLetter.missingField.status);
    expect(await res.json()).toEqual(CONTRACT.coverLetter.missingField.body);
  });

  it("400 — over-length jobDescription", async () => {
    const res = await coverLetterPOST(
      jsonRequest(url, { ...validBody, jobDescription: "a".repeat(50_001) }),
    );
    expect(res.status).toBe(CONTRACT.coverLetter.overLength.status);
    expect(await res.json()).toEqual(CONTRACT.coverLetter.overLength.body);
  });

  it("400 — unknown model", async () => {
    const res = await coverLetterPOST(
      jsonRequest(url, { ...validBody, model: "not-a-model" }),
    );
    expect(res.status).toBe(CONTRACT.coverLetter.unknownModel.status);
    expect(await res.json()).toEqual(CONTRACT.coverLetter.unknownModel.body);
  });

  it("409 — generation already in progress", async () => {
    vi.mocked(withGenerationLock).mockRejectedValueOnce(
      new GenerationInProgressError(),
    );
    const res = await coverLetterPOST(jsonRequest(url, validBody));
    expect(res.status).toBe(CONTRACT.coverLetter.inProgress.status);
    expect(await res.json()).toEqual(CONTRACT.coverLetter.inProgress.body);
  });

  it("499 — client cancelled, empty body", async () => {
    vi.mocked(generateCoverLetter).mockRejectedValueOnce(
      new GenerationAbortedError(),
    );
    const res = await coverLetterPOST(jsonRequest(url, validBody));
    expect(res.status).toBe(CONTRACT.coverLetter.cancelled.status);
    expect(await res.text()).toBe("");
  });

  it("504 — generation timed out", async () => {
    vi.mocked(generateCoverLetter).mockRejectedValueOnce(
      new GenerationTimeoutError(),
    );
    const res = await coverLetterPOST(jsonRequest(url, validBody));
    expect(res.status).toBe(CONTRACT.coverLetter.timeout.status);
    const body = await res.json();
    expect(typeof body.error).toBe("string");
  });

  it("502 — upstream/Ollama error", async () => {
    vi.mocked(generateCoverLetter).mockRejectedValueOnce(new Error("boom"));
    const res = await coverLetterPOST(jsonRequest(url, validBody));
    expect(res.status).toBe(CONTRACT.coverLetter.upstreamError.status);
    expect(await res.json()).toEqual({ error: "friendly error" });
  });

  it("200 — returns the generated letter", async () => {
    vi.mocked(generateCoverLetter).mockResolvedValueOnce(
      "Dear Hiring Manager,",
    );
    const res = await coverLetterPOST(jsonRequest(url, validBody));
    expect(res.status).toBe(CONTRACT.coverLetter.success.status);
    expect(await res.json()).toEqual({ letter: "Dear Hiring Manager," });
  });
});

describe("docs/API.md contract: GET /api/models", () => {
  it("200 — curated models with downloaded status", async () => {
    vi.mocked(ollama.list).mockResolvedValueOnce({
      models: [{ model: CURATED_MODELS[0].id }],
    } as Awaited<ReturnType<typeof ollama.list>>);
    const res = await modelsGET();
    expect(res.status).toBe(CONTRACT.modelsGet.success.status);
    const body = await res.json();
    expect(body.models).toHaveLength(CURATED_MODELS.length);
    expect(body.models[0]).toEqual({ ...CURATED_MODELS[0], downloaded: true });
  });

  it("502 — Ollama unreachable", async () => {
    vi.mocked(ollama.list).mockRejectedValueOnce(new Error("ECONNREFUSED"));
    const res = await modelsGET();
    expect(res.status).toBe(CONTRACT.modelsGet.upstreamError.status);
    expect(await res.json()).toEqual({ error: "friendly error" });
  });
});

describe("docs/API.md contract: POST /api/models", () => {
  const url = "http://localhost/api/models";

  it("400 — Invalid JSON body", async () => {
    const res = await modelsPOST(jsonRequest(url, "not json"));
    expect(res.status).toBe(CONTRACT.modelsPost.invalidJson.status);
    expect(await res.json()).toEqual(CONTRACT.modelsPost.invalidJson.body);
  });

  it("400 — unknown model", async () => {
    const res = await modelsPOST(jsonRequest(url, { model: "not-a-model" }));
    expect(res.status).toBe(CONTRACT.modelsPost.unknownModel.status);
    expect(await res.json()).toEqual(CONTRACT.modelsPost.unknownModel.body);
  });

  it("400 — not enough disk space", async () => {
    const model = CURATED_MODELS.find((m) => m.id === "qwen2.5:7b")!;
    vi.mocked(getAvailableBytes).mockResolvedValueOnce(1 * 1024 ** 3);
    const res = await modelsPOST(jsonRequest(url, { model: model.id }));
    expect(res.status).toBe(CONTRACT.modelsPost.diskSpace.status);
    expect(await res.json()).toEqual({
      error: `Not enough disk space to download ${model.label} (~${model.sizeGb}GB needed, ~1.0GB free).`,
    });
  });

  it("200 — streams ndjson progress chunks through as-is", async () => {
    vi.mocked(getAvailableBytes).mockResolvedValueOnce(100 * 1024 ** 3);
    async function* progress() {
      yield { status: "pulling manifest" };
      yield { status: "success" };
    }
    vi.mocked(ollama.pull).mockResolvedValueOnce(
      progress() as unknown as Awaited<ReturnType<typeof ollama.pull>>,
    );
    const res = await modelsPOST(
      jsonRequest(url, { model: CURATED_MODELS[0].id }),
    );
    expect(res.status).toBe(CONTRACT.modelsPost.success.status);
    expect(res.headers.get("Content-Type")).toBe(
      CONTRACT.modelsPost.success.contentType,
    );
    const lines = (await res.text())
      .trim()
      .split("\n")
      .map((l) => JSON.parse(l));
    expect(lines).toEqual([
      { status: "pulling manifest" },
      { status: "success" },
    ]);
  });

  it("200 — reports a partway pull failure as an in-band error chunk", async () => {
    vi.mocked(getAvailableBytes).mockResolvedValueOnce(100 * 1024 ** 3);
    vi.mocked(ollama.pull).mockRejectedValueOnce(new Error("boom"));
    const res = await modelsPOST(
      jsonRequest(url, { model: CURATED_MODELS[0].id }),
    );
    expect(res.status).toBe(CONTRACT.modelsPost.success.status);
    const line = JSON.parse((await res.text()).trim());
    expect(line).toEqual({ status: "error", error: "friendly error" });
  });
});

describe("docs/API.md contract: DELETE /api/models", () => {
  const url = "http://localhost/api/models";

  it("400 — Invalid JSON body", async () => {
    const res = await modelsDELETE(jsonRequest(url, "not json", "DELETE"));
    expect(res.status).toBe(CONTRACT.modelsDelete.invalidJson.status);
    expect(await res.json()).toEqual(CONTRACT.modelsDelete.invalidJson.body);
  });

  it("400 — unknown model", async () => {
    const res = await modelsDELETE(
      jsonRequest(url, { model: "not-a-model" }, "DELETE"),
    );
    expect(res.status).toBe(CONTRACT.modelsDelete.unknownModel.status);
    expect(await res.json()).toEqual(CONTRACT.modelsDelete.unknownModel.body);
  });

  it("404 — model isn't downloaded", async () => {
    const model = CURATED_MODELS[0];
    vi.mocked(ollama.delete).mockRejectedValueOnce(
      new Error(`model '${model.id}' not found`),
    );
    const res = await modelsDELETE(
      jsonRequest(url, { model: model.id }, "DELETE"),
    );
    expect(res.status).toBe(CONTRACT.modelsDelete.notDownloaded.status);
    expect(await res.json()).toEqual({
      error: `${model.label} isn't downloaded.`,
    });
  });

  it("502 — other delete failure", async () => {
    vi.mocked(ollama.delete).mockRejectedValueOnce(new Error("boom"));
    const res = await modelsDELETE(
      jsonRequest(url, { model: CURATED_MODELS[0].id }, "DELETE"),
    );
    expect(res.status).toBe(CONTRACT.modelsDelete.upstreamError.status);
    expect(await res.json()).toEqual({ error: "friendly error" });
  });

  it("200 — model deleted", async () => {
    vi.mocked(ollama.delete).mockResolvedValueOnce({ status: "success" });
    const res = await modelsDELETE(
      jsonRequest(url, { model: CURATED_MODELS[0].id }, "DELETE"),
    );
    expect(res.status).toBe(CONTRACT.modelsDelete.success.status);
    expect(await res.json()).toEqual(CONTRACT.modelsDelete.success.body);
  });
});

describe("docs/API.md contract: POST /api/parse-file", () => {
  function fileRequest(file: File): Request {
    const formData = new FormData();
    formData.set("file", file);
    return new Request("http://localhost/api/parse-file", {
      method: "POST",
      body: formData,
    });
  }

  it("400 — no file provided", async () => {
    const res = await parseFilePOST(
      new Request("http://localhost/api/parse-file", {
        method: "POST",
        body: new FormData(),
      }),
    );
    expect(res.status).toBe(CONTRACT.parseFile.noFile.status);
    expect(await res.json()).toEqual(CONTRACT.parseFile.noFile.body);
  });

  it("413 — file too large", async () => {
    const bytes = new Uint8Array(20 * 1024 * 1024 + 1);
    const file = new File([bytes], "cv.pdf", { type: "application/pdf" });
    const res = await parseFilePOST(fileRequest(file));
    expect(res.status).toBe(CONTRACT.parseFile.tooLarge.status);
    expect(await res.json()).toEqual(CONTRACT.parseFile.tooLarge.body);
  });

  it("422 — extraction failed", async () => {
    vi.mocked(extractTextFromFile).mockRejectedValueOnce(
      new Error("Unsupported file type: cv.txt"),
    );
    const file = new File(["hello"], "cv.txt", { type: "text/plain" });
    const res = await parseFilePOST(fileRequest(file));
    expect(res.status).toBe(CONTRACT.parseFile.extractionFailed.status);
    expect(await res.json()).toEqual({
      error: "Unsupported file type: cv.txt",
    });
  });

  it("200 — extracted text", async () => {
    vi.mocked(extractTextFromFile).mockResolvedValueOnce("extracted cv text");
    const file = new File(["hello"], "cv.pdf", { type: "application/pdf" });
    const res = await parseFilePOST(fileRequest(file));
    expect(res.status).toBe(CONTRACT.parseFile.success.status);
    const body = await res.json();
    expect(typeof body.text).toBe("string");
    expect(body).toEqual({ text: "extracted cv text" });
  });
});

describe("docs/API.md contract: POST /api/export", () => {
  const url = "http://localhost/api/export";

  it("400 — Invalid JSON body", async () => {
    const res = await exportPOST(jsonRequest(url, "not json"));
    expect(res.status).toBe(CONTRACT.export.invalidJson.status);
    expect(await res.json()).toEqual(CONTRACT.export.invalidJson.body);
  });

  it("400 — invalid cv payload", async () => {
    const res = await exportPOST(
      jsonRequest(url, { cv: { bogus: true }, format: "pdf" }),
    );
    expect(res.status).toBe(CONTRACT.export.invalidCv.status);
    expect(await res.json()).toEqual(CONTRACT.export.invalidCv.body);
  });

  it("400 — invalid format", async () => {
    const res = await exportPOST(
      jsonRequest(url, { cv: validCv, format: "txt" }),
    );
    expect(res.status).toBe(CONTRACT.export.invalidFormat.status);
    expect(await res.json()).toEqual(CONTRACT.export.invalidFormat.body);
  });

  it("200 — docx file with correct headers", async () => {
    vi.mocked(toDocxBuffer).mockResolvedValueOnce(Buffer.from("docx bytes"));
    const res = await exportPOST(
      jsonRequest(url, { cv: validCv, format: "docx" }),
    );
    expect(res.status).toBe(CONTRACT.export.successDocx.status);
    expect(res.headers.get("Content-Type")).toBe(
      CONTRACT.export.successDocx.contentType,
    );
    expect(res.headers.get("Content-Disposition")).toBe(
      'attachment; filename="jane_doe.docx"',
    );
  });

  it("200 — pdf file with correct headers", async () => {
    vi.mocked(toPdfBuffer).mockResolvedValueOnce(Buffer.from("pdf bytes"));
    const res = await exportPOST(
      jsonRequest(url, { cv: validCv, format: "pdf" }),
    );
    expect(res.status).toBe(CONTRACT.export.successPdf.status);
    expect(res.headers.get("Content-Type")).toBe(
      CONTRACT.export.successPdf.contentType,
    );
    expect(res.headers.get("Content-Disposition")).toBe(
      'attachment; filename="jane_doe.pdf"',
    );
  });
});

describe("docs/API.md contract: GET /api/health", () => {
  it("200 — Ollama reachable", async () => {
    vi.mocked(ollama.list).mockResolvedValueOnce(
      {} as Awaited<ReturnType<typeof ollama.list>>,
    );
    const res = await healthGET();
    expect(res.status).toBe(CONTRACT.health.ok.status);
    expect(await res.json()).toEqual(CONTRACT.health.ok.body);
  });

  it("503 — Ollama unreachable", async () => {
    vi.mocked(ollama.list).mockRejectedValueOnce(new Error("ECONNREFUSED"));
    const res = await healthGET();
    expect(res.status).toBe(CONTRACT.health.degraded.status);
    expect(await res.json()).toEqual({
      status: "degraded",
      ollama: "unreachable",
      error: "ECONNREFUSED",
    });
  });
});
