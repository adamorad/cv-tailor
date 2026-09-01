import { extractText, getDocumentProxy } from "unpdf";
import mammoth from "mammoth";

export async function extractTextFromFile(
  buffer: Uint8Array,
  filename: string,
): Promise<string> {
  const lower = filename.toLowerCase();

  if (lower.endsWith(".pdf")) {
    const pdf = await getDocumentProxy(buffer);
    const { text } = await extractText(pdf, { mergePages: true });
    return text;
  }

  if (lower.endsWith(".docx")) {
    const { value } = await mammoth.extractRawText({
      buffer: Buffer.from(buffer),
    });
    return value;
  }

  throw new Error(`Unsupported file type: ${filename}`);
}
