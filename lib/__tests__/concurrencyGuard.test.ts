import { describe, expect, it } from "vitest";
import {
  withGenerationLock,
  GenerationInProgressError,
} from "../concurrencyGuard";
import { GenerationAbortedError, GenerationTimeoutError } from "../llm";

/** Resolves `resolve`/`reject` once called, letting a test control exactly when the wrapped fn settles. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (err: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("withGenerationLock", () => {
  it("rejects a second acquire while the first is still in flight", async () => {
    const first = deferred<void>();
    const firstCall = withGenerationLock(() => first.promise);

    await expect(
      withGenerationLock(() => Promise.resolve()),
    ).rejects.toBeInstanceOf(GenerationInProgressError);

    first.resolve();
    await firstCall;
  });

  it("allows acquiring again once the previous holder released", async () => {
    await withGenerationLock(() => Promise.resolve("first"));
    await expect(
      withGenerationLock(() => Promise.resolve("second")),
    ).resolves.toBe("second");
  });

  it("releases the lock after a successful run", async () => {
    await withGenerationLock(() => Promise.resolve());
    await expect(
      withGenerationLock(() => Promise.resolve()),
    ).resolves.toBeUndefined();
  });

  it("releases the lock after fn throws a plain error", async () => {
    await expect(
      withGenerationLock(() => Promise.reject(new Error("boom"))),
    ).rejects.toThrow("boom");
    await expect(
      withGenerationLock(() => Promise.resolve()),
    ).resolves.toBeUndefined();
  });

  it("releases the lock after fn rejects with GenerationAbortedError (client cancel)", async () => {
    await expect(
      withGenerationLock(() => Promise.reject(new GenerationAbortedError())),
    ).rejects.toBeInstanceOf(GenerationAbortedError);
    await expect(
      withGenerationLock(() => Promise.resolve()),
    ).resolves.toBeUndefined();
  });

  it("releases the lock after fn rejects with GenerationTimeoutError", async () => {
    await expect(
      withGenerationLock(() => Promise.reject(new GenerationTimeoutError())),
    ).rejects.toBeInstanceOf(GenerationTimeoutError);
    await expect(
      withGenerationLock(() => Promise.resolve()),
    ).resolves.toBeUndefined();
  });
});
