/**
 * Render a single RSS feed item.
 *
 * @param {{ item: { title: string, link: string, description: string, date?: Date } }} params
 * @returns {string} RSS item XML string.
 */
export function render({ item }) {
  const pubDate = item.date
    ? `<pubDate>${item.date.toUTCString()}</pubDate>`
    : "";
  return `<item>\n<title>${item.title}</title>\n<link>${item.link}</link>\n<description><![CDATA[${item.description}]]></description>\n${pubDate}\n</item>`;
}
