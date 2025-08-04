/**
 * Render the default footer element.
 *
 * @param {{links: {footer?: {href: string, label: string}[]}}} params
 * @returns {string}
 */
export function render({ links }) {
  const items = (links.footer || [])
    .map((l) => `<a href="${l.href}">${l.label}</a>`)
    .join("");
  return `<footer>${items}</footer>`;
}
