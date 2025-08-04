/**
 * Render the default footer element.
 *
 * @param {{
 *   links: { footer?: { href: string, label: string }[] },
 *   config: { copyright?: string }
 * }} params
 * @returns {string}
 */
export function render({ links, config }) {
  const copyright = config.copyright
    ? `<p><small>${config.copyright}</small></p>`
    : "";

  const items = (links.footer || [])
    .map((l) => `<a href="${l.href}">${l.label}</a>`)
    .join("");
  return `<footer>${items}${copyright}</footer>`;
}
