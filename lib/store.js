export const directories = new Map();
export const files = new Map();
export const Templates = new Set();
export const CSS = new Set();
export const JS = new Set(); //inline only
export const SVG = new Set(); // inline only


const srcUrl = directories.get("src");
const sharedTemplatesUrl = directories.get("sharedTemplates");
const coreTemplatesUrl = directories.get("coreTemplates");

export function getTemplateUrl({ 
    templateName = "", 
    type = "", 
    hostname = "", 
    srcUrl = new URL(),
    sharedUrl = new URL(),
    coreUrl = new URL(),
    pageUrl = new URL(),
}) {
    // first check if exist in hostname
    // second check if exist in shared
    // third check if exist in core
    // finally throw an error;
    const hostnameUrl = new URL(`${hostname}/`, srcUrl);
    let typeUrl = new URL(`${type}/`, hostnameUrl);
    let templateUrl = new URL(templateName, typeUrl);

    if (Templates.has(templateUrl.href)) return templateUrl;

    typeUrl = new URL(`${type}/`, sharedTemplatesUrl);
    templateUrl = new URL(templateName, typeUrl);

    if (Templates.has(templateUrl.href)) return templateUrl;

    typeUrl = new URL(`${type}/`, coreTemplates);
    templateUrl = new URL(templateName, typeUrl);

    if (Templates.has(templateUrl.href)) return templateUrl;

    throw new Error(`No template '${templateName}' found for ${pageUrl.href}`);
}
