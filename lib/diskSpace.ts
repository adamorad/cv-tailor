import { statfs } from "node:fs/promises";

/** Available bytes on the volume containing `path`, as an unprivileged user can use them. */
export async function getAvailableBytes(path: string): Promise<number> {
  const stats = await statfs(path);
  return stats.bavail * stats.bsize;
}
