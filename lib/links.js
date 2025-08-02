export class LinksManager {
  constructor(path) {
    this.path = path;
    this.data = { nav: [], footer: [] };
    this._original = "";
  }

  async load() {
    try {
      const text = await Deno.readTextFile(this.path);
      this._original = text;
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed.nav)) this.data.nav = parsed.nav;
      if (Array.isArray(parsed.footer)) this.data.footer = parsed.footer;
    } catch (err) {
      if (err instanceof Deno.errors.NotFound) {
        this._original = JSON.stringify(this.data, null, 2) + "\n";
      } else {
        throw err;
      }
    }
  }

  merge(href, pageLinks) {
    let changed = false;
    if (pageLinks.nav) {
      const item = { href, label: pageLinks.nav.label };
      if (pageLinks.nav.topLevel) item.topLevel = true;
      if (pageLinks.nav.subLevel !== undefined) {
        item.subLevel = pageLinks.nav.subLevel;
      }
      const idx = this.data.nav.findIndex((l) => l.href === href);
      if (idx >= 0) {
        const prev = this.data.nav[idx];
        if (!objectsEqual(prev, item)) {
          this.data.nav[idx] = item;
          changed = true;
        }
      } else {
        this.data.nav.push(item);
        changed = true;
      }
    }
    if (pageLinks.footer) {
      const item = { href, label: pageLinks.footer.label };
      if (pageLinks.footer.column !== undefined) {
        item.column = pageLinks.footer.column;
      }
      const idx = this.data.footer.findIndex((l) => l.href === href);
      if (idx >= 0) {
        const prev = this.data.footer[idx];
        if (!objectsEqual(prev, item)) {
          this.data.footer[idx] = item;
          changed = true;
        }
      } else {
        this.data.footer.push(item);
        changed = true;
      }
    }
    return changed;
  }

  async save() {
    const json = JSON.stringify(this.data, null, 2) + "\n";
    if (json !== this._original) {
      await Deno.writeTextFile(this.path, json);
      this._original = json;
    }
  }
}

function objectsEqual(a, b) {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  for (const key of aKeys) {
    if (a[key] !== b[key]) return false;
  }
  return true;
}
