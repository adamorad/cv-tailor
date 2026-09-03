// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { CoverLetterPanel } from "../CoverLetterPanel";
import { sampleCv } from "@/lib/render/__tests__/fixtures";

const jobDescription = "Build great software.";
const model = "qwen2.5:3b";

function jsonResponse(ok: boolean, body: unknown): Response {
  return {
    ok,
    json: async () => body,
  } as Response;
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("CoverLetterPanel", () => {
  it("shows the Generate cover letter button in the initial state", () => {
    render(
      <CoverLetterPanel
        cv={sampleCv}
        jobDescription={jobDescription}
        model={model}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Generate cover letter" }),
    ).toBeInTheDocument();
  });

  it("calls fetch with the right request shape and renders the letter on success", async () => {
    const letter = "Dear Hiring Manager,\n\nI am excited to apply.";
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(true, { letter }));

    render(
      <CoverLetterPanel
        cv={sampleCv}
        jobDescription={jobDescription}
        model={model}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Generate cover letter" }),
    );

    const textarea = await screen.findByRole("textbox");
    expect(textarea).toHaveValue(letter);
    expect(screen.getByRole("button", { name: "Copy" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Download .txt" }),
    ).toBeInTheDocument();

    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe("/api/cover-letter");
    expect(init).toMatchObject({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cv: sampleCv, jobDescription, model }),
    });
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });

  it("shows a calm error state when the response is a non-OK JSON error", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse(false, { error: "Ollama is not reachable" }),
    );

    render(
      <CoverLetterPanel
        cv={sampleCv}
        jobDescription={jobDescription}
        model={model}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Generate cover letter" }),
    );

    expect(
      await screen.findByText("Ollama is not reachable"),
    ).toBeInTheDocument();
    // No crash, and it stays in the "no letter yet" state.
    expect(
      screen.getByRole("button", { name: "Generate cover letter" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("copies the current textarea content to the clipboard", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse(true, { letter: "Original letter" }),
    );

    render(
      <CoverLetterPanel
        cv={sampleCv}
        jobDescription={jobDescription}
        model={model}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Generate cover letter" }),
    );
    const textarea = await screen.findByRole("textbox");

    fireEvent.change(textarea, { target: { value: "Edited letter" } });
    fireEvent.click(screen.getByRole("button", { name: "Copy" }));

    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText).toHaveBeenCalledWith("Edited letter");
  });

  it("triggers a download of the current letter as a .txt blob", async () => {
    const createObjectURL = vi.fn().mockReturnValue("blob:mock-url");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", { ...URL, createObjectURL, revokeObjectURL });
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse(true, { letter: "Download me" }),
    );

    render(
      <CoverLetterPanel
        cv={sampleCv}
        jobDescription={jobDescription}
        model={model}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Generate cover letter" }),
    );
    await screen.findByRole("textbox");

    fireEvent.click(screen.getByRole("button", { name: "Download .txt" }));

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    const blob = createObjectURL.mock.calls[0][0] as Blob;
    expect(blob.type).toBe("text/plain");
    await expect(blob.text()).resolves.toBe("Download me");
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
  });
});
