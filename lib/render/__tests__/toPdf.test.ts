import { describe, expect, it } from "vitest";
import { toPdfBuffer } from "../toPdf";
import { sampleCv } from "./fixtures";

describe("toPdfBuffer", () => {
  it("resolves to a non-empty Buffer starting with the PDF magic bytes", async () => {
    const buffer = await toPdfBuffer(sampleCv);
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(0);
    expect(buffer.subarray(0, 4).toString("ascii")).toBe("%PDF");
  });
});
