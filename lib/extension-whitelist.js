/**
 * Lists of allowed file extensions grouped by asset type.
 * @type {{styles: string[], scripts: string[], images: string[], video: string[], documents: string[], fonts: string[]}}
 */
export const EXT_WHITELIST = {
  styles: [".css"],
  // Inline scripts use a `.inline.js` suffix and are intentionally omitted here
  // so they are inlined rather than copied as separate assets.
  scripts: [".js"],
  images: [".svg", ".jpg", ".png", ".webp", ".ico"],
  video: [".mp4", ".webm"],
  documents: [".pdf"],
  fonts: [".ttf", ".otf"],
};

/**
 * Set of media file extensions (images, video, documents, fonts).
 * @type {Set<string>}
 */
export const MEDIA_EXTENSIONS = new Set(
  [
    ...EXT_WHITELIST.images,
    ...EXT_WHITELIST.video,
    ...EXT_WHITELIST.documents,
    ...EXT_WHITELIST.fonts,
  ].map((e) => e.toLowerCase()),
);

/**
 * Set of all source asset extensions that should be copied to the distant directory.
 * @type {Set<string>}
 */
export const SRC_ASSET_EXTENSIONS = new Set(
  [...EXT_WHITELIST.styles, ...EXT_WHITELIST.scripts, ...MEDIA_EXTENSIONS].map((
    e,
  ) => e.toLowerCase()),
);

/**
 * All extensions handled by the build system.
 * @type {Set<string>}
 */
export const ALL_EXTENSIONS = SRC_ASSET_EXTENSIONS;

export const EXTENSIONS = new Map([
    ["config", new Set([".json", ".toml", ".yaml"])],
    ["document", new Set([".html", ".md", ".markdown"])],
    ["script", new Set([".js"])],
    ["style", new Set([".css"])],
    ["picture", new Set([".jpg", ".jpeg", ".png", "gif", ".webp", ".avif", ".svg"])],
    ["audio", new Set([".mp3", ".ogg", ".wav", ".webm", ".aac", ".m4a"])],
    ["video", new Set([".mp4", ".webm", ".av1", ".ogv"])],
    ["font", new Set([".woff2", ".woff", ".ttf", ".otf"])]
]);
