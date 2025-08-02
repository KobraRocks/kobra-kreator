export const pageDeps = new Map();

export function recordPageDeps(pagePath, templates = [], svgs = []) {
  pageDeps.set(pagePath, {
    templates: new Set(templates),
    svgs: new Set(svgs),
  });
}

export function pagesUsingTemplate(templatePath) {
  const out = [];
  for (const [page, deps] of pageDeps) {
    if (deps.templates.has(templatePath)) out.push(page);
  }
  return out;
}

export function pagesUsingSvg(svgPath) {
  const out = [];
  for (const [page, deps] of pageDeps) {
    if (deps.svgs.has(svgPath)) out.push(page);
  }
  return out;
}

export function clearPageDeps() {
  pageDeps.clear();
}
