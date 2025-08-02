import { dirname, fromFileUrl, join, normalize, resolve, isAbsolute } from "https://deno.land/std@0.224.0/path/mod.ts";

/**
 * Walks each immediate subdirectory of `src/`, validates its `config.json`
 * against the configuration schema, normalizes the `distantDirectory` path and
 * ensures the referenced directory exists on disk.
 */
async function main() {
  const root = resolve(dirname(fromFileUrl(import.meta.url)), "..");
  const srcDir = join(root, "src");

  const entries = [];
  try {
    for await (const entry of Deno.readDir(srcDir)) {
      entries.push(entry);
    }
  } catch (err) {
    if (err instanceof Deno.errors.NotFound) {
      console.warn("No src directory found.");
      return;
    }
    throw err;
  }

  const siteDirs = entries.filter((e) => e.isDirectory);
  if (siteDirs.length === 0) {
    console.log("No site directories found in src.");
    return;
  }

  const schemaPath = join(root, "schemas", "config.schema.json");
  const schema = JSON.parse(await Deno.readTextFile(schemaPath));

  for (const dirent of siteDirs) {
    const configPath = join(srcDir, dirent.name, "config.json");
    let config;
    try {
      const text = await Deno.readTextFile(configPath);
      config = JSON.parse(text);
    } catch (err) {
      console.warn(`Skipping ${dirent.name}: cannot read config.json`);
      continue;
    }

    try {
      validateConfig(config, schema);
    } catch (err) {
      if (err instanceof Error) {
        err.message = `${dirent.name}: ${err.message}`;
      }
      throw err;
    }

    const normalized = normalize(String(config.distantDirectory));
    if (!isAbsolute(normalized)) {
      throw new Error(`${dirent.name}: distantDirectory must be absolute`);
    }

    await Deno.mkdir(normalized, { recursive: true });
  }
}

function validateConfig(config, schema) {
  const allowedProps = Object.keys(schema.properties ?? {});
  for (const key of Object.keys(config)) {
    if (!allowedProps.includes(key)) {
      throw new Error(`unexpected property \"${key}\"`);
    }
  }

  for (const req of schema.required ?? []) {
    if (!(req in config)) {
      throw new Error(`missing required property \"${req}\"`);
    }
  }

  const distant = config.distantDirectory;
  if (typeof distant !== "string") {
    throw new Error("distantDirectory must be a string");
  }

  const pattern = schema.properties?.distantDirectory?.pattern;
  if (pattern) {
    const regex = new RegExp(pattern);
    if (!regex.test(distant)) {
      throw new Error("distantDirectory does not match required pattern");
    }
  }
}

if (import.meta.main) {
  main().catch((err) => {
    console.error(err);
    Deno.exit(1);
  });
}
