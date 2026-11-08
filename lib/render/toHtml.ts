import { contactBasicParts, type Cv } from "../schema";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function toHtml(cv: Cv): string {
  const contactLine = contactBasicParts(cv).map(esc).join(" &middot; ");

  const links = cv.contact.links
    .filter(Boolean)
    .map((l) =>
      /^https?:\/\//i.test(l) ? `<a href="${esc(l)}">${esc(l)}</a>` : esc(l),
    )
    .join(" &middot; ");

  const skills = cv.skillGroups.length
    ? `<section><h2>Core Skills</h2><table class="skills">${cv.skillGroups
        .map(
          (g) =>
            `<tr><td class="label">${esc(g.label)}</td><td>${g.items
              .map(esc)
              .join(" &middot; ")}</td></tr>`,
        )
        .join("")}</table></section>`
    : "";

  const experience = cv.experience.length
    ? `<section><h2>Experience</h2>${cv.experience
        .map(
          (job) => `
      <article>
        <div class="row">
          <h3>${esc(job.role)} &mdash; ${esc(job.company)}</h3>
          ${job.dates ? `<span class="dates">${esc(job.dates)}</span>` : ""}
        </div>
        ${job.location ? `<p class="location">${esc(job.location)}</p>` : ""}
        <ul>${job.bullets.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>
      </article>`,
        )
        .join("")}</section>`
    : "";

  const education = cv.education.length
    ? `<section><h2>Education</h2>${cv.education
        .map(
          (edu) => `
      <div class="row">
        <p><strong>${esc(edu.degree)}</strong>${edu.school ? `, ${esc(edu.school)}` : ""}</p>
        ${edu.dates ? `<span class="dates">${esc(edu.dates)}</span>` : ""}
      </div>`,
        )
        .join("")}</section>`
    : "";

  const certifications = cv.certifications.length
    ? `<section><h2>Certifications</h2><p>${cv.certifications.map(esc).join(" &middot; ")}</p></section>`
    : "";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${esc(cv.name)}${cv.title ? ` — ${esc(cv.title)}` : ""}</title>
<style>
  @page { size: letter; margin: 0.55in; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; max-width: 760px; margin: 2rem auto; padding: 0 1rem; color: #1a1a1a; line-height: 1.35; font-size: 13px; }
  h1 { margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.01em; }
  h2 { border-bottom: 1px solid #b9cfe0; color: #155ea6; text-transform: uppercase; letter-spacing: 0.03em; font-size: 12px; padding-bottom: 0.25rem; margin: 1.1rem 0 0.5rem; }
  h3 { margin: 0; font-size: 13px; font-weight: 600; }
  .subtitle { font-weight: 600; color: #444; margin: 0.2rem 0 0; font-size: 13.5px; }
  .contact { color: #555; margin: 0.25rem 0 0; font-size: 12px; }
  .row { display: flex; justify-content: space-between; align-items: baseline; gap: 0.75rem; }
  .dates, .location { color: #666; font-size: 11.5px; white-space: nowrap; }
  .location { font-style: italic; margin: 0 0 0.15rem; }
  section p { margin: 0.2rem 0; }
  article { margin-bottom: 0.6rem; }
  ul { margin: 0.25rem 0 0; padding-left: 1.1rem; }
  li { margin: 0.1rem 0; color: #333; }
  table.skills { border-collapse: collapse; width: 100%; }
  table.skills td { vertical-align: top; padding: 0.12rem 0; font-size: 12.5px; }
  table.skills td.label { font-weight: 600; width: 180px; padding-right: 0.75rem; white-space: nowrap; }
  @media print {
    body { margin: 0 auto; }
  }
</style>
</head>
<body>
  <h1>${esc(cv.name)}</h1>
  ${cv.title ? `<p class="subtitle">${esc(cv.title)}</p>` : ""}
  <p class="contact">${contactLine}${contactLine && links ? " &middot; " : ""}${links}</p>
  ${cv.summary ? `<section><h2>Summary</h2><p>${esc(cv.summary)}</p></section>` : ""}
  ${skills}
  ${experience}
  ${education}
  ${certifications}
</body>
</html>`;
}
