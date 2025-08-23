//import { render } from "./default.js";
import { markdownToHTML } from "../../../lib/markdown.js";
import { render } from "./default.js";

const file = Deno.readTextFileSync("./testfolder/comment-retrouver-une-vie-epanouie.md");
const html = markdownToHTML(file);

const output = render({html});
console.log(output);
