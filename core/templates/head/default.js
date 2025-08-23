/**
 * Render the default <head> fragment.
 *
 * @param {{ frontMatter: { title?: string, description?: string, css?: string[] } }} params
 * @returns {string}
 */
export function render({ frontMatter }) {
  const {
    title = "",
    description = "",
    css = ["styles.css"],
  } = frontMatter;

  const metaDescription = description
    ? `<meta name="description" content="${description}">`
    : "";

  let cssLinks = "";
  for (const path of css) {
    cssLinks += `\n<link rel="stylesheet" href="${path}">`;
  }

  return `
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    ${metaDescription}
    <title>${title}</title>
    ${cssLinks}
  `;
}
