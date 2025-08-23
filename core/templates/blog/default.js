import { DOMParser } from "npm:linkedom";

/**
 * Render a page fragment.
 *
 * @param {Object} params             – injected by the build system
 * @param {FrontMatter} params.frontMatter – parsed TOML object for the page
 * @param {LinksJson}  params.links        – contents of links.json for the site
 * @param {Config} params.config        - content of config.json for the site
 * @returns {string}                    – raw HTML that will be inserted verbatim
*/
export function render({html = ""}) {

    // DOMParser to manipulate the HTML string
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<section>${html}</section>`, 'text/html');

    // Collect all h2 headings (section titles)
    const sectionTitles = [...doc.querySelectorAll('h2')];

    // Build navigation
    const tableOfContent = doc.createElement('div');
    tableOfContent.className = 'table-of-content'; // Add styles for fixed positioning

    const ul = doc.createElement('ul');
    sectionTitles.forEach(h2 => {
    // Generate a slug for the id
    const slug = h2.textContent.toLowerCase().replace(/\s+/g, '-');
    h2.id = slug; // Set the id in the heading

    const li = doc.createElement('li');
    const a = doc.createElement('a');
    a.href = `#${slug}`;
    a.textContent = h2.textContent;
    li.appendChild(a);
    ul.appendChild(li);
    });
    tableOfContent.appendChild(ul);
    const section = doc.querySelector("section");


    return tableOfContent.innerHTML + section.innerHTML;
}

