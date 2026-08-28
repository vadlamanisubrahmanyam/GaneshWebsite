export type Headline = {
  title: string;
  link: string;
  source?: string;
  pubDate?: string;
};

// Google News' public top-stories RSS feed — no API key required.
// hl/gl/ceid control language/region; en-IN gives India-relevant top headlines.
const FEED_URL = "https://news.google.com/rss?hl=en-IN&gl=IN&ceid=IN:en";

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function extractTag(block: string, tag: string): string | undefined {
  const match = block.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
  return match ? decodeEntities(match[1].trim()) : undefined;
}

export async function getTopHeadlines(limit = 6): Promise<Headline[]> {
  try {
    const res = await fetch(FEED_URL, {
      // Attempt a 15-minute cache; falls back to fetching fresh if the
      // route's dynamic rendering overrides this.
      next: { revalidate: 900 },
      headers: { "User-Agent": "Mozilla/5.0 (compatible; SubrahmanyamSite/1.0)" },
    });
    if (!res.ok) return [];
    const xml = await res.text();

    const items = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];
    return items.slice(0, limit).map((block) => {
      const rawTitle = extractTag(block, "title") ?? "";
      // Google News titles are usually "Headline text - Source Name"
      const dashIndex = rawTitle.lastIndexOf(" - ");
      const title = dashIndex > -1 ? rawTitle.slice(0, dashIndex) : rawTitle;
      const source = dashIndex > -1 ? rawTitle.slice(dashIndex + 3) : undefined;

      return {
        title,
        source,
        link: extractTag(block, "link") ?? "#",
        pubDate: extractTag(block, "pubDate"),
      };
    });
  } catch (err) {
    console.error("Failed to fetch news headlines:", err);
    return [];
  }
}
