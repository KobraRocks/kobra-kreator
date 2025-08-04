/**
 * Render the default navigation element with optional dropdown menus.
 *
 * Navigation data originates from `links.json` managed by `LinksManager`.
 * Each item contains either a `topLevel` flag or a `subLevel` bucket name.
 * Items sharing the same `subLevel` are grouped into a single dropdown using
 * the native `<details>` element. Only entries with a `topLevel` flag or a
 * `subLevel` value are rendered; others are ignored.
 *
 * @param {{ links: { nav?: Array<{ href: string, label: string, topLevel?: boolean, subLevel?: string }> } }} params
 *   Navigation parameters.
 * @returns {string} Rendered navigation HTML.
 */
export function render({ links }) {
  const order = [];
  const buckets = new Map();

  for (const item of links.nav || []) {
    if (item.subLevel) {
      // Group items by their `subLevel` bucket while preserving order of
      // first appearance.
      let group = buckets.get(item.subLevel);
      if (!group) {
        group = { name: item.subLevel, items: [] };
        buckets.set(item.subLevel, group);
        order.push(group);
      }
      group.items.push(item);
    } else if (item.topLevel) {
      // Only explicitly flagged top-level items render as plain links.
      order.push(item);
    }
    // Entries lacking both `topLevel` and `subLevel` are skipped.
  }

  const items = order
    .map((entry) => {
      if (entry.items) {
        const children = entry.items
          .map((c) => `<li><a href="${c.href}">${c.label}</a></li>`)
          .join("");
        return `<details><summary>${entry.name}</summary><ul>${children}</ul></details>`;
      }
      return `<a href="${entry.href}">${entry.label}</a>`;
    })
    .join("");

  return `<nav>${items}</nav>`;
}
