import { cvSchema, type Cv } from "./schema";

const DRAFT_KEY = "cv-tailor:draft";
const HISTORY_KEY = "cv-tailor:history";
const MAX_HISTORY = 20;

export interface Draft {
  cvText: string;
  jobDescription: string;
  model: string | null;
}

export interface HistoryEntry {
  id: string;
  createdAt: number;
  cv: Cv;
}

/** All localStorage access is wrapped — private browsing, quota limits, or a
 * disabled store should degrade to "nothing saved", never throw. */
function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Quota exceeded or storage disabled — silently skip, nothing to restore next time.
  }
}

export function loadDraft(): Draft | null {
  const raw = safeGet(DRAFT_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (
      typeof parsed.cvText !== "string" ||
      typeof parsed.jobDescription !== "string"
    )
      return null;
    return {
      cvText: parsed.cvText,
      jobDescription: parsed.jobDescription,
      model: typeof parsed.model === "string" ? parsed.model : null,
    };
  } catch {
    return null;
  }
}

export function saveDraft(draft: Draft): void {
  safeSet(DRAFT_KEY, JSON.stringify(draft));
}

/** True if `entry` has the HistoryEntry shape and `entry.cv` is a valid Cv. */
function isValidHistoryEntry(entry: unknown): entry is HistoryEntry {
  if (typeof entry !== "object" || entry === null) return false;
  const { id, createdAt, cv } = entry as Record<string, unknown>;
  return (
    typeof id === "string" &&
    typeof createdAt === "number" &&
    cvSchema.safeParse(cv).success
  );
}

export function loadHistory(): HistoryEntry[] {
  const raw = safeGet(HISTORY_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Drop individually corrupt entries rather than discarding the whole
    // list — a partially-corrupted history is better than losing it all.
    return parsed.filter(isValidHistoryEntry);
  } catch {
    return [];
  }
}

/** Prepends a new entry and caps the list at MAX_HISTORY (oldest dropped first). */
export function addToHistory(cv: Cv): HistoryEntry[] {
  const entry: HistoryEntry = {
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    cv,
  };
  const next = [entry, ...loadHistory()].slice(0, MAX_HISTORY);
  safeSet(HISTORY_KEY, JSON.stringify(next));
  return next;
}

export function clearHistory(): void {
  safeSet(HISTORY_KEY, JSON.stringify([]));
}

/** Clears everything this app has stored in localStorage: the draft and the history. */
export function clearAll(): void {
  safeSet(
    DRAFT_KEY,
    JSON.stringify({ cvText: "", jobDescription: "", model: null }),
  );
  safeSet(HISTORY_KEY, JSON.stringify([]));
}
