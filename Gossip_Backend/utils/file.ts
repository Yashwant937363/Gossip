import fs from "node:fs/promises";

/**
 * Safely deletes a temporary file from disk if it exists.
 * Ignores ENOENT so callers can invoke it unconditionally in finally blocks.
 */
export async function removeFile(filePath?: string): Promise<void> {
  if (!filePath) return;

  try {
    await fs.unlink(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }
}
