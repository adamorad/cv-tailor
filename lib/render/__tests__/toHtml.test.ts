import { describe, expect, it } from "vitest";
import { toHtml } from "../toHtml";
import { sampleCv } from "./fixtures";

describe("toHtml", () => {
  it("includes plain text content", () => {
    const html = toHtml(sampleCv);
    expect(html).toContain(sampleCv.name);
    expect(html).toContain(sampleCv.summary);
  });

  it("escapes an injected script in a contact link instead of rendering it", () => {
    const malicious = 'https://example.com/"><script>alert(1)</script>';
    const cv = {
      ...sampleCv,
      contact: { ...sampleCv.contact, links: [malicious] },
    };
    const html = toHtml(cv);
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&quot;");
    expect(html).toContain("&lt;");
  });

  it("does not render a javascript: link as a clickable href", () => {
    const cv = {
      ...sampleCv,
      contact: { ...sampleCv.contact, links: ["javascript:alert(1)"] },
    };
    const html = toHtml(cv);
    expect(html).not.toContain('href="javascript:');
  });
});
