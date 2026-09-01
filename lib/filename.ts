/** Turns a (possibly LLM-generated) CV name into a safe filename stem. */
export function sanitizeFilenameBase(name: string): string {
  const cleaned = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return cleaned || "cv";
}
