import { extractTextFromFile } from "@/lib/parseFile";

const MAX_FILE_BYTES = 20 * 1024 * 1024; // 20MB

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return Response.json({ error: "No file provided" }, { status: 400 });
  }

  if (file.size > MAX_FILE_BYTES) {
    return Response.json(
      { error: "File is too large (max 20MB)" },
      { status: 413 },
    );
  }

  try {
    const buffer = new Uint8Array(await file.arrayBuffer());
    const text = await extractTextFromFile(buffer, file.name);
    return Response.json({ text });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to parse file";
    return Response.json({ error: message }, { status: 422 });
  }
}
