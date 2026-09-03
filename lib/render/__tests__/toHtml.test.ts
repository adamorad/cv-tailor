import { describe, expect, it } from "vitest";
import { toHtml } from "../toHtml";
import {
  emptyOptionalSectionsCv,
  htmlSpecialCharsCv,
  minimalCv,
  sampleCv,
  unicodeCv,
} from "./fixtures";

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

  it("escapes <, >, &, and quotes in ordinary fields like name, role, and bullets", () => {
    const html = toHtml(htmlSpecialCharsCv);
    const job = htmlSpecialCharsCv.experience[0];
    expect(html).not.toContain(htmlSpecialCharsCv.name);
    expect(html).not.toContain(job.company);
    expect(html).not.toContain(job.role);
    expect(html).not.toContain(job.bullets[0]);
    expect(html).toContain("A &amp; B &lt;Corp&gt; &quot;Elite&quot;");
    expect(html).toContain("R&amp;D &lt;Team&gt; &#39;special&#39;");
    expect(html).toContain("Eng&lt;ineer&gt;");
    expect(html).toContain("Built &lt;widget&gt; &amp; &quot;tools&quot;");
  });

  it("omits section markup for empty skills, experience, and certifications", () => {
    const html = toHtml(emptyOptionalSectionsCv);
    expect(html).not.toContain("<h2>Skills</h2>");
    expect(html).not.toContain("<h2>Experience</h2>");
    expect(html).not.toContain("<h2>Certifications</h2>");
    expect(html).toContain("<h2>Summary</h2>");
    expect(html).toContain("<h2>Education</h2>");
  });

  it("renders a valid minimal document for a Cv with just the bare minimum populated", () => {
    const html = toHtml(minimalCv);
    expect(html).toContain("<!doctype html>");
    expect(html).toContain(`<h1>${minimalCv.name}</h1>`);
    expect(html).not.toContain("undefined");
    expect(html).not.toContain("<section>");
  });

  it("preserves unicode content (CJK, Arabic, Hebrew, emoji) unescaped", () => {
    const html = toHtml(unicodeCv);
    expect(html).toContain(unicodeCv.name);
    expect(html).toContain(unicodeCv.summary);
    expect(html).toContain(unicodeCv.experience[0].bullets[0]);
  });
});
