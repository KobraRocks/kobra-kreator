import { basename, join, relative } from "@std/path";
import { walk } from "@std/fs/walk";
import { parsePage } from "./parse-page.js";
import { importTemplate } from "./apply-templates.js";
import { logWithEmoji } from "./emoji.js";
import { toHref } from "./manage-links.js";

/**
 * Generate an RSS feed for all posts under the site's `blog` directory.
 *
 * Each blog post must contain front matter with at least a `title` and
 * `[templates]` table so it can be parsed by {@link parsePage}. The resulting
 * feed is written to `blog/feed.xml` inside the site's distant directory.
 *
 * @param {string} siteDir Absolute path to the site's root directory.
 * @param {{distantDirectory: string, prettyUrls?: boolean, siteUrl?: string, title?: string, description?: string}} config
 *        Site configuration object.
 * @returns {Promise<void>} Resolves when the feed has been generated.
 */
export async function generateFeed(siteDir, config) {
  const blogDir = join(siteDir, "blog");
  const distDir = String(config.distantDirectory);
  const pretty = Boolean(config.prettyUrls);

  /** @type {{title: string, description: string, link: string, date?: Date}[]} */
  const items = [];

  try {
    for await (
      const entry of walk(blogDir, {
        exts: [".html", ".md"],
        includeDirs: false,
      })
    ) {
      const page = await parsePage(entry.path);
      const rel = relative(siteDir, entry.path).replace(/\\/g, "/");
      const link = toHref(rel, pretty);
      items.push({
        title: String(page.frontMatter.title),
        description: String(page.frontMatter.description || ""),
        link: `${config.siteUrl || ""}${link}`,
        date: page.frontMatter.date
          ? new Date(String(page.frontMatter.date))
          : undefined,
      });
    }
  } catch (err) {
    if (err instanceof Deno.errors.NotFound) {
      // No blog directory – nothing to do.
      return;
    }
    throw err;
  }

  // Sort newest first based on publication date when available.
  items.sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0));

  const module = await importTemplate(
    "feed",
    "default",
    new URL("..", import.meta.url),
    siteDir,
  );
  const itemsXml = items.map((item) => module.render({ item })).join("");

  const channelTitle = config.title || basename(siteDir);
  const channelLink = config.siteUrl || "";
  const channelDescription = config.description || "";
  const feedXml =
    `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0">\n<channel>\n<title>${channelTitle}</title>\n<link>${channelLink}</link>\n<description>${channelDescription}</description>\n${itemsXml}\n</channel>\n</rss>`;

  const feedPath = join(distDir, "blog", "feed.xml");
  await Deno.mkdir(join(distDir, "blog"), { recursive: true });
  await Deno.writeTextFile(feedPath, feedXml);
  logWithEmoji("create", `RSS feed written to ${feedPath}`);
}
