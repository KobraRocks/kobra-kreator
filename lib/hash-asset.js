import { basename } from "@std/path";

/**
 * Generate a filename with an 8-character SHA-1 hash of the file's contents.
 *
 * @param {string} filePath Absolute path to the asset file.
 * @returns {Promise<string>} Basename including hash before the extension.
 */
export async function hashAssetName(filePath) {
  const data = await Deno.readFile(filePath);
  const buf = await crypto.subtle.digest("SHA-1", data);
  const hash = Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 8);
  const base = basename(filePath);
  const idx = base.lastIndexOf(".");
  if (idx === -1) return `${base}.${hash}`;
  const name = base.slice(0, idx);
  const ext = base.slice(idx);
  return `${name}.${hash}${ext}`;
}
