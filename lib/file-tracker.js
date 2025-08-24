import { Database } from "@db/sqlite";
import { join } from "@std/path";
import { ensureDirSync } from "@std/fs";

/**
 * SQLite-backed tracker for files written to distant directories.
 * Records absolute file paths per site so stale files can be cleaned.
 *
 * @module file-tracker
 */
/**
 * Path to the SQLite database tracking emitted files.
 * Located in the user's home directory to ensure write access.
 *
 * @type {string}
 */
const homeDir = Deno.env.get("HOME") ?? Deno.cwd();
const dbDir = join(homeDir, ".kobra");
ensureDirSync(dbDir);
const dbPath = join(dbDir, "kobra.db");
const db = new Database(dbPath);
// Configure SQLite to allow concurrent readers and wait for file locks.
db.exec("PRAGMA journal_mode=WAL");
db.exec("PRAGMA busy_timeout = 5000");
db.exec(
  "CREATE TABLE IF NOT EXISTS tracked_files (site TEXT NOT NULL, path TEXT NOT NULL, PRIMARY KEY (site, path))",
);

/**
 * Record a file for a given site in the tracking database.
 *
 * @param {string} siteDir Absolute path to the site directory.
 * @param {string} filePath Absolute path to the file within the distant directory.
 */
export function trackFile(siteDir, filePath) {
  db.exec(
    "INSERT OR REPLACE INTO tracked_files (site, path) VALUES (?, ?)",
    [siteDir, filePath],
  );
}

/**
 * Remove a tracked file entry and delete the file from disk.
 *
 * @param {string} siteDir Absolute path to the site directory.
 * @param {string} filePath Absolute path to the file within the distant directory.
 * @returns {Promise<void>} Resolves when the file is removed.
 */
export async function untrackFile(siteDir, filePath) {
  db.exec("DELETE FROM tracked_files WHERE site = ? AND path = ?", [
    siteDir,
    filePath,
  ]);
  try {
    await Deno.remove(filePath);
  } catch (err) {
    if (!(err instanceof Deno.errors.NotFound)) throw err;
  }
}

/**
 * Retrieve all tracked files for a site.
 *
 * @param {string} siteDir Absolute path to the site directory.
 * @returns {string[]} List of absolute file paths currently tracked.
 */
export function getTrackedFiles(siteDir) {
  const stmt = db.prepare("SELECT path FROM tracked_files WHERE site = ?");
  const rows = stmt.all([siteDir]);
  return rows.map((row) => row.path);
}
