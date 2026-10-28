import "server-only";
import { and, asc, count, desc, eq, inArray, like, or, sql, type SQL } from "drizzle-orm";
import { db } from "../db/client";
import { authors, categories, contactMessages, media, postCategories, posts, postTags, tags, users } from "../db/schema";
import type { Post } from "../content/types";
import { toMediaItem } from "../media/storage";

export const ADMIN_PAGE_SIZE = 25;

export type PostFilter = {
  q?: string;
  status?: "draft" | "published";
  type?: "post" | "page";
  authorId?: number;
  page?: number;
};

export async function listPosts(filter: PostFilter) {
  const conditions: (SQL | undefined)[] = [
    eq(posts.type, filter.type ?? "post"),
    filter.status ? eq(posts.status, filter.status) : undefined,
    filter.authorId ? eq(posts.authorId, filter.authorId) : undefined,
    filter.q ? or(like(posts.title, `%${filter.q}%`), like(posts.slug, `%${filter.q}%`)) : undefined,
  ];
  const where = and(...conditions);
  const page = Math.max(1, filter.page ?? 1);

  const [rows, [{ n }]] = await Promise.all([
    db
      .select({
        id: posts.id,
        title: posts.title,
        slug: posts.slug,
        status: posts.status,
        coverImage: posts.coverImage,
        publishedAt: posts.publishedAt,
        updatedAt: posts.updatedAt,
        authorId: posts.authorId,
        authorName: authors.name,
        categoryName: categories.name,
      })
      .from(posts)
      .leftJoin(authors, eq(authors.id, posts.authorId))
      .leftJoin(categories, eq(categories.id, posts.primaryCategoryId))
      .where(where)
      .orderBy(sql`${posts.status} = 'draft' desc`, desc(posts.updatedAt))
      .limit(ADMIN_PAGE_SIZE)
      .offset((page - 1) * ADMIN_PAGE_SIZE),
    db.select({ n: count() }).from(posts).where(where),
  ]);
  return { rows, total: n, page, totalPages: Math.max(1, Math.ceil(n / ADMIN_PAGE_SIZE)) };
}

export async function getPostForEdit(id: number) {
  const [post] = await db.select().from(posts).where(eq(posts.id, id));
  if (!post) return null;
  const [cats, tagRows] = await Promise.all([
    db.select({ id: postCategories.categoryId }).from(postCategories).where(eq(postCategories.postId, id)),
    db
      .select({ name: tags.name })
      .from(postTags)
      .innerJoin(tags, eq(tags.id, postTags.tagId))
      .where(eq(postTags.postId, id)),
  ]);
  return {
    ...post,
    categoryIds: cats.map((c) => c.id),
    tagNames: tagRows.map((t) => t.name),
  };
}

export type EditablePost = NonNullable<Awaited<ReturnType<typeof getPostForEdit>>>;

export async function listCategoriesWithCounts() {
  return db
    .select({
      id: categories.id,
      slug: categories.slug,
      name: categories.name,
      description: categories.description,
      sortOrder: categories.sortOrder,
      posts: sql<number>`(select count(*) from ${postCategories} where ${postCategories.categoryId} = ${categories.id})`,
    })
    .from(categories)
    .orderBy(asc(categories.sortOrder), asc(categories.name));
}

export async function listTagsWithCounts() {
  return db
    .select({
      id: tags.id,
      slug: tags.slug,
      name: tags.name,
      posts: sql<number>`(select count(*) from ${postTags} where ${postTags.tagId} = ${tags.id})`,
    })
    .from(tags)
    .orderBy(asc(tags.name));
}

export async function listAuthors() {
  return db.select({ id: authors.id, name: authors.name }).from(authors).orderBy(asc(authors.name));
}

export async function listUsers() {
  return db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      active: users.active,
      lastLoginAt: users.lastLoginAt,
      lockedUntil: users.lockedUntil,
    })
    .from(users)
    .orderBy(asc(users.name));
}

export async function getUserProfile(userId: number) {
  const [row] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      authorId: users.authorId,
      bio: authors.bio,
      avatarUrl: authors.avatarUrl,
    })
    .from(users)
    .leftJoin(authors, eq(authors.id, users.authorId))
    .where(eq(users.id, userId));
  return row ?? null;
}

export const MEDIA_PAGE_SIZE = 48;

export async function listMedia({ page = 1, q }: { page?: number; q?: string }) {
  const where = q ? or(like(media.path, `%${q}%`), like(media.alt, `%${q}%`)) : undefined;
  const [rows, [{ n }]] = await Promise.all([
    db
      .select()
      .from(media)
      .where(where)
      .orderBy(desc(media.createdAt), desc(media.id))
      .limit(MEDIA_PAGE_SIZE)
      .offset((Math.max(1, page) - 1) * MEDIA_PAGE_SIZE),
    db.select({ n: count() }).from(media).where(where),
  ]);
  return { items: rows.map(toMediaItem), total: n, totalPages: Math.max(1, Math.ceil(n / MEDIA_PAGE_SIZE)) };
}

export async function dashboardStats(authorId: number | null) {
  const mine = authorId ? eq(posts.authorId, authorId) : sql`false`;
  const [[totals], recent, drafts] = await Promise.all([
    db
      .select({
        published: sql<number>`sum(${posts.type} = 'post' and ${posts.status} = 'published')`,
        drafts: sql<number>`sum(${posts.type} = 'post' and ${posts.status} = 'draft')`,
        pages: sql<number>`sum(${posts.type} = 'page')`,
        mine: sql<number>`sum(${mine})`,
      })
      .from(posts),
    db
      .select({ id: posts.id, title: posts.title, slug: posts.slug, publishedAt: posts.publishedAt })
      .from(posts)
      .where(and(eq(posts.type, "post"), eq(posts.status, "published")))
      .orderBy(desc(posts.publishedAt))
      .limit(5),
    db
      .select({ id: posts.id, title: posts.title, updatedAt: posts.updatedAt, authorName: authors.name })
      .from(posts)
      .leftJoin(authors, eq(authors.id, posts.authorId))
      .where(eq(posts.status, "draft"))
      .orderBy(desc(posts.updatedAt))
      .limit(5),
  ]);
  const [{ mediaCount }] = await db.select({ mediaCount: count() }).from(media);
  return {
    published: Number(totals.published ?? 0),
    drafts: Number(totals.drafts ?? 0),
    pages: Number(totals.pages ?? 0),
    mine: Number(totals.mine ?? 0),
    mediaCount,
    recent,
    recentDrafts: drafts,
  };
}

/** A post in the public `Post` shape regardless of status, for previews. */
export async function getPostPreview(id: number): Promise<(Post & { authorId: number | null; status: string }) | null> {
  const post = await getPostForEdit(id);
  if (!post) return null;
  const [author] = post.authorId ? await db.select().from(authors).where(eq(authors.id, post.authorId)) : [];
  const cats = post.categoryIds.length
    ? await db
        .select({ id: categories.id, slug: categories.slug, name: categories.name, description: categories.description, sortOrder: categories.sortOrder })
        .from(categories)
        .where(inArray(categories.id, post.categoryIds))
    : [];
  const primary = cats.find((c) => c.id === post.primaryCategoryId) ?? cats[0] ?? null;
  const toCategory = (c: (typeof cats)[number]) => ({ slug: c.slug, name: c.name, description: c.description, sortOrder: c.sortOrder });
  const now = new Date().toISOString();
  return {
    type: post.type,
    status: post.status,
    authorId: post.authorId,
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    content: post.content,
    coverImage: post.coverImage,
    coverAlt: post.coverAlt,
    seoTitle: post.seoTitle,
    seoDescription: post.seoDescription,
    readingMinutes: post.readingMinutes,
    publishedAt: post.publishedAt?.toISOString() ?? now,
    updatedAt: post.updatedAt.toISOString(),
    author: author ? { slug: author.slug, name: author.name, bio: author.bio, avatarUrl: author.avatarUrl } : null,
    category: primary ? toCategory(primary) : null,
    categories: cats.map(toCategory),
    tags: post.tagNames.map((name) => ({ name, slug: name.toLowerCase() })),
  };
}

export const MESSAGES_PAGE_SIZE = 30;

export async function listMessages({ status, page = 1 }: { status?: "new" | "read"; page?: number }) {
  const where = status ? eq(contactMessages.status, status) : undefined;
  const [rows, [{ n }]] = await Promise.all([
    db
      .select({
        id: contactMessages.id,
        name: contactMessages.name,
        email: contactMessages.email,
        topic: contactMessages.topic,
        message: contactMessages.message,
        status: contactMessages.status,
        createdAt: contactMessages.createdAt,
      })
      .from(contactMessages)
      .where(where)
      .orderBy(desc(contactMessages.createdAt))
      .limit(MESSAGES_PAGE_SIZE)
      .offset((Math.max(1, page) - 1) * MESSAGES_PAGE_SIZE),
    db.select({ n: count() }).from(contactMessages).where(where),
  ]);
  return { rows, total: n, totalPages: Math.max(1, Math.ceil(n / MESSAGES_PAGE_SIZE)) };
}

export async function countNewMessages() {
  const [{ n }] = await db.select({ n: count() }).from(contactMessages).where(eq(contactMessages.status, "new"));
  return n;
}
