import { describe, expect, it } from "vitest";
import { contactBasicParts, contactParts, type Cv } from "../schema";

function makeCv(overrides: Partial<Cv["contact"]>): Cv {
  return {
    name: "Jane Doe",
    title: "Engineer",
    contact: {
      email: "jane@example.com",
      phone: "555-1234",
      location: "Remote",
      links: ["https://example.com/jane"],
      ...overrides,
    },
    summary: "",
    skills: [],
    experience: [],
    education: [],
    certifications: [],
  };
}

describe("contactParts / contactBasicParts", () => {
  it("includes all fields in order when everything is present", () => {
    const cv = makeCv({});
    expect(contactBasicParts(cv)).toEqual([
      "jane@example.com",
      "555-1234",
      "Remote",
    ]);
    expect(contactParts(cv)).toEqual([
      "jane@example.com",
      "555-1234",
      "Remote",
      "https://example.com/jane",
    ]);
  });

  it("excludes empty-string fields", () => {
    const cv = makeCv({ phone: "", location: "" });
    expect(contactBasicParts(cv)).toEqual(["jane@example.com"]);
    expect(contactParts(cv)).toEqual([
      "jane@example.com",
      "https://example.com/jane",
    ]);
  });

  it("contactBasicParts excludes links even when present", () => {
    const cv = makeCv({});
    expect(contactBasicParts(cv)).not.toContain("https://example.com/jane");
  });

  it("contactParts includes links", () => {
    const cv = makeCv({});
    expect(contactParts(cv)).toContain("https://example.com/jane");
  });
});
