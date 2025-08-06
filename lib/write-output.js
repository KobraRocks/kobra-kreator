import { dirname, join, relative } from "@std/path";

/**
 * Write the rendered HTML document to its destination and format it.
 *
 * @param {import('@b-fuze/deno-dom').DOMDocument} doc DOM document to write.
 * @param {string} path Absolute path to the source file.
 * @param {string} siteDir Site root directory.
 * @param {string} distant Output directory for generated files.
 * @param {boolean} pretty Whether to use pretty URLs.
 * @returns {Promise<void>} Resolves when the file has been written.
 */
export async function writeOutput(doc, path, siteDir, distant, pretty) {
  const rel = relative(siteDir, path).replace(/\\/g, "/");
  const outRel = toOutRel(rel, pretty);
  const outPath = join(distant, outRel);
  await Deno.mkdir(dirname(outPath), { recursive: true });
  const htmlOut = "<!DOCTYPE html>\n" + doc.documentElement.outerHTML;
  await Deno.writeTextFile(outPath, htmlOut);

  const fmtCmd = new Deno.Command(Deno.execPath(), {
    args: ["fmt", outPath],
    stdout: "null",
    stderr: "piped",
  });
  const { code, stderr } = await fmtCmd.output();
  if (code !== 0) {
    throw new Error(`${outPath}: ${new TextDecoder().decode(stderr).trim()}`);
  }
}

/**
 * Determine output file path relative to the distant directory.
 *
 * @param {string} rel Page path relative to the site root.
 * @param {boolean} pretty When true, preserve the original file structure
 * without creating nested `index.html` directories.
 * @returns {string} Relative output path within the distant directory.
 */
export function toOutRel(rel, pretty) {
  const normalized = rel.replace(/\\/g, "/");
  if (pretty) {
    return normalized.replace(/\.(md|html?)$/i, ".html");
  }
  return normalized.replace(/\.(md|html?)$/i, "") + ".html";
}
