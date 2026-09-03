import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ollama,
  generateTailoredCv,
  GenerationAbortedError,
  GenerationTimeoutError,
  withTimeout,
  isTimeoutAbort,
} from "../llm";

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

describe("withTimeout", () => {
  it("returns a signal that aborts on its own after timeoutMs with no caller signal", async () => {
    const signal = withTimeout(undefined, 20);
    expect(signal.aborted).toBe(false);
    await new Promise((r) => setTimeout(r, 80));
    expect(signal.aborted).toBe(true);
    expect(isTimeoutAbort(signal)).toBe(true);
  });

  it("aborts immediately when the caller signal is already aborted, before the timeout", () => {
    const controller = new AbortController();
    controller.abort();
    const signal = withTimeout(controller.signal, 10_000);
    expect(signal.aborted).toBe(true);
    expect(isTimeoutAbort(signal)).toBe(false);
  });

  it("aborts when the caller signal fires, distinct from a timeout", () => {
    const controller = new AbortController();
    const signal = withTimeout(controller.signal, 10_000);
    controller.abort();
    expect(signal.aborted).toBe(true);
    expect(isTimeoutAbort(signal)).toBe(false);
  });

  it("still times out on its own if the caller signal never fires", async () => {
    const controller = new AbortController();
    const signal = withTimeout(controller.signal, 20);
    await new Promise((r) => setTimeout(r, 80));
    expect(signal.aborted).toBe(true);
    expect(isTimeoutAbort(signal)).toBe(true);
  });
});

describe("isTimeoutAbort", () => {
  it("is false for a plain caller-initiated abort", () => {
    const controller = new AbortController();
    controller.abort();
    expect(isTimeoutAbort(controller.signal)).toBe(false);
  });

  it("is true for an AbortSignal.timeout", async () => {
    const signal = AbortSignal.timeout(20);
    await new Promise((r) => setTimeout(r, 80));
    expect(isTimeoutAbort(signal)).toBe(true);
  });
});

describe("generateTailoredCv cancel handling", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("throws GenerationAbortedError, not GenerationTimeoutError, when the caller cancels", async () => {
    vi.spyOn(ollama, "chat").mockResolvedValue(hangingStream() as never);
    const controller = new AbortController();
    const promise = generateTailoredCv("m", "cv", "jd", controller.signal);
    controller.abort();
    await expect(promise).rejects.toBeInstanceOf(GenerationAbortedError);
    await expect(promise).rejects.not.toBeInstanceOf(GenerationTimeoutError);
  });
});
