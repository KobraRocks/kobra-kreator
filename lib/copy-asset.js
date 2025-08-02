import {
  dirname,
  join,
  relative,
} from "https://deno.land/std@0.224.0/path/mod.ts";
import { SRC_ASSET_EXTENSIONS } from "./extension-whitelist.js";

const MAX_WORKERS = navigator.hardwareConcurrency ?? 2;
const queue = [];
let active = 0;

function runNext() {
  if (active >= MAX_WORKERS) return;
  const job = queue.shift();
  if (!job) return;
  active++;
  copyOne(job.path)
    .catch((err) => {
      if (err instanceof Error) {
        if (!err.message.includes(job.path)) {
          err.message = `${job.path}: ${err.message}`;
        }
        console.error(err);
      } else {
        console.error(err);
      }
    })
    .finally(() => {
      active--;
      job.resolve();
      runNext();
    });
}

export function copyAsset(path) {
  const ext = path.slice(path.lastIndexOf(".")).toLowerCase();
  if (!SRC_ASSET_EXTENSIONS.has(ext)) return Promise.resolve();
  return new Promise((resolve) => {
    queue.push({ path, resolve });
    runNext();
  });
}

async function copyOne(path) {
  const siteDir = await findSiteRoot(path);
  const rel = relative(siteDir, path).replace(/\\/g, "/");
  const configPath = join(siteDir, "config.json");
  const configText = await Deno.readTextFile(configPath);
  const config = JSON.parse(configText);
  const distant = String(config.distantDirectory);
  const outPath = join(distant, rel);
  await Deno.mkdir(dirname(outPath), { recursive: true });
  await Deno.copyFile(path, outPath);
}

async function findSiteRoot(filePath) {
  let dir = dirname(filePath);
  while (true) {
    try {
      const stat = await Deno.stat(join(dir, "config.json"));
      if (stat.isFile) return dir;
    } catch (err) {
      if (!(err instanceof Deno.errors.NotFound)) throw err;
    }
    const parent = dirname(dir);
    if (parent === dir) {
      throw new Error(`config.json not found for ${filePath}`);
    }
    dir = parent;
  }
}
