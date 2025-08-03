export function render({ frontMatter }) {
  const cssLinks = (frontMatter.css || [])
    .map((href) => `<link rel="stylesheet" href="${href}">`)
    .join("");
  return `<title>${frontMatter.title}</title>${cssLinks}`;
}
