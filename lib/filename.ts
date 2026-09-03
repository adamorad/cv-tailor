/** Filesystem-safe cap: generous for a CV name, well under every real
 * filesystem's actual filename length limit. */
const MAX_LENGTH = 100;

/** Turns a (possibly LLM-generated) CV name into a safe filename stem. */
export function sanitizeFilenameBase(name: string): string {
  const cleaned = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, MAX_LENGTH)
    .replace(/^_+|_+$/g, "");
  return cleaned || "cv";
}
