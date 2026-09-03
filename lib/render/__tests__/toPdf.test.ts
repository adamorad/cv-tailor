import { describe, expect, it } from "vitest";
import { extractText, getDocumentProxy } from "unpdf";
import { toPdfBuffer } from "../toPdf";
import {
  accentedLatinCv,
  emptyOptionalSectionsCv,
  longContentCv,
  minimalCv,
  sampleCv,
  unicodeCv,
} from "./fixtures";

async function textOf(buffer: Buffer): Promise<string> {
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractText(pdf, { mergePages: true });
  return text;
}

describe("toPdfBuffer", () => {
  it("resolves to a non-empty Buffer starting with the PDF magic bytes", async () => {
    const buffer = await toPdfBuffer(sampleCv);
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(0);
    expect(buffer.subarray(0, 4).toString("ascii")).toBe("%PDF");
  });

  it("omits headings for empty skills, experience, and certifications sections", async () => {
    const buffer = await toPdfBuffer(emptyOptionalSectionsCv);
    const text = await textOf(buffer);
    // Match the heading as a standalone line, since "Experience" is also a
    // substring of the (unrelated, still-present) "Experienced engineer..."
    // summary sentence in the shared sampleCv fixture.
    expect(text).not.toMatch(/(^|\n)Skills(\n|$)/);
    expect(text).not.toMatch(/(^|\n)Experience(\n|$)/);
    expect(text).not.toMatch(/(^|\n)Certifications(\n|$)/);
    expect(text).toContain("Summary");
    expect(text).toContain("Education");
  });

  it("produces a valid document for a Cv with just the bare minimum populated", async () => {
    const buffer = await toPdfBuffer(minimalCv);
    expect(buffer.subarray(0, 4).toString("ascii")).toBe("%PDF");
    const text = await textOf(buffer);
    expect(text).toContain(minimalCv.name);
  });

  it("preserves a very long bullet and a multi-paragraph summary intact", async () => {
    const buffer = await toPdfBuffer(longContentCv);
    const text = await textOf(buffer);
    expect(text).toContain("Paragraph one.");
    expect(text).toContain("Paragraph three.");
    // PDF is page-based and word-wraps long text across lines, so the long
    // bullet won't survive as one unbroken substring like it does in the
    // other formats — instead confirm it wasn't truncated, by counting how
    // many times its repeated phrase appears.
    const repeats = (text.match(/Shipped a feature\./g) ?? []).length;
    expect(repeats).toBe(200);
  });

  it("preserves accented Latin content (the bundled Roboto font's script coverage)", async () => {
    const buffer = await toPdfBuffer(accentedLatinCv);
    const text = await textOf(buffer);
    expect(text).toContain(accentedLatinCv.name);
    expect(text).toContain(accentedLatinCv.summary);
    expect(text).toContain(accentedLatinCv.experience[0].bullets[0]);
  });

  it("does not mutate the input Cv's bullet and certification arrays", async () => {
    // Regression test: pdfmake mutates `ul` array elements in place during
    // layout. Passing `job.bullets`/`cv.certifications` by reference (as
    // opposed to a copy) corrupted the caller's Cv, replacing each bullet
    // string with an internal pdfmake layout object after export.
    const cv = structuredClone(sampleCv);
    const bulletsBefore = [...cv.experience[0].bullets];
    const certsBefore = [...cv.certifications];

    await toPdfBuffer(cv);

    expect(cv.experience[0].bullets).toEqual(bulletsBefore);
    expect(cv.certifications).toEqual(certsBefore);
    expect(cv.experience[0].bullets.every((b) => typeof b === "string")).toBe(
      true,
    );
    expect(cv.certifications.every((c) => typeof c === "string")).toBe(true);
  });

  // The bundled Roboto font only covers Latin script, so glyphs outside that
  // (CJK, Arabic, Hebrew, emoji) currently render as missing/blank glyphs
  // rather than the source text (a known limitation, not something this
  // renderer can fix without bundling additional fonts). What matters here
  // is that non-Latin content doesn't crash generation or corrupt the file.
  it("does not throw and still produces a valid PDF for non-Latin/emoji content", async () => {
    const buffer = await toPdfBuffer(unicodeCv);
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(0);
    expect(buffer.subarray(0, 4).toString("ascii")).toBe("%PDF");
    // Sanity check the document is still readable/well-formed.
    await expect(textOf(buffer)).resolves.toEqual(expect.any(String));
  });
});
