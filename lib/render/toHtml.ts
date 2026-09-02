import { contactBasicParts, type Cv } from "../schema";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Renders a `Cv` to a standalone HTML document. Pure and client-safe — no
 * server round-trip. Escapes all field values and only linkifies `http(s)://`
 * contact links, to prevent an LLM-generated field from injecting markup.
 */
export function toHtml(cv: Cv): string {
  const contactLine = contactBasicParts(cv).map(esc).join(" &middot; ");

  const links = cv.contact.links
    .filter(Boolean)
    .map((l) =>
      /^https?:\/\//i.test(l) ? `<a href="${esc(l)}">${esc(l)}</a>` : esc(l),
    )
    .join(" &middot; ");

  const skills = cv.skills.length
    ? `<section><h2>Skills</h2><p>${cv.skills.map(esc).join(", ")}</p></section>`
    : "";

  const experience = cv.experience.length
    ? `<section><h2>Experience</h2>${cv.experience
        .map(
          (job) => `
      <article>
        <h3>${esc(job.role)} &mdash; ${esc(job.company)}</h3>
        ${job.dates ? `<p class="dates">${esc(job.dates)}</p>` : ""}
        <ul>${job.bullets.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>
      </article>`,
        )
        .join("")}</section>`
    : "";

  const education = cv.education.length
    ? `<section><h2>Education</h2><ul>${cv.education
        .map(
          (edu) =>
            `<li><strong>${esc(edu.degree)}</strong>, ${esc(edu.school)}${
              edu.dates ? ` (${esc(edu.dates)})` : ""
            }</li>`,
        )
        .join("")}</ul></section>`
    : "";

  const certifications = cv.certifications.length
    ? `<section><h2>Certifications</h2><ul>${cv.certifications
        .map((c) => `<li>${esc(c)}</li>`)
        .join("")}</ul></section>`
    : "";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${esc(cv.name)}${cv.title ? ` — ${esc(cv.title)}` : ""}</title>
<style>
  body { font-family: system-ui, sans-serif; max-width: 720px; margin: 2rem auto; padding: 0 1rem; color: #1a1a1a; line-height: 1.5; }
  h1 { margin-bottom: 0.1rem; }
  h2 { border-bottom: 1px solid #ccc; padding-bottom: 0.2rem; margin-top: 2rem; }
  .dates { color: #666; font-style: italic; margin: 0.1rem 0 0.4rem; }
  .contact { color: #444; margin-top: 0.2rem; }
</style>
</head>
<body>
  <h1>${esc(cv.name)}</h1>
  ${cv.title ? `<p>${esc(cv.title)}</p>` : ""}
  <p class="contact">${contactLine}${contactLine && links ? " &middot; " : ""}${links}</p>
  ${cv.summary ? `<section><h2>Summary</h2><p>${esc(cv.summary)}</p></section>` : ""}
  ${skills}
  ${experience}
  ${education}
  ${certifications}
</body>
</html>`;
}
