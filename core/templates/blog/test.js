//import { render } from "./default.js";
/**
 * Example script that converts a markdown file to HTML and renders it using
 * the blog template.
 */
import { markdownToHTML } from "../../../plugins/markdown.js";
import { render } from "./default.js";

const markdownUrl = new URL(
  "./testfolder/comment-retrouver-une-vie-epanouie.md",
  import.meta.url,
);
const file = Deno.readTextFileSync(markdownUrl);
const html = markdownToHTML(file);

const output = render({ html });
// Log the rendered HTML for debugging with a friendly emoji
console.log("📝", output);
