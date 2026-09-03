import { afterEach, describe, expect, it, vi } from "vitest";
import { ollama, GenerationAbortedError, GenerationTimeoutError } from "../llm";
import { generateCoverLetter } from "../coverLetter";
import type { Cv } from "../schema";

/** A stream stand-in that never yields until `abort()` is called, however/whenever that happens. */
function hangingStream() {
  let aborted = false;
  let rejectPendingNext: ((err: unknown) => void) | undefined;
  return {
    abort: vi.fn(() => {
      aborted = true;
      rejectPendingNext?.(new Error("stream aborted"));
    }),
    [Symbol.asyncIterator]() {
      return {
        next: () => {
          if (aborted) return Promise.reject(new Error("stream aborted"));
          return new Promise((_, reject) => {
            rejectPendingNext = reject;
          });
        },
      };
    },
  };
}

const validCv: Cv = {
  name: "Jane Doe",
  title: "Engineer",
  contact: { email: "", phone: "", location: "", links: [] },
  summary: "",
  skills: [],
  experience: [],
  education: [],
  certifications: [],
};

describe("generateCoverLetter cancel handling", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("throws GenerationAbortedError, not GenerationTimeoutError, when the caller cancels", async () => {
    vi.spyOn(ollama, "chat").mockResolvedValue(hangingStream() as never);
    const controller = new AbortController();
    const promise = generateCoverLetter("m", validCv, "jd", controller.signal);
    controller.abort();
    await expect(promise).rejects.toBeInstanceOf(GenerationAbortedError);
    await expect(promise).rejects.not.toBeInstanceOf(GenerationTimeoutError);
  });
});
