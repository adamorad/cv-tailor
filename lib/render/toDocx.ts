import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";
import { contactParts, type Cv } from "../schema";

function heading(text: string): Paragraph {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 300, after: 150 },
  });
}

function bullet(text: string): Paragraph {
  return new Paragraph({ text, bullet: { level: 0 } });
}

export async function toDocxBuffer(cv: Cv): Promise<Buffer> {
  const children: Paragraph[] = [];

  children.push(new Paragraph({ text: cv.name, heading: HeadingLevel.TITLE }));
  if (cv.title) children.push(new Paragraph({ text: cv.title }));

  const contactLine = contactParts(cv).join(" | ");
  if (contactLine)
    children.push(
      new Paragraph({
        children: [new TextRun({ text: contactLine, italics: true })],
      }),
    );

  if (cv.summary) {
    children.push(heading("Summary"));
    children.push(new Paragraph({ text: cv.summary }));
  }

  if (cv.skills.length) {
    children.push(heading("Skills"));
    children.push(new Paragraph({ text: cv.skills.join(", ") }));
  }

  if (cv.experience.length) {
    children.push(heading("Experience"));
    for (const job of cv.experience) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${job.role} — ${job.company}`, bold: true }),
          ],
          spacing: { before: 150 },
        }),
      );
      if (job.dates)
        children.push(
          new Paragraph({
            children: [new TextRun({ text: job.dates, italics: true })],
          }),
        );
      for (const b of job.bullets) children.push(bullet(b));
    }
  }

  if (cv.education.length) {
    children.push(heading("Education"));
    for (const edu of cv.education) {
      const dates = edu.dates ? ` (${edu.dates})` : "";
      children.push(
        new Paragraph({ text: `${edu.degree}, ${edu.school}${dates}` }),
      );
    }
  }

  if (cv.certifications.length) {
    children.push(heading("Certifications"));
    for (const c of cv.certifications) children.push(bullet(c));
  }

  const doc = new Document({ sections: [{ children }] });
  return Packer.toBuffer(doc);
}
