export const EXT_WHITELIST = {
  styles: [".css"],
  scripts: [".js"],
  images: [".svg", ".jpg", ".png", ".webp", ".ico"],
  video: [".mp4", ".webm"],
  documents: [".pdf"],
  fonts: [".ttf", ".otf"],
};

export const MEDIA_EXTENSIONS = new Set(
  [...EXT_WHITELIST.images, ...EXT_WHITELIST.video, ...EXT_WHITELIST.documents, ...EXT_WHITELIST.fonts].map((e) => e.toLowerCase()),
);

export const SRC_ASSET_EXTENSIONS = new Set(
  [...EXT_WHITELIST.styles, ...EXT_WHITELIST.scripts, ...MEDIA_EXTENSIONS].map((e) => e.toLowerCase()),
);

export const ALL_EXTENSIONS = SRC_ASSET_EXTENSIONS;
