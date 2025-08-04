/**
 * Render the default navigation element.
 *
 * @param {{links: {nav?: {href: string, label: string}[]}}} params
 * @returns {string}
 */
export function render({ links }) {
  const items = (links.nav || [])
    .map((l) => `<a href="${l.href}">${l.label}</a>`)
    .join("");
  return `<nav>${items}</nav>`;
}
