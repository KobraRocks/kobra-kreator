import { markdownToHTML } from "../../../plugins/markdown.js";

/**
 * Read Markdown files from a directory and convert them to HTML strings.
 *
 * @param {string} [target="/"] Directory to scan for Markdown files.
 * @returns {Promise<string[]>} Converted HTML snippets.
 */
export async function generateHTMLContent(target = "/") {
  const entries = [];
  for await (const entry of Deno.readDir(target)) {
    entries.push(markdownToHTML(entry.name));
  }
  return entries;
}

/*
 * Example DOM manipulation for generating a table of contents.
 * This is placeholder code and not executed by default.
 *
 * const html = gfm.render(markdownContent);
 * const parser = new DOMParser();
 * const doc = parser.parseFromString(html, 'text/html');
 * const sectionTitles = [...doc.querySelectorAll('h2')];
 * const nav = document.createElement('nav');
 * nav.className = 'toc-fixed';
 * const ul = document.createElement('ul');
 * sectionTitles.forEach((h2) => {
 *   const slug = h2.textContent.toLowerCase().replace(/\s+/g, '-');
 *   h2.id = slug;
 *   const li = document.createElement('li');
 *   const a = document.createElement('a');
 *   a.href = `#${slug}`;
 *   a.textContent = h2.textContent;
 *   li.appendChild(a);
 *   ul.appendChild(li);
 * });
 * nav.appendChild(ul);
 * document.body.prepend(nav);
 */
