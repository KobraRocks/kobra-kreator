import { removePage, renderPage } from "./render-page.js";
import { copyAsset, removeAsset } from "./copy-asset.js";
import { getEmoji } from "./emoji.js";

/**
 * Handle tasks sent to the worker.
 *
 * @param {MessageEvent<{id:number,type:"render"|"asset"|"remove-page"|"remove-asset",path:string}>} e Message event containing task details.
 * @returns {Promise<void>}
 */
self.onmessage = async (e) => {
  const { id, type, path } = e.data;
  console.log(`${getEmoji("info")} Worker processing ${type}: ${path}`);
  try {
    if (type === "render") {
      const deps = await renderPage(path);
      self.postMessage({ id, deps });
    } else if (type === "asset") {
      await copyAsset(path);
      self.postMessage({ id });
    } else if (type === "remove-page") {
      await removePage(path);
      self.postMessage({ id });
    } else if (type === "remove-asset") {
      await removeAsset(path);
      self.postMessage({ id });
    }

    if (path.endsWith(".inline.js")) {
      console.log(`${getEmoji("skip")} Skip -- ${path}`);
    } else {
      const action = type === "render"
        ? "Rendered"
        : type === "asset"
        ? "Copied"
        : "Removed";
      console.log(`${getEmoji("success")} ${action} -- ${path}`);
    }
  } catch (err) {
    if (err instanceof Error) {
      self.postMessage({ id, error: err.message });
    } else {
      self.postMessage({ id, error: String(err) });
    }

    const action = type === "render"
      ? "Rendered"
      : type === "asset"
      ? "Copied"
      : "Removed";
    console.log(`${getEmoji("error")} Not ${action} -- ${path}`);
  }
};
