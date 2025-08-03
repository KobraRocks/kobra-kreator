import { renderPage } from "./render-page.js";
import { copyAsset } from "./copy-asset.js";
import { getEmoji } from "./emoji.js";

self.onmessage = async (e) => {
  const { id, type, path } = e.data;
  try {
    if (type === "render") await renderPage(path);
    else if (type === "asset") await copyAsset(path);
    self.postMessage({ id });
    console.log(`${getEmoji('success')} Rendered -- ${path}`);
  } catch (err) {
    if (err instanceof Error) {
      self.postMessage({ id, error: err.message });
    } else {
      self.postMessage({ id, error: String(err) });
    }

    console.log(`${getEmoji('error')} Not Rendered -- ${path}`);
  }
};
