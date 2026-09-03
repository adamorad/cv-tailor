import { describe, expect, it } from "vitest";
import { toText } from "../toText";
import {
  emptyOptionalSectionsCv,
  longContentCv,
  minimalCv,
  sampleCv,
  unicodeCv,
} from "./fixtures";

describe("toText", () => {
  it("includes name, summary, skills, and experience content", () => {
    const text = toText(sampleCv);
    expect(text).toContain(sampleCv.name.toUpperCase());
    expect(text).toContain(sampleCv.summary);
    expect(text).toContain(sampleCv.skills[0]);
    expect(text).toContain(sampleCv.experience[0].company);
    expect(text).toContain(sampleCv.experience[0].bullets[0]);
  });

  it("omits headings for empty skills, experience, and certifications sections", () => {
    const text = toText(emptyOptionalSectionsCv);
    expect(text).not.toContain("SKILLS");
    expect(text).not.toContain("EXPERIENCE");
    expect(text).not.toContain("CERTIFICATIONS");
    expect(text).toContain("SUMMARY");
    expect(text).toContain("EDUCATION");
  });

  it("renders only the uppercased name for a Cv with just the bare minimum populated", () => {
    const text = toText(minimalCv);
    expect(text).toBe(minimalCv.name.toUpperCase());
  });

  it("preserves a very long bullet and a multi-paragraph summary intact", () => {
    const text = toText(longContentCv);
    expect(text).toContain(longContentCv.summary);
    expect(text).toContain(longContentCv.experience[0].bullets[0]);
  });

  it("preserves unicode content (CJK, Arabic, Hebrew, emoji)", () => {
    const text = toText(unicodeCv);
    expect(text).toContain(unicodeCv.name.toUpperCase());
    expect(text).toContain(unicodeCv.summary);
    expect(text).toContain(unicodeCv.experience[0].company);
    expect(text).toContain(unicodeCv.experience[0].bullets[0]);
  });
});
