/**
 * Thrown by `withGenerationLock` when a generation is requested while
 * another is already running.
 */
export class GenerationInProgressError extends Error {
  constructor() {
    super(
      "Another generation is already in progress — wait for it to finish or cancel it.",
    );
    this.name = "GenerationInProgressError";
  }
}

let locked = false;

/**
 * Serializes CV and cover letter generation behind a single module-level
 * lock, since both ultimately contend for the same local Ollama
 * server/hardware. This is a single-user, single-machine, single-Node-process
 * app — no distributed deployment — so an in-memory flag is sufficient; no
 * queueing, just an immediate rejection if a generation is already running.
 *
 * The lock is released in a `finally`, so it's freed regardless of how `fn`
 * ends: it resolves, throws, or rejects with a cancellation/timeout error.
 */
export async function withGenerationLock<T>(fn: () => Promise<T>): Promise<T> {
  if (locked) throw new GenerationInProgressError();
  locked = true;
  try {
    return await fn();
  } finally {
    locked = false;
  }
}
