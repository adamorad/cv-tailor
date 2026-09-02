import { describe, expect, it } from "vitest";
import { toMarkdown } from "../toMarkdown";
import { sampleCv } from "./fixtures";

describe("toMarkdown", () => {
  it("includes name, summary, skills, and experience content", () => {
    const md = toMarkdown(sampleCv);
    expect(md).toContain(sampleCv.name);
    expect(md).toContain(sampleCv.summary);
    expect(md).toContain(sampleCv.skills[0]);
    expect(md).toContain(sampleCv.experience[0].company);
    expect(md).toContain(sampleCv.experience[0].bullets[0]);
  });
});
