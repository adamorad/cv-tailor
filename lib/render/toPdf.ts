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

/** Renders a `Cv` to a PDF file buffer. Server-side only (see `app/api/export/route.ts`). */
export async function toPdfBuffer(cv: Cv): Promise<Buffer> {
  const content: Content[] = [{ text: cv.name, style: "name" }];
  if (cv.title) content.push({ text: cv.title, style: "title" });

  const contactLine = contactParts(cv).join("  |  ");
  if (contactLine) content.push({ text: contactLine, style: "contact" });

  if (cv.summary) {
    content.push({ text: "Summary", style: "sectionHeading" });
    content.push({ text: cv.summary, margin: [0, 0, 0, 8] });
  }

  if (cv.skills.length) {
    content.push({ text: "Skills", style: "sectionHeading" });
    content.push({ text: cv.skills.join(", "), margin: [0, 0, 0, 8] });
  }

  if (cv.experience.length) {
    content.push({ text: "Experience", style: "sectionHeading" });
    for (const job of cv.experience) {
      content.push({
        text: `${job.role} — ${job.company}`,
        bold: true,
        margin: [0, 6, 0, 0],
      });
      if (job.dates)
        content.push({ text: job.dates, italics: true, color: "#555555" });
      if (job.bullets.length) {
        // Copy: pdfmake mutates `ul` array elements in place during layout,
        // which would otherwise corrupt the caller's Cv object.
        content.push({ ul: [...job.bullets], margin: [0, 2, 0, 4] });
      }
    }
  }

  if (cv.education.length) {
    content.push({ text: "Education", style: "sectionHeading" });
    content.push({
      ul: cv.education.map(
        (edu) =>
          `${edu.degree}, ${edu.school}${edu.dates ? ` (${edu.dates})` : ""}`,
      ),
      margin: [0, 2, 0, 8],
    });
  }

  if (cv.certifications.length) {
    content.push({ text: "Certifications", style: "sectionHeading" });
    // Copy: pdfmake mutates `ul` array elements in place during layout,
    // which would otherwise corrupt the caller's Cv object.
    content.push({ ul: [...cv.certifications] });
  }

  const doc = pdfMake.createPdf(
    {
      content,
      defaultStyle: { font: "Roboto", fontSize: 10 },
      styles: {
        name: { fontSize: 20, bold: true },
        title: { fontSize: 12, color: "#444444", margin: [0, 0, 0, 4] },
        contact: { fontSize: 9, color: "#444444", margin: [0, 0, 0, 10] },
        sectionHeading: { fontSize: 13, bold: true, margin: [0, 10, 0, 4] },
      },
      pageMargins: [40, 40, 40, 40],
    },
    {},
  );

  return doc.getBuffer();
}
