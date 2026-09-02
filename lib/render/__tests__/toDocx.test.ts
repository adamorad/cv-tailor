import { describe, expect, it } from "vitest";
import { toDocxBuffer } from "../toDocx";
import { sampleCv } from "./fixtures";

describe("toDocxBuffer", () => {
  it("resolves to a non-empty Buffer with the ZIP magic bytes", async () => {
    const buffer = await toDocxBuffer(sampleCv);
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(0);
    expect(buffer[0]).toBe(0x50); // "P"
    expect(buffer[1]).toBe(0x4b); // "K"
  });
});
