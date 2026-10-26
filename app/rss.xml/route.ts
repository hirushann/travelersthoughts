import { getPosts } from "@/lib/content";
import { absoluteUrl, postPath, site } from "@/lib/site";

const escape = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export async function GET() {
  const posts = await getPosts({ limit: 30 });
  const items = posts
    .map((p) => {
      const url = absoluteUrl(postPath(p.slug));
      return `
    <item>
      <title>${escape(p.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${new Date(p.publishedAt).toUTCString()}</pubDate>${p.category ? `\n      <category>${escape(p.category.name)}</category>` : ""}${p.author ? `\n      <dc:creator>${escape(p.author.name)}</dc:creator>` : ""}
      <description>${escape(p.excerpt ?? "")}</description>${p.coverImage ? `\n      <enclosure url="${escape(p.coverImage)}" type="image/jpeg" length="0" />` : ""}
    </item>`;
    })
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${escape(site.name)}</title>
    <link>${absoluteUrl("/")}</link>
    <description>${escape(site.description)}</description>
    <language>en</language>
    <atom:link href="${site.url}/rss.xml" rel="self" type="application/rss+xml" />${posts[0] ? `\n    <lastBuildDate>${new Date(posts[0].updatedAt).toUTCString()}</lastBuildDate>` : ""}${items}
  </channel>
</rss>`;

  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
}
