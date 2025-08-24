import { removePage, renderPage } from "./render-page.js";
import { copyAsset, removeAsset } from "./copy-asset.js";
import { getEmoji, logWithEmoji } from "./emoji.js";

/**
 * @typedef {object} WorkerMessage
 * @property {number} id Unique identifier for the worker task.
 * @property {"render"|"asset"|"remove-page"|"remove-asset"} type Type of task to perform.
 * @property {string} path Path related to the task.
 */

/**
 * Handle tasks sent to the worker.
 *
 * @param {MessageEvent<WorkerMessage>} e Message event containing task details.
 * @returns {Promise<void>}
 */
self.onmessage = async (e) => {
  const { id, type, path } = e.data;
 
  try {
    // Handle disabled pages by removing output and navigation entries.
    if (type === "render" && path.split("/").pop()?.startsWith("disabled.")) {
      const deps = await renderPage(path);
      self.postMessage({ id, deps });
      console.log(`${getEmoji("skip")} Disabled -- ${path}`);
      return;
    }

    if (type === "render") {
      const deps = await renderPage(path);
      logWithEmoji("build", `${getEmoji("success")} WORKER JOB ${id} -- Rendered HTML Content ${path}`);
      self.postMessage({ id, deps });
    } else if (type === "asset") {
      await copyAsset(path);
      logWithEmoji("build", `${getEmoji("success")} WORKER JOB ${id} -- Copied Asset ${path}`);
      self.postMessage({ id });
    } else if (type === "remove-page") {
      await removePage(path);
      logWithEmoji("build", `${getEmoji("success")} WORKER JOB ${id} -- Removed HTML Page ${path}`);
      self.postMessage({ id });
    } else if (type === "remove-asset") {
      await removeAsset(path);
      logWithEmoji("build", `${getEmoji("success")} WORKER JOB ${id} -- Removed asset ${path}`);
      self.postMessage({ id });
    }

    if (path.endsWith(".inline.js")) {
      logWithEmoji("skip", `Skip -- ${path}`);
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
    logWithEmoji("error", `WORKER JOB ${id} NOT ${action} ${type} -- ${path}`);
  }
};
