import { describe, expect, it } from "vitest";
import { sanitizeFilenameBase } from "../filename";

describe("sanitizeFilenameBase", () => {
  it("lowercases and underscores a normal name", () => {
    expect(sanitizeFilenameBase("Jane Doe")).toBe("jane_doe");
  });

  it("strips double quotes and does not leak them into the output", () => {
    const result = sanitizeFilenameBase('Jane "JD" Doe');
    expect(result).not.toContain('"');
    expect(result).toBe("jane_jd_doe");
  });

  it("strips path-traversal characters", () => {
    const result = sanitizeFilenameBase("../../etc/passwd");
    expect(result).not.toContain("/");
    expect(result).not.toContain("..");
  });

  it("falls back to cv for an empty or whitespace-only string", () => {
    expect(sanitizeFilenameBase("")).toBe("cv");
    expect(sanitizeFilenameBase("   ")).toBe("cv");
  });
});
