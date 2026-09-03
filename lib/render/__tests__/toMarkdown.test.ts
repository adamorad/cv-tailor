import { describe, expect, it } from "vitest";
import { toMarkdown } from "../toMarkdown";
import {
  emptyOptionalSectionsCv,
  longContentCv,
  markdownSpecialCharsCv,
  minimalCv,
  sampleCv,
  unicodeCv,
} from "./fixtures";

describe("toMarkdown", () => {
  it("includes name, summary, skills, and experience content", () => {
    const md = toMarkdown(sampleCv);
    expect(md).toContain(sampleCv.name);
    expect(md).toContain(sampleCv.summary);
    expect(md).toContain(sampleCv.skills[0]);
    expect(md).toContain(sampleCv.experience[0].company);
    expect(md).toContain(sampleCv.experience[0].bullets[0]);
  });

  it("omits headings for empty skills, experience, and certifications sections", () => {
    const md = toMarkdown(emptyOptionalSectionsCv);
    expect(md).not.toContain("## Skills");
    expect(md).not.toContain("## Experience");
    expect(md).not.toContain("## Certifications");
    // Populated sections are unaffected.
    expect(md).toContain("## Summary");
    expect(md).toContain("## Education");
  });

  it("renders only the name heading for a Cv with just the bare minimum populated", () => {
    const md = toMarkdown(minimalCv);
    expect(md).toBe(`# ${minimalCv.name}`);
  });

  it("preserves a very long bullet and a multi-paragraph summary intact", () => {
    const md = toMarkdown(longContentCv);
    expect(md).toContain(longContentCv.summary);
    expect(md).toContain(longContentCv.experience[0].bullets[0]);
  });

  it("preserves unicode content (CJK, Arabic, Hebrew, emoji)", () => {
    const md = toMarkdown(unicodeCv);
    expect(md).toContain(unicodeCv.name);
    expect(md).toContain(unicodeCv.summary);
    expect(md).toContain(unicodeCv.experience[0].company);
    expect(md).toContain(unicodeCv.experience[0].bullets[0]);
    expect(md).toContain(unicodeCv.experience[0].bullets[1]);
  });

  it("does not strip or misplace markdown-significant characters in ordinary content", () => {
    const md = toMarkdown(markdownSpecialCharsCv);
    const job = markdownSpecialCharsCv.experience[0];
    expect(md).toContain(`### ${job.role} — ${job.company}`);
    expect(md).toContain(`- ${job.bullets[0]}`);
    expect(md).toContain(`- ${job.bullets[1]}`);
    expect(md).toContain(markdownSpecialCharsCv.skills.join(", "));
  });
});
