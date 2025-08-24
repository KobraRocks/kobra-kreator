import { Database } from "@db/sqlite";
import { join } from "@std/path";
import { ensureDirSync } from "@std/fs";
import { walk } from "@std/fs/walk";
import { getEmoji } from "./emoji.js";

/**
 * SQLite-backed tracker for source files under `src/` and `templates/`.
 * Records modification times to detect added, updated, or removed files
 * between runs so only affected pages are processed.
 *
 * @module source-file-tracker
 */
/**
 * Location of the SQLite database. Placing it under the user's home
 * directory ensures write access across environments.
 *
 * @type {string}
 */
const homeDir = Deno.env.get("HOME") ?? Deno.cwd();
const dbDir = join(homeDir, ".kobra");
ensureDirSync(dbDir);
const dbPath = join(dbDir, "kobra.db");
const db = new Database(dbPath);
// Allow concurrent readers and wait when the database is locked.
db.exec("PRAGMA journal_mode=WAL");
db.exec("PRAGMA busy_timeout = 5000");
db.exec(
  "CREATE TABLE IF NOT EXISTS source_files (path TEXT PRIMARY KEY, mtime TEXT NOT NULL)",
);

/**
 * Walk a directory and compare files to records in the tracking database.
 *
 * @param {string} root Absolute path to the directory to scan.
 * @returns {Promise<{added: [string, number][], modified: [string, number][], removed: string[]}>} File changes.
 */
export async function diffSourceFiles(root) {
  const known = new Map();
  const rows = db.prepare("SELECT path, mtime FROM source_files").all();
  for (const r of rows) known.set(r.path, Number(r.mtime));

  const seen = new Set();
  const added = [];
  const modified = [];

  try {
    for await (const entry of walk(root, { includeDirs: false })) {
      const stat = await Deno.stat(entry.path);
      const mtime = stat.mtime ? stat.mtime.getTime() : 0;
      seen.add(entry.path);
      const prev = known.get(entry.path);
      if (prev === undefined) {
        console.log(`${getEmoji("create")} tracking new file -- ${entry.path}`);
        added.push([entry.path, mtime]);
      } else if (prev !== mtime) {
        console.log(`${getEmoji("update")} detected change -- ${entry.path}`);
        modified.push([entry.path, mtime]);
      }
    }
  } catch (err) {
    if (!(err instanceof Deno.errors.NotFound)) throw err;
  }

  const removed = [];
  for (const [path] of known) {
    if (!seen.has(path)) {
      console.log(`${getEmoji("delete")} missing tracked file -- ${path}`);
      removed.push(path);
    }
  }

  return { added, modified, removed };
}

/**
 * Record or update a file's modification time in the tracking database.
 *
 * @param {string} path Absolute path to the source file.
 * @param {number} mtime Last modification timestamp.
 */
export function recordSourceFile(path, mtime) {
  db.exec(
    "INSERT OR REPLACE INTO source_files (path, mtime) VALUES (?, ?)",
    [path, String(mtime)],
  );
}

/**
 * Remove a source file record from the tracking database.
 *
 * @param {string} path Absolute path to the source file.
 */
export function removeSourceFile(path) {
  db.exec("DELETE FROM source_files WHERE path = ?", [path]);
}

/**
 * Clear all tracked source file records. Primarily used in tests.
 * @returns {void}
 */
export function clearSourceFiles() {
  db.exec("DROP TABLE IF EXISTS source_files");
  db.exec(
    "CREATE TABLE IF NOT EXISTS source_files (path TEXT PRIMARY KEY, mtime TEXT NOT NULL)",
  );
}
