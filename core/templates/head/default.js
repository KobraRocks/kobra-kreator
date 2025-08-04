/**
 * Render the default <head> fragment.
 *
 * @param {{frontMatter: {title?: string, css?: string[]}}} params
 * @returns {string}
 */
export function render({ frontMatter }) {
  const cssLinks = (frontMatter.css || [])
    .map((href) => `<link rel="stylesheet" href="${href}">`)
    .join("");
  const title = frontMatter.title ?? "";
  return `<title>${title}</title>${cssLinks}`;
}
