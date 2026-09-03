import { describe, expect, it, vi } from "vitest";
import { statfs } from "node:fs/promises";
import { getAvailableBytes } from "../diskSpace";

vi.mock("node:fs/promises", () => ({
  statfs: vi.fn(),
}));

describe("getAvailableBytes", () => {
  it("multiplies available blocks by block size", async () => {
    vi.mocked(statfs).mockResolvedValue({
      bavail: 1000,
      bsize: 4096,
    } as Awaited<ReturnType<typeof statfs>>);

    expect(await getAvailableBytes("/tmp")).toBe(1000 * 4096);
  });

  it("passes the given path through to statfs", async () => {
    vi.mocked(statfs).mockResolvedValue({
      bavail: 0,
      bsize: 4096,
    } as Awaited<ReturnType<typeof statfs>>);

    await getAvailableBytes("/some/path");
    expect(statfs).toHaveBeenCalledWith("/some/path");
  });
});
