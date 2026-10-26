import type { Category, Post, PostSummary } from "./types";

export type PostQuery = {
  categorySlug?: string;
  limit: number;
  offset?: number;
  excludeSlugs?: string[];
};

export type RouteEntry = { slug: string; type: "post" | "page"; updatedAt: string };

/** Everything the public site reads. */
export interface ContentSource {
  categories(): Promise<Category[]>;
  /** Published articles (not pages), newest first. */
  posts(query: PostQuery): Promise<PostSummary[]>;
  countPosts(categorySlug?: string): Promise<number>;
  /** A published post or page. */
  postBySlug(slug: string): Promise<Post | null>;
  routes(): Promise<RouteEntry[]>;
  /** Where an old path now lives, if it was renamed. */
  redirectFor(path: string): Promise<string | null>;
}
