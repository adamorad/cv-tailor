import { afterEach, beforeEach, expect, test } from "vitest";
import {
  loadDraft,
  saveDraft,
  loadHistory,
  addToHistory,
  clearHistory,
} from "../storage";
import { sampleCv } from "../render/__tests__/fixtures";

/** Minimal in-memory localStorage polyfill — vitest runs in a plain Node env with no DOM. */
class MemoryStorage {
  private store = new Map<string, string>();
  getItem(key: string) {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  setItem(key: string, value: string) {
    this.store.set(key, value);
  }
}

beforeEach(() => {
  (globalThis as { localStorage?: unknown }).localStorage = new MemoryStorage();
  // crypto.randomUUID is available in Node 20+, but be defensive in case the test env differs.
  if (!globalThis.crypto?.randomUUID) {
    (globalThis as { crypto?: unknown }).crypto = {
      randomUUID: () => Math.random().toString(36),
    };
  }
});

afterEach(() => {
  delete (globalThis as { localStorage?: unknown }).localStorage;
});

test("loadDraft returns null when nothing saved", () => {
  expect(loadDraft()).toBeNull();
});

test("saveDraft then loadDraft round-trips", () => {
  saveDraft({
    cvText: "my cv",
    jobDescription: "the job",
    model: "qwen2.5:3b",
  });
  expect(loadDraft()).toEqual({
    cvText: "my cv",
    jobDescription: "the job",
    model: "qwen2.5:3b",
  });
});

test("loadDraft ignores corrupt JSON instead of throwing", () => {
  localStorage.setItem("cv-tailor:draft", "{not json");
  expect(loadDraft()).toBeNull();
});

test("addToHistory prepends and loadHistory returns it", () => {
  const history = addToHistory(sampleCv);
  expect(history).toHaveLength(1);
  expect(history[0].cv).toEqual(sampleCv);
  expect(loadHistory()).toHaveLength(1);
});

test("addToHistory caps at 20 entries, newest first", () => {
  for (let i = 0; i < 25; i++) {
    addToHistory({ ...sampleCv, name: `Person ${i}` });
  }
  const history = loadHistory();
  expect(history).toHaveLength(20);
  expect(history[0].cv.name).toBe("Person 24");
});

test("clearHistory empties it", () => {
  addToHistory(sampleCv);
  clearHistory();
  expect(loadHistory()).toEqual([]);
});

test("storage functions degrade to no-ops instead of throwing when localStorage is unavailable", () => {
  delete (globalThis as { localStorage?: unknown }).localStorage;
  expect(() =>
    saveDraft({ cvText: "x", jobDescription: "y", model: null }),
  ).not.toThrow();
  expect(loadDraft()).toBeNull();
  expect(loadHistory()).toEqual([]);
});
