import { describe, expect, it } from "vitest";
import mammoth from "mammoth";
import { toDocxBuffer } from "../toDocx";
import {
  emptyOptionalSectionsCv,
  longContentCv,
  minimalCv,
  sampleCv,
  unicodeCv,
} from "./fixtures";

describe("toDocxBuffer", () => {
  it("resolves to a non-empty Buffer with the ZIP magic bytes", async () => {
    const buffer = await toDocxBuffer(sampleCv);
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(0);
    expect(buffer[0]).toBe(0x50); // "P"
    expect(buffer[1]).toBe(0x4b); // "K"
  });

  it("omits headings for empty skills, experience, and certifications sections", async () => {
    const buffer = await toDocxBuffer(emptyOptionalSectionsCv);
    const { value } = await mammoth.extractRawText({ buffer });
    // Match the heading as a standalone line, since "Experience" is also a
    // substring of the (unrelated, still-present) "Experienced engineer..."
    // summary sentence in the shared sampleCv fixture.
    expect(value).not.toMatch(/(^|\n)Skills(\n|$)/);
    expect(value).not.toMatch(/(^|\n)Experience(\n|$)/);
    expect(value).not.toMatch(/(^|\n)Certifications(\n|$)/);
    expect(value).toContain("Summary");
    expect(value).toContain("Education");
  });

  it("produces a valid document for a Cv with just the bare minimum populated", async () => {
    const buffer = await toDocxBuffer(minimalCv);
    expect(buffer[0]).toBe(0x50);
    expect(buffer[1]).toBe(0x4b);
    const { value } = await mammoth.extractRawText({ buffer });
    expect(value.trim()).toBe(minimalCv.name);
  });

  it("preserves a very long bullet and a multi-paragraph summary intact", async () => {
    const buffer = await toDocxBuffer(longContentCv);
    const { value } = await mammoth.extractRawText({ buffer });
    expect(value).toContain(longContentCv.experience[0].bullets[0]);
    expect(value).toContain("Paragraph one.");
    expect(value).toContain("Paragraph two.");
    expect(value).toContain("Paragraph three.");
  });

  it("preserves unicode content (CJK, Arabic, Hebrew, emoji) without mangling", async () => {
    const buffer = await toDocxBuffer(unicodeCv);
    const { value } = await mammoth.extractRawText({ buffer });
    expect(value).toContain(unicodeCv.name);
    expect(value).toContain(unicodeCv.summary);
    expect(value).toContain(unicodeCv.experience[0].company);
    expect(value).toContain(unicodeCv.experience[0].bullets[0]);
    expect(value).toContain(unicodeCv.experience[0].bullets[1]);
  });
});
