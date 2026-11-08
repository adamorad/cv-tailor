import path from "node:path";
import pdfMake from "pdfmake";
import type { Content } from "pdfmake";
import { contactParts, type Cv } from "../schema";

const ROBOTO_DIR = path.join(
  process.cwd(),
  "node_modules/pdfmake/fonts/Roboto",
);

pdfMake.setFonts({
  Roboto: {
    normal: path.join(ROBOTO_DIR, "Roboto-Regular.ttf"),
    bold: path.join(ROBOTO_DIR, "Roboto-Medium.ttf"),
    italics: path.join(ROBOTO_DIR, "Roboto-Italic.ttf"),
    bolditalics: path.join(ROBOTO_DIR, "Roboto-MediumItalic.ttf"),
  },
});
pdfMake.setLocalAccessPolicy(() => true);

const ACCENT = "#155ea6";
const MUTED = "#5a6472";

function dateRow(
  label: Content,
  dates: string,
  margin: [number, number, number, number],
): Content {
  return {
    columns: [
      label,
      {
        text: dates,
        alignment: "right",
        fontSize: 9,
        color: MUTED,
        width: "auto",
      },
    ],
    columnGap: 8,
    margin,
  };
}

export async function toPdfBuffer(cv: Cv): Promise<Buffer> {
  const content: Content[] = [{ text: cv.name, style: "name" }];
  if (cv.title) content.push({ text: cv.title, style: "title" });

  const contactLine = contactParts(cv).join("   ·   ");
  if (contactLine) content.push({ text: contactLine, style: "contact" });

  if (cv.summary) {
    content.push({ text: "Summary", style: "sectionHeading" });
    content.push({ text: cv.summary, margin: [0, 0, 0, 6] });
  }

  if (cv.skillGroups.length) {
    content.push({ text: "Core Skills", style: "sectionHeading" });
    content.push({
      table: {
        widths: [130, "*"],
        body: cv.skillGroups.map((g) => [
          { text: g.label, bold: true, fontSize: 9.5 },
          { text: g.items.join(" · "), fontSize: 9.5 },
        ]),
      },
      layout: "noBorders",
      margin: [0, 0, 0, 6],
    });
  }

  if (cv.experience.length) {
    content.push({ text: "Experience", style: "sectionHeading" });
    for (const job of cv.experience) {
      content.push(
        dateRow(
          { text: `${job.role} — ${job.company}`, bold: true, fontSize: 10 },
          job.dates,
          [0, 5, 0, 0],
        ),
      );
      if (job.location)
        content.push({
          text: job.location,
          italics: true,
          fontSize: 9,
          color: MUTED,
        });
      if (job.bullets.length) {
        content.push({
          ul: job.bullets,
          fontSize: 9.5,
          margin: [0, 2, 0, 2],
        });
      }
    }
  }

  if (cv.education.length) {
    content.push({ text: "Education", style: "sectionHeading" });
    for (const edu of cv.education) {
      content.push(
        dateRow(
          {
            text: [
              { text: edu.degree, bold: true },
              edu.school ? `, ${edu.school}` : "",
            ],
            fontSize: 9.5,
          },
          edu.dates,
          [0, 1, 0, 1],
        ),
      );
    }
  }

  if (cv.certifications.length) {
    content.push({ text: "Certifications", style: "sectionHeading" });
    content.push({ text: cv.certifications.join("  ·  "), fontSize: 9.5 });
  }

  const doc = pdfMake.createPdf(
    {
      content,
      defaultStyle: { font: "Roboto", fontSize: 9.5, lineHeight: 1.15 },
      styles: {
        name: { fontSize: 19, bold: true },
        title: { fontSize: 11, bold: true, color: "#444444", margin: [0, 2, 0, 2] },
        contact: { fontSize: 9, color: MUTED, margin: [0, 0, 0, 8] },
        sectionHeading: {
          fontSize: 10.5,
          bold: true,
          color: ACCENT,
          margin: [0, 8, 0, 3],
        },
      },
      pageSize: "LETTER",
      pageMargins: [40, 36, 40, 36],
    },
    {},
  );

  return doc.getBuffer();
}
