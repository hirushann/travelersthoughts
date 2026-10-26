import type { MetadataRoute } from "next";
import { countPosts, getCategories, getPosts, getRoutes, POSTS_PER_PAGE } from "@/lib/content";
import { absoluteUrl, categoryPath, postPath } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [routes, categories, [newest]] = await Promise.all([getRoutes(), getCategories(), getPosts({ limit: 1 })]);

  const categoryEntries = await Promise.all(
    categories.map(async (c) => {
      const [latest] = await getPosts({ categorySlug: c.slug, limit: 1 });
      const pages = Math.ceil((await countPosts(c.slug)) / POSTS_PER_PAGE);
      return Array.from({ length: Math.max(1, pages) }, (_, i) => ({
        url: absoluteUrl(categoryPath(c.slug, i + 1)),
        lastModified: i === 0 ? latest?.updatedAt : undefined,
        changeFrequency: "weekly" as const,
        priority: i === 0 ? 0.7 : 0.4,
      }));
    }),
  );

  return [
    { url: absoluteUrl("/"), lastModified: newest?.updatedAt, changeFrequency: "daily", priority: 1 },
    ...categoryEntries.flat(),
    ...routes.map((r) => ({
      url: absoluteUrl(postPath(r.slug)),
      lastModified: r.updatedAt,
      changeFrequency: r.type === "post" ? ("monthly" as const) : ("yearly" as const),
      priority: r.type === "post" ? 0.8 : 0.3,
    })),
  ];
}
