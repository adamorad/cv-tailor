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

  it("caps output length at 100 characters for a very long input", () => {
    const result = sanitizeFilenameBase("a".repeat(10_000));
    expect(result.length).toBeLessThanOrEqual(100);
    expect(result).toBe("a".repeat(100));
  });

  it("caps output length even when the input is entirely non-alphanumeric noise around the cap", () => {
    // Ensures the post-slice trim doesn't leave a dangling underscore or
    // exceed the cap when the cut point lands inside a run of separators.
    const result = sanitizeFilenameBase(
      "x".repeat(99) + " ".repeat(20) + "y".repeat(20),
    );
    expect(result.length).toBeLessThanOrEqual(100);
    expect(result).not.toMatch(/^_|_$/);
  });

  describe("adversarial fixtures — invariants that must always hold", () => {
    const fixtures: Record<string, string> = {
      "10,000-character string": "z".repeat(10_000),
      "control characters": "cv\x00\x01\x02\x1f name\x7f",
      "null bytes": "cv\0\0\0name",
      "unicode/emoji/RTL mix": "🎉résumé_日本語_مرحبا_עברית🚀",
      "entirely non-alphanumeric": "!@#$%^&*()[]{}<>?,./;':\"\\|`~",
      "repeated whitespace and underscores": "   ___   ___   name   ___   ",
      "path traversal with many segments": "../".repeat(500) + "etc/passwd",
      "windows-style path traversal": "..\\..\\..\\windows\\system32",
      "mixed traversal and control chars": "..\x00/\x1f../etc\\..\\passwd",
      "extremely long unicode": "日".repeat(5_000),
      "newlines and tabs": "line1\nline2\tline3\r\nline4",
      "only dots": ".".repeat(50),
      "surrogate-pair heavy emoji": "😀😃😄😁😆😅🤣😂🙂🙃".repeat(50),
    };

    for (const [label, input] of Object.entries(fixtures)) {
      it(`holds invariants for: ${label}`, () => {
        const result = sanitizeFilenameBase(input);

        expect(result.length).toBeGreaterThan(0);
        expect(result.length).toBeLessThanOrEqual(100);
        expect(result).not.toContain("/");
        expect(result).not.toContain("\\");
        expect(result).not.toContain("..");
        // No ASCII control characters (0x00-0x1F, 0x7F) should survive.
        expect(result).not.toMatch(/[\x00-\x1f\x7f]/);
      });
    }
  });
});
