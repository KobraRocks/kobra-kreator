import *  as path from "@std/path";
import { logWithEmoji, getEmoji } from "./lib/emoji.js";
import { parsePage } from "./lib/parse-page.js";
import * as store from "./lib/store.js";
import { EXTENSIONS } from "./lib/extension-whitelist.js";


// #######################
// DIRECTORIES
// #######################

function logDirNotExist(dir = "", signal = "info") {
    logWithEmoji(signal, `${getEmoji("directory")} /${dir}/ directory doesn not exist!`)
}

function dirExists(url = new URL()) {
    try { return Deno.statSync(url);} catch (_) { return;}
}

function dirHasEntries(url = new URL()) {
    for (const _entry of Deno.readDirSync(url)) return true;
    return false;
}

const rootDir = new URL(path.dirname(import.meta.url));
const srcDir = new URL(path.join(rootDir.href, '/src/'));
const coreDir = new URL(path.join(rootDir.href, '/core/'));
const sharedDir = new URL(path.join(rootDir.href, '/shared/'));
const coreTemplateDir = new URL(path.join(coreDir.href, '/templates/'));
const coreCSSDir = new URL(path.join(coreDir.href, '/css/'));
const coreJSDir = new URL(path.join(coreDir.href, '/js/'));
const coreSVGDir = new URL(path.join(coreDir.href, '/svg/'));
const sharedTemplateDir = new URL(path.join(sharedDir.href, '/templates/'));
const sharedCSSDir = new URL(path.join(sharedDir.href, '/css/'));
const sharedJSDir = new URL(path.join(sharedDir.href, '/js/'));
const sharedSVGDir = new URL(path.join(sharedDir.href, '/svg/'));

console.log(`rootDir: ${rootDir}`);

store.directories.set("root", rootDir);
store.directories.set("src", srcDir);
store.directories.set("core", coreDir);
store.directories.set("coreTemplates", coreTemplateDir);
store.directories.set("coreCSS", coreCSSDir);
store.directories.set("coreJS", coreJSDir);
store.directories.set("coreSVG", coreSVGDir);
try {
    const _ = Deno.statSync(sharedDir.pathname.slice(0,-1));
    store.directories.set("shared", sharedDir);
    if (dirExists(sharedDir)) {
        store.directories.set("sharedTemplates", sharedTemplateDir);
    } else {
        logDirNotExist("shared/tempates");
    }
    if (dirExists(sharedCSSDir)) {
        store.directories.set("sharedCSS", sharedDir);
    } else {
        logDirNotExist("shared/css");
    }
    if (dirExists(sharedJSDir)) {
        store.directories.set("sharedJS", sharedJSDir);
    } else {
        logDirNotExist("shared/js");
    }
    if (dirExists(sharedSVGDir)) {
        store.directories.set("sharedSVG", sharedSVGDir);
    } else {
        logDirNotExist("shared/svg");
    }
} catch (_) {
    logDirNotExist("shared");
}
// #######################
// SCANING
// #######################
const unsupportedFiles = new Set();

function scanSource(urlDir = new URL(), files = new Map()) {
    logWithEmoji("search", `${getEmoji("directory")} ${urlDir.href.split(rootDir)[1]}`);
    

    for( const entry of Deno.readDirSync(urlDir)) {
        
        if (entry.isFile) {
            const entryUrl = new URL(entry.name, urlDir);
            const extension = path.extname(entryUrl.href);
            const info = Deno.statSync(entryUrl);
            const hostname = entryUrl.href.replace(srcDir, "").split("/")[0];
            let file;
            let type;

            if (entryUrl.href.includes("/templates/")) {
                store.Templates.add(entryUrl.href);
                file = Deno.readTextFileSync(entryUrl);
                type = "TEMPLATE";
            } else if (entryUrl.href.includes("/css/")) {
                store.CSS.add(entryUrl.href);
                type = "CSS";
            } else if (entryUrl.href.includes("/js/")) {
                type = "JS";
                // do nothing specific with module
                // only load inline js
                if (entryUrl.href.endsWith(".inline.js")) {
                    store.JS.add(entryUrl.href);
                    file = Deno.readTextFileSync(entryUrl);
                }
            } else if (entryUrl.href.includes("/media/")) {
                if(EXTENSIONS.get("picture").has(extension)) type = "PICTURE";
                if(EXTENSIONS.get("audio").has(extension)) type = "AUDIO";
                if(EXTENSIONS.get("video").has(extension)) type = "VIDEO";
                if(EXTENSIONS.get("font").has(extension)) type = "FONT";

            } else if (EXTENSIONS.get("document").has(extension)) {
                // .html, .md, .markdown, .json
                file = Deno.readTextFileSync(entryUrl);
                type = "DOCUMENT";            
            } else {
                unsupportedFiles.add(entryUrl.href);
            }

            files.set(entryUrl.href, {file, info, type, extension, hostname});

        } else if (entry.isSymlink) {
            // TODO: handle symlink use case
        } else {
            const entryUrl = new URL(`${entry.name}/`, urlDir);
            scanSource(entryUrl, files);
        }
    }

    return files;
}

function scanDir(urlDir = new URL(), items = new Set(), emoji = "file") {
    const folderStatus = dirHasEntries(urlDir) ? "directory": "emptydirectory";
    logWithEmoji("search", `${getEmoji(folderStatus)} ${urlDir.href.split(rootDir)[1]}`);
    for( const entry of Deno.readDirSync(urlDir)) {
        if (entry.isFile) {
            const itemUrl = new URL(entry.name, urlDir);
            items.add(itemUrl.href);
            console.log(`      ${getEmoji(emoji)} ${entry.name}`);
        } else if (entry.isSymlink) {
            // TODO: handle symlink use case
        } else {
            const entryUrl = new URL(`${entry.name}/`, urlDir);
            scanDir(entryUrl, items, emoji);
        }
    }

    return items;
} 

function scan( directories = [], items = new Set(), { emoji = "file", fileType = ""}) {
    console.log(`\n${getEmoji("search")} ${getEmoji("directories")}  SCAN -- ${fileType} Files`);
    
    let result = new Set();
    for (const dir of directories) {
        if (store.directories.has(dir)) {
            // force return something to keep sync execution
             result = result.union(scanDir(store.directories.get(dir), items, emoji));
        }
    }

    return result;
}

// #######################
// BUILD
// #######################
const fileTypes = new Set(["Templates", "CSS", "JS", "SVG"]);
const emojis = new Map([
    ["Templates", "template"],
    ["CSS", "style"],
    ["JS", "script"],
    ["SVG", "svg"]
]);

async function build () {
    
    // 1. SCAN

    console.log(`\n${getEmoji("search")} ${getEmoji("directories")}  SCAN -- Source Files`);
    const files = scanSource(srcDir, store.files);
    logWithEmoji("search",`${getEmoji("right")} Found ${files.size} files`);
    let unsupportedFilesLog = `\n${getEmoji("warning")} ${getEmoji("file")} UNSUPPORTED FILES --`
    for (const href of unsupportedFiles) {
        unsupportedFilesLog += `    ${getEmoji("file")} ${href}`;
    }

    for (const fileType of fileTypes) {
        const result = scan(
            [`core${fileType}`, `shared${fileType}`],
            new Set(),
            {
                emoji: emojis.get(fileType),
                fileType
            }
        );

        for (const href of result) {
            const info = Deno.statSync(new URL(href));
            const extension = path.extname(href);
            store[fileType].add(href);
            files.set(href, { info, extension });
        }
 
    }

    logWithEmoji("search", `${getEmoji("success")} SCAN -- Done`);

    // 2. LOG CHANGES
    for (const [href, file] of files) {
        console.log(file.info);
        return;
    }


}



// #######################
// CLI
// #######################

if (import.meta.main) {
    build();
}
