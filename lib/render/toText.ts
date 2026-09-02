import { contactParts, type Cv } from "../schema";

/** Renders a `Cv` to plain text. Pure and client-safe — no server round-trip. */
export function toText(cv: Cv): string {
  const lines: string[] = [];

  lines.push(cv.name.toUpperCase());
  if (cv.title) lines.push(cv.title);

  const contactLine = contactParts(cv).join(" | ");
  if (contactLine) lines.push(contactLine);

  if (cv.summary) {
    lines.push("", "SUMMARY", cv.summary);
  }

  if (cv.skills.length) {
    lines.push("", "SKILLS", cv.skills.join(", "));
  }

  if (cv.experience.length) {
    lines.push("", "EXPERIENCE");
    for (const job of cv.experience) {
      lines.push(
        `${job.role} - ${job.company}${job.dates ? ` (${job.dates})` : ""}`,
      );
      for (const bullet of job.bullets) lines.push(`  * ${bullet}`);
      lines.push("");
    }
  }

  if (cv.education.length) {
    lines.push("EDUCATION");
    for (const edu of cv.education) {
      const dates = edu.dates ? ` (${edu.dates})` : "";
      lines.push(`${edu.degree}, ${edu.school}${dates}`);
    }
  }

  if (cv.certifications.length) {
    lines.push("", "CERTIFICATIONS");
    for (const cert of cv.certifications) lines.push(`  * ${cert}`);
  }

  return lines.join("\n");
}
