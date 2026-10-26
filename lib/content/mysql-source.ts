import "server-only";
import { and, asc, count, desc, eq, inArray, notInArray, type SQL } from "drizzle-orm";
import { db } from "../db/client";
import { authors, categories, postCategories, posts, postTags, redirects, tags } from "../db/schema";
import type { ContentSource } from "./source";
import type { Author, Category, PostSummary } from "./types";

const iso = (d: Date | null) => (d ?? new Date(0)).toISOString();

const summaryColumns = {
  slug: posts.slug,
  title: posts.title,
  excerpt: posts.excerpt,
  coverImage: posts.coverImage,
  coverAlt: posts.coverAlt,
  readingMinutes: posts.readingMinutes,
  publishedAt: posts.publishedAt,
  updatedAt: posts.updatedAt,
  category: {
    slug: categories.slug,
    name: categories.name,
    description: categories.description,
    sortOrder: categories.sortOrder,
  },
  author: {
    slug: authors.slug,
    name: authors.name,
    bio: authors.bio,
    avatarUrl: authors.avatarUrl,
  },
};

type SummaryRow = {
  slug: string;
  title: string;
  excerpt: string | null;
  coverImage: string | null;
  coverAlt: string | null;
  readingMinutes: number;
  publishedAt: Date | null;
  updatedAt: Date;
  category: Category | null;
  author: Author | null;
};

const toSummary = (r: SummaryRow): PostSummary => ({
  slug: r.slug,
  title: r.title,
  excerpt: r.excerpt,
  coverImage: r.coverImage,
  coverAlt: r.coverAlt,
  readingMinutes: r.readingMinutes,
  publishedAt: iso(r.publishedAt),
  updatedAt: iso(r.updatedAt),
  category: r.category,
  author: r.author,
});

const published = (type: "post" | "page") => and(eq(posts.type, type), eq(posts.status, "published"));

function inCategory(categorySlug: string): SQL {
  return inArray(
    posts.id,
    db
      .select({ id: postCategories.postId })
      .from(postCategories)
      .innerJoin(categories, eq(categories.id, postCategories.categoryId))
      .where(eq(categories.slug, categorySlug)),
  );
}

export const mysqlSource: ContentSource = {
  async categories() {
    return db
      .select({ slug: categories.slug, name: categories.name, description: categories.description, sortOrder: categories.sortOrder })
      .from(categories)
      .orderBy(asc(categories.sortOrder), asc(categories.name));
  },

  async posts({ categorySlug, limit, offset = 0, excludeSlugs = [] }) {
    const rows = await db
      .select(summaryColumns)
      .from(posts)
      .leftJoin(categories, eq(categories.id, posts.primaryCategoryId))
      .leftJoin(authors, eq(authors.id, posts.authorId))
      .where(
        and(
          published("post"),
          categorySlug ? inCategory(categorySlug) : undefined,
          excludeSlugs.length ? notInArray(posts.slug, excludeSlugs) : undefined,
        ),
      )
      .orderBy(desc(posts.publishedAt))
      .limit(limit)
      .offset(offset);
    return rows.map(toSummary);
  },

  async countPosts(categorySlug) {
    const [row] = await db
      .select({ n: count() })
      .from(posts)
      .where(and(published("post"), categorySlug ? inCategory(categorySlug) : undefined));
    return row.n;
  },

  async postBySlug(slug) {
    const [row] = await db
      .select({ ...summaryColumns, id: posts.id, type: posts.type, content: posts.content, seoTitle: posts.seoTitle, seoDescription: posts.seoDescription, status: posts.status })
      .from(posts)
      .leftJoin(categories, eq(categories.id, posts.primaryCategoryId))
      .leftJoin(authors, eq(authors.id, posts.authorId))
      .where(eq(posts.slug, slug))
      .limit(1);
    if (!row || row.status !== "published") return null;

    const [postCats, postTagRows] = await Promise.all([
      db
        .select({ slug: categories.slug, name: categories.name, description: categories.description, sortOrder: categories.sortOrder })
        .from(postCategories)
        .innerJoin(categories, eq(categories.id, postCategories.categoryId))
        .where(eq(postCategories.postId, row.id)),
      db
        .select({ slug: tags.slug, name: tags.name })
        .from(postTags)
        .innerJoin(tags, eq(tags.id, postTags.tagId))
        .where(eq(postTags.postId, row.id)),
    ]);

    return {
      ...toSummary(row),
      type: row.type,
      content: row.content,
      seoTitle: row.seoTitle,
      seoDescription: row.seoDescription,
      categories: postCats,
      tags: postTagRows,
    };
  },

  async routes() {
    const rows = await db
      .select({ slug: posts.slug, type: posts.type, updatedAt: posts.updatedAt })
      .from(posts)
      .where(eq(posts.status, "published"))
      .orderBy(desc(posts.publishedAt));
    return rows.map((r) => ({ ...r, updatedAt: iso(r.updatedAt) }));
  },

  async redirectFor(path) {
    const [row] = await db.select({ toPath: redirects.toPath }).from(redirects).where(eq(redirects.fromPath, path)).limit(1);
    return row?.toPath ?? null;
  },
};
