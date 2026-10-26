import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { mysqlSource } from "./mysql-source";
import type { PostQuery } from "./source";

export type { Author, Category, Post, PostSummary, Tag } from "./types";

/** Tag every content read shares; the admin calls `updateTag(CONTENT_TAG)` after each change. */
export const CONTENT_TAG = "content";


export async function getCategories() {
  "use cache";
  cacheTag(CONTENT_TAG);
  cacheLife("hours");
  return mysqlSource.categories();
}

export async function getCategory(slug: string) {
  return (await getCategories()).find((c) => c.slug === slug) ?? null;
}

export async function getPosts(query: PostQuery) {
  "use cache";
  cacheTag(CONTENT_TAG);
  cacheLife("hours");
  return mysqlSource.posts(query);
}

export async function countPosts(categorySlug?: string) {
  "use cache";
  cacheTag(CONTENT_TAG);
  cacheLife("hours");
  return mysqlSource.countPosts(categorySlug);
}

export async function getPost(slug: string) {
  "use cache";
  cacheTag(CONTENT_TAG, `post:${slug}`);
  cacheLife("hours");
  return mysqlSource.postBySlug(slug);
}

export async function getRoutes() {
  "use cache";
  cacheTag(CONTENT_TAG);
  cacheLife("hours");
  return mysqlSource.routes();
}

export async function getRedirect(path: string) {
  "use cache";
  cacheTag(CONTENT_TAG);
  cacheLife("hours");
  return mysqlSource.redirectFor(path);
}

export async function getRelatedPosts(slug: string, categorySlug: string | undefined, limit = 3) {
  const related = categorySlug ? await getPosts({ categorySlug, limit, excludeSlugs: [slug] }) : [];
  if (related.length >= limit) return related;
  const fill = await getPosts({ limit: limit - related.length, excludeSlugs: [slug, ...related.map((p) => p.slug)] });
  return [...related, ...fill];
}

export const POSTS_PER_PAGE = 12;
