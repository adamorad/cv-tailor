import { cvSchema } from "@/lib/schema";
import { sanitizeFilenameBase } from "@/lib/filename";

export async function POST(request: Request) {
  let body: { cv?: unknown; format?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = cvSchema.safeParse(body.cv);
  if (!parsed.success) {
    return Response.json({ error: "Invalid CV payload" }, { status: 400 });
  }

  const format = body.format;
  if (format !== "docx" && format !== "pdf") {
    return Response.json(
      { error: "format must be 'docx' or 'pdf'" },
      { status: 400 },
    );
  }

  const filenameBase = sanitizeFilenameBase(parsed.data.name);

  if (format === "docx") {
    const { toDocxBuffer } = await import("@/lib/render/toDocx");
    const buffer = await toDocxBuffer(parsed.data);
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${filenameBase}.docx"`,
      },
    });
  }

  const { toPdfBuffer } = await import("@/lib/render/toPdf");
  const buffer = await toPdfBuffer(parsed.data);
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filenameBase}.pdf"`,
    },
  });
}
