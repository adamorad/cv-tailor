import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  TabStopType,
  BorderStyle,
  convertInchesToTwip,
} from "docx";
import { contactParts, type Cv } from "../schema";

const ACCENT = "155EA6";
const MUTED = "5A6472";
const PAGE_WIDTH_TWIP = convertInchesToTwip(8.5 - 2 * 0.55);

function heading(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text: text.toUpperCase(), bold: true, color: ACCENT, size: 18 })],
    spacing: { before: 220, after: 90 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "B9CFE0" } },
  });
}

function dateLine(left: string, dates: string, boldLeft = true): Paragraph {
  return new Paragraph({
    tabStops: [{ type: TabStopType.RIGHT, position: PAGE_WIDTH_TWIP }],
    children: [
      new TextRun({ text: left, bold: boldLeft, size: 20 }),
      ...(dates
        ? [new TextRun({ text: `\t${dates}`, color: MUTED, size: 18 })]
        : []),
    ],
    spacing: { before: 100 },
  });
}

function bullet(text: string): Paragraph {
  return new Paragraph({
    text,
    bullet: { level: 0 },
    spacing: { after: 20 },
    run: { size: 19 },
  });
}

export async function toDocxBuffer(cv: Cv): Promise<Buffer> {
  const children: Paragraph[] = [];

  children.push(
    new Paragraph({
      children: [new TextRun({ text: cv.name, bold: true, size: 34 })],
    }),
  );
  if (cv.title)
    children.push(
      new Paragraph({
        children: [new TextRun({ text: cv.title, bold: true, size: 21, color: "444444" })],
        spacing: { after: 40 },
      }),
    );

  const contactLine = contactParts(cv).join("   ·   ");
  if (contactLine)
    children.push(
      new Paragraph({
        children: [new TextRun({ text: contactLine, size: 18, color: MUTED })],
      }),
    );

  if (cv.summary) {
    children.push(heading("Summary"));
    children.push(new Paragraph({ children: [new TextRun({ text: cv.summary, size: 19 })] }));
  }

  if (cv.skillGroups.length) {
    children.push(heading("Core Skills"));
    for (const g of cv.skillGroups) {
      children.push(
        new Paragraph({
          tabStops: [{ type: TabStopType.LEFT, position: convertInchesToTwip(1.8) }],
          children: [
            new TextRun({ text: g.label, bold: true, size: 19 }),
            new TextRun({ text: `\t${g.items.join(" · ")}`, size: 19 }),
          ],
          spacing: { after: 20 },
        }),
      );
    }
  }

  if (cv.experience.length) {
    children.push(heading("Experience"));
    for (const job of cv.experience) {
      children.push(dateLine(`${job.role} — ${job.company}`, job.dates));
      if (job.location)
        children.push(
          new Paragraph({
            children: [new TextRun({ text: job.location, italics: true, size: 18, color: MUTED })],
          }),
        );
      for (const b of job.bullets) children.push(bullet(b));
    }
  }

  if (cv.education.length) {
    children.push(heading("Education"));
    for (const edu of cv.education) {
      const left = `${edu.degree}${edu.school ? `, ${edu.school}` : ""}`;
      children.push(dateLine(left, edu.dates, false));
    }
  }

  if (cv.certifications.length) {
    children.push(heading("Certifications"));
    children.push(
      new Paragraph({
        children: [new TextRun({ text: cv.certifications.join("  ·  "), size: 19 })],
      }),
    );
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(0.55),
              bottom: convertInchesToTwip(0.55),
              left: convertInchesToTwip(0.55),
              right: convertInchesToTwip(0.55),
            },
          },
        },
        children,
      },
    ],
  });
  return Packer.toBuffer(doc);
}
