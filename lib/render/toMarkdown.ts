import { contactParts, type Cv } from "../schema";

export function toMarkdown(cv: Cv): string {
  const lines: string[] = [];

  lines.push(`# ${cv.name}`);
  if (cv.title) lines.push(`### ${cv.title}`);

  const contactLine = contactParts(cv).join(" | ");
  if (contactLine) lines.push(contactLine);

  if (cv.summary) {
    lines.push("", "## Summary", cv.summary);
  }

  if (cv.skills.length) {
    lines.push("", "## Skills", cv.skills.join(", "));
  }

  if (cv.experience.length) {
    lines.push("", "## Experience");
    for (const job of cv.experience) {
      lines.push(`### ${job.role} — ${job.company}`);
      if (job.dates) lines.push(`*${job.dates}*`);
      for (const bullet of job.bullets) lines.push(`- ${bullet}`);
      lines.push("");
    }
  }

  if (cv.education.length) {
    lines.push("## Education");
    for (const edu of cv.education) {
      const dates = edu.dates ? ` (${edu.dates})` : "";
      lines.push(`- **${edu.degree}**, ${edu.school}${dates}`);
    }
  }

  if (cv.certifications.length) {
    lines.push("", "## Certifications");
    for (const cert of cv.certifications) lines.push(`- ${cert}`);
  }

  return lines.join("\n");
}
