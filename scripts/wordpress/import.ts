/**
 * Pulls every published post, page, category, tag and author from the live
 * WordPress site and writes them to data/wp-export.json. When DATABASE_URL is
 * set, the same data is upserted into MySQL.
 *
 *   npm run wp:import
 */
import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { cleanContent as clean, decodeEntities, openingParagraph, readingMinutes, toPlainText, truncate } from "../../lib/content/sanitize";
import type { Snapshot, SnapshotPost } from "../../lib/content/types";

const WP_URL = process.env.WP_URL ?? "https://travelersthoughts.com";
const SITE_HOST = new URL(WP_URL).host;
const OUT_FILE = path.join(process.cwd(), "data", "wp-export.json");
// WordPress pages the new app renders itself.
const SKIPPED_PAGES = new Set(["home", "sitemap"]);

type WpTerm = { id: number; slug: string; name: string; description: string; count: number; taxonomy?: string };
type WpPost = {
  id: number;
  slug: string;
  status: string;
  date_gmt: string;
  modified_gmt: string;
  title: { rendered: string };
  content: { rendered: string };
  excerpt: { rendered: string };
  sticky?: boolean;
  categories?: number[];
  tags?: number[];
  _embedded?: {
    author?: { slug: string; name: string; description?: string; avatar_urls?: Record<string, string> }[];
    "wp:featuredmedia"?: { source_url?: string; alt_text?: string }[];
  };
};

async function fetchAll<T>(endpoint: string): Promise<T[]> {
  const items: T[] = [];
  for (let page = 1; ; page++) {
    const sep = endpoint.includes("?") ? "&" : "?";
    const res = await fetch(`${WP_URL}/wp-json/wp/v2/${endpoint}${sep}per_page=100&page=${page}`, {
      headers: { "User-Agent": "travelersthoughts-next importer" },
    });
    if (res.status === 400) break; // past the last page
    if (!res.ok) throw new Error(`${endpoint} page ${page}: ${res.status}`);
    const batch = (await res.json()) as T[];
    items.push(...batch);
    const totalPages = Number(res.headers.get("x-wp-totalpages") ?? 1);
    process.stdout.write(`  ${endpoint} ${page}/${totalPages}\r`);
    if (page >= totalPages) break;
  }
  process.stdout.write("\n");
  return items;
}

// Links to our own posts become relative so they keep working on any host.
function rewriteHref(href: string) {
  try {
    const url = new URL(href);
    if (url.host === SITE_HOST && !url.pathname.startsWith("/wp-content/")) {
      return url.pathname + url.search + url.hash;
    }
  } catch {
    // relative or malformed href; leave as is
  }
  return href;
}

function firstImage(html: string) {
  const match = html.match(/<img[^>]+src="([^"]+)"[^>]*?(?:alt="([^"]*)")?/);
  return match ? { src: match[1], alt: decodeEntities(match[2] ?? "") } : null;
}

function mapPost(p: WpPost, type: "post" | "page", catById: Map<number, WpTerm>, tagById: Map<number, WpTerm>): SnapshotPost {
  const content = clean(p.content.rendered, rewriteHref);
  const media = p._embedded?.["wp:featuredmedia"]?.[0];
  const fallback = firstImage(content);
  // WordPress auto-excerpts end in "[…]" and run across headings; prefer the opening paragraph for those.
  const rawExcerpt = toPlainText(p.excerpt.rendered);
  const isAutoExcerpt = !rawExcerpt || /\[…\]$/.test(rawExcerpt);
  const opening = openingParagraph(content);
  const excerpt = truncate(isAutoExcerpt ? opening || rawExcerpt.replace(/\s*\[…\]$/, "") : rawExcerpt, 300);
  const author = p._embedded?.author?.[0];
  return {
    type,
    status: "published",
    slug: p.slug,
    title: decodeEntities(p.title.rendered),
    excerpt,
    content,
    coverImage: media?.source_url ?? fallback?.src ?? null,
    coverAlt: media?.alt_text || fallback?.alt || decodeEntities(p.title.rendered),
    seoTitle: null,
    seoDescription: truncate(excerpt, 160),
    featured: Boolean(p.sticky),
    readingMinutes: readingMinutes(content),
    authorSlug: author?.slug ?? null,
    categorySlugs: (p.categories ?? []).map((id) => catById.get(id)?.slug).filter((s): s is string => Boolean(s)),
    tagSlugs: (p.tags ?? []).map((id) => tagById.get(id)?.slug).filter((s): s is string => Boolean(s)),
    publishedAt: new Date(p.date_gmt + "Z").toISOString(),
    updatedAt: new Date(p.modified_gmt + "Z").toISOString(),
  };
}

async function main() {
  console.log(`Importing from ${WP_URL}`);
  const [wpCategories, wpTags, wpPosts, wpPages] = await Promise.all([
    fetchAll<WpTerm>("categories"),
    fetchAll<WpTerm>("tags"),
    fetchAll<WpPost>("posts?_embed=author,wp:featuredmedia"),
    fetchAll<WpPost>("pages?_embed=author,wp:featuredmedia"),
  ]);

  const catById = new Map(wpCategories.map((c) => [c.id, c]));
  const tagById = new Map(wpTags.map((t) => [t.id, t]));

  const authors = new Map<string, Snapshot["authors"][number]>();
  for (const p of [...wpPosts, ...wpPages]) {
    const a = p._embedded?.author?.[0];
    if (a?.slug && !authors.has(a.slug)) {
      authors.set(a.slug, {
        slug: a.slug,
        name: a.name,
        bio: a.description || null,
        avatarUrl: a.avatar_urls?.["96"] ?? null,
      });
    }
  }

  const snapshot: Snapshot = {
    generatedAt: new Date().toISOString(),
    source: WP_URL,
    authors: [...authors.values()],
    categories: wpCategories
      .filter((c) => c.count > 0)
      .sort((a, b) => b.count - a.count)
      .map((c, i) => ({ slug: c.slug, name: decodeEntities(c.name), description: toPlainText(c.description) || null, sortOrder: i })),
    tags: wpTags.filter((t) => t.count > 0).map((t) => ({ slug: t.slug, name: decodeEntities(t.name) })),
    posts: [
      ...wpPosts.filter((p) => p.status === "publish").map((p) => mapPost(p, "post", catById, tagById)),
      ...wpPages.filter((p) => p.status === "publish" && !SKIPPED_PAGES.has(p.slug)).map((p) => mapPost(p, "page", catById, tagById)),
    ],
  };

  await mkdir(path.dirname(OUT_FILE), { recursive: true });
  await writeFile(OUT_FILE, JSON.stringify(snapshot, null, 2));
  console.log(
    `Wrote ${snapshot.posts.length} entries, ${snapshot.categories.length} categories, ${snapshot.tags.length} tags to ${path.relative(process.cwd(), OUT_FILE)}`,
  );

  if (process.env.DATABASE_URL) {
    const { seedDatabase } = await import("./seed");
    await seedDatabase(snapshot);
  } else {
    console.log("DATABASE_URL not set; skipped MySQL. Run `npm run wp:seed` once it is configured.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
