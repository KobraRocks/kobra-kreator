/**
 * @typedef {object} NavLink
 * @property {string} label Text displayed for the navigation link.
 * @property {boolean} [topLevel] Marks the link as a first-level item.
 * @property {string} [subLevel] Name of the submenu bucket.
 */

/**
 * @typedef {object} FooterLink
 * @property {string} label Text displayed for the footer link.
 * @property {string} [column] Footer column name.
 */

/**
 * @typedef {object} PageLinks
 * @property {NavLink} [nav] Navigation link information.
 * @property {FooterLink} [footer] Footer link information.
 */

/**
 * Manage the global `links.json` navigation file for a site.
 */
export class LinksManager {
  /**
   * @param {string} path Path to the `links.json` file.
   */
  constructor(path) {
    this.path = path;
    this.data = { nav: [], footer: [] };
    this._original = "";
  }

  /**
   * Load the existing `links.json` file from disk, if present.
   * @returns {Promise<void>}
   */
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

  /**
   * Merge link information extracted from a page into the global collection.
   *
   * @param {string} href URL of the page being processed.
   * @param {PageLinks} pageLinks Links defined in the page front-matter. The
   * `nav` link uses the `label`, `topLevel`, and `subLevel` properties while the
   * `footer` link uses `label` and `column`.
   * @returns {boolean} Whether the collection was modified.
   */
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
    } else {
      // Remove existing nav entry when the page omits `[links.nav]`.
      const idx = this.data.nav.findIndex((l) => l.href === href);
      if (idx >= 0) {
        this.data.nav.splice(idx, 1);
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
    } else {
      // Remove existing footer entry when the page omits `[links.footer]`.
      const idx = this.data.footer.findIndex((l) => l.href === href);
      if (idx >= 0) {
        this.data.footer.splice(idx, 1);
        changed = true;
      }
    }
    return changed;
  }

  /**
   * Persist changes to `links.json` if the data has changed.
   * @returns {Promise<void>}
   */
  async save() {
    const json = JSON.stringify(this.data, null, 2) + "\n";
    if (json !== this._original) {
      await Deno.writeTextFile(this.path, json);
      this._original = json;
    }
  }
}

/**
 * Compare two plain objects for shallow equality.
 *
 * @param {Record<string, unknown>} a First object to compare.
 * @param {Record<string, unknown>} b Second object to compare.
 * @returns {boolean} Whether the objects have the same keys and values.
 */
function objectsEqual(a, b) {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  for (const key of aKeys) {
    if (a[key] !== b[key]) return false;
  }
  return true;
}
