import { describe, expect, it } from "vitest";
import { toText } from "../toText";
import { sampleCv } from "./fixtures";

describe("toText", () => {
  it("includes name, summary, skills, and experience content", () => {
    const text = toText(sampleCv);
    expect(text).toContain(sampleCv.name.toUpperCase());
    expect(text).toContain(sampleCv.summary);
    expect(text).toContain(sampleCv.skills[0]);
    expect(text).toContain(sampleCv.experience[0].company);
    expect(text).toContain(sampleCv.experience[0].bullets[0]);
  });
});
