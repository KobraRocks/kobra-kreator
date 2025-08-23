import { markdownToHTML } from "../../../lib/markdown";

function generateHTMLContent(target = "/") {
    let entries = [];
    for await (const entry of Deno.readDir(target)) {
        entries.push(markdownToHTML(entry));
      }
    return entries;
}


// Markdown to HTML (pseudo-code, using a markdown parser)
const html = gfm.render(markdownContent); // or mm-mark or similar

// DOMParser to manipulate the HTML string
const parser = new DOMParser();
const doc = parser.parseFromString(html, 'text/html');

// Collect all h2 headings (section titles)
const sectionTitles = [...doc.querySelectorAll('h2')];

// Build navigation
const nav = document.createElement('nav');
nav.className = 'toc-fixed'; // Add styles for fixed positioning

const ul = document.createElement('ul');
sectionTitles.forEach(h2 => {
  // Generate a slug for the id
  const slug = h2.textContent.toLowerCase().replace(/\s+/g, '-');
  h2.id = slug; // Set the id in the heading

  const li = document.createElement('li');
  const a = document.createElement('a');
  a.href = `#${slug}`;
  a.textContent = h2.textContent;
  li.appendChild(a);
  ul.appendChild(li);
});
nav.appendChild(ul);

// Render nav at desired position
document.body.prepend(nav);
