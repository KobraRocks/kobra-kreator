import { renderPage } from "./render-page.js";
import { copyAsset } from "./copy-asset.js";

self.onmessage = async (e) => {
  const { id, type, path } = e.data;
  try {
    if (type === "render") await renderPage(path);
    else if (type === "asset") await copyAsset(path);
    self.postMessage({ id });
  } catch (err) {
    if (err instanceof Error) {
      self.postMessage({ id, error: err.message });
    } else {
      self.postMessage({ id, error: String(err) });
    }
  }
};
