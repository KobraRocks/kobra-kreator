import { Database } from "@db/sqlite";
import { join } from "@std/path";
import { ensureDirSync } from "@std/fs";
import { walk } from "@std/fs/walk";
import { getEmoji, logWithEmoji } from "./emoji.js";

/**
 * SQLite-backed tracker for source files under `src/`, `shared/`, `core/`.
 * Records modification times to detect added, updated, or removed files
 * between runs so only affected pages are processed.
 *
 * Records page dependencies.
 *
 * @module database
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
db.exec(`
    CREATE TABLE IF NOT EXISTS source_files (
        href TEXT PRIMARY KEY,
        hostname TEXT,
        extension TEXT NOT NULL,
        type TEXT NOT NULL,
        mtime TEXT NOT NULL
    );

    DROP TABLE IF EXISTS source_changes;
    CREATE TABLE IF EXISTS source_changes (
        href TEXT PRIMARY KEY
    );
`
);

const getSourceStmt = db.prepare(`SELECT * from source_files WHERE href = ?`);

const insertSourceStmt = db.prepare(`INSERT OR IGNORE INTO source_files (href, hostname, extension, type, mtime) VALUES (:href, :hostname, :extension, :type, :mtime)`);

const updateSourceStmt = db.prepare(`UPDATE source_files SET mtime = :mtime WHERE href = :href`);
}

const insertSourceChange = db.prepare(`INSERT INTO source_changes (href) VALUE (?)`);

//
export function startUpRun({ inserts, updates }) {
    logWithEmoji();
    try {
      db.exec("BEGIN TRANSACTION");
        
      for (const insert of inserts) {
        insertSourceStmt.run(insert);
        insertSourceChange(insert.href);
      }  
      for (const update of updates) {
        updateSourceStmt.run(update);
        insertSourceChange(update.href);
      }
      const change = db.exec("COMMIT");
      return { result: change};
    } catch (err) {
      db.exec("ROLLBACK");
      console.error("Transaction failed:", err);
      return { error: err};
    }    
}

export function getSource(href = "") {
    try {
        const record = getSourceStmt.get(href);
        return { result: record };
    } catch (sliteErr) {
        return { error: sliteErr };
    } 
}

export function execute(sql = "") {
    try {
        const change = db.exec(sql);
        return { result: change };
    } catch (sliteErr) {
        return { error: sliteErr };
    } 
}

// Map [href, { info, type, extension, hostname }]
export prepareStartupRun (files = new Map()) {
    const inserts = new Set();
    const updates = new Set();

    for (const [href, { info, type, extenion, hostname}]) {
        const { mtime } = info;
        const record = getSourceStmt.get(href);
        if(record.error) throw new Error(record.error);
        if(record.result.undefined) {
            toInsert({href, hostname, type, extension, mtime });
            continue;
        }

        toUpdate({ href, mtime});

    }

    return { inserts}
}


