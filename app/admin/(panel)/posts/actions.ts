"use server";

import { and, eq, inArray, ne } from "drizzle-orm";
import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { canEditPost, requireUser } from "@/lib/auth";
import { CONTENT_TAG } from "@/lib/content";
import { cleanContent, openingParagraph, readingMinutes, slugify, truncate } from "@/lib/content/sanitize";
import { db } from "@/lib/db/client";
import { categories, postCategories, posts, postTags, redirects, tags } from "@/lib/db/schema";

export type SaveState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Partial<Record<"title" | "slug" | "content" | "coverImage", string>>;
  savedAt?: string;
  status?: "draft" | "published";
  slug?: string;
  /** Set when a new post was just created; the editor then moves to its edit URL. */
  createdId?: number;
};

// First path segments the site already uses; a post can't take them.
const RESERVED_SLUGS = new Set(["admin", "api", "category", "uploads", "page", "feed", "rss.xml", "sitemap.xml", "robots.txt", "tag", "author"]);

const str = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();

// The editor's datetime-local field is labelled UTC, so read it as UTC.
function parseDate(value: string) {
  if (!value) return null;
  const d = new Date(`${value}Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Keeps old URLs working after a slug change, without redirect chains. */
async function recordSlugChange(oldSlug: string, newSlug: string) {
  const from = `/${oldSlug}/`;
  const to = `/${newSlug}/`;
  await db.delete(redirects).where(eq(redirects.fromPath, to));
  await db.update(redirects).set({ toPath: to }).where(eq(redirects.toPath, from));
  await db
    .insert(redirects)
    .values({ fromPath: from, toPath: to, createdAt: new Date() })
    .onDuplicateKeyUpdate({ set: { toPath: to } });
}

async function syncTags(postId: number, names: string[]) {
  const unique = [...new Map(names.map((n) => [slugify(n), n.trim()])).entries()].filter(([slug]) => slug);
  await db.delete(postTags).where(eq(postTags.postId, postId));
  if (!unique.length) return;
  for (const [slug, name] of unique) {
    await db.insert(tags).values({ slug, name: name.slice(0, 191) }).onDuplicateKeyUpdate({ set: { slug } });
  }
  const rows = await db.select({ id: tags.id }).from(tags).where(inArray(tags.slug, unique.map(([s]) => s)));
  await db.insert(postTags).values(rows.map((r) => ({ postId, tagId: r.id })));
}

export async function savePost(_prev: SaveState, formData: FormData): Promise<SaveState> {
  const user = await requireUser();
  const intent = str(formData, "intent") as "save" | "publish" | "unpublish";
  const id = Number(formData.get("id")) || null;

  const existing = id ? (await db.select().from(posts).where(eq(posts.id, id)))[0] : null;
  if (id && !existing) return { error: "This post no longer exists." };
  if (existing && !canEditPost(user, existing)) return { error: "You can only edit your own posts." };

  const title = str(formData, "title");
  const type = str(formData, "type") === "page" ? "page" : "post";
  const slug = slugify(str(formData, "slug") || title);
  const content = cleanContent(String(formData.get("content") ?? ""));
  const coverImage = str(formData, "coverImage") || null;

  const fieldErrors: SaveState["fieldErrors"] = {};
  if (!title) fieldErrors.title = "Give the post a title.";
  else if (title.length > 255) fieldErrors.title = "Keep the title under 255 characters.";
  if (!slug) fieldErrors.slug = "The URL needs at least one letter or number.";
  else if (RESERVED_SLUGS.has(slug)) fieldErrors.slug = `“${slug}” is reserved by the site. Pick another URL.`;
  if (coverImage && !/^(\/uploads\/|https:\/\/)/.test(coverImage)) fieldErrors.coverImage = "Choose the cover from the media library.";

  const nextStatus = intent === "publish" ? "published" : intent === "unpublish" ? "draft" : (existing?.status ?? "draft");
  if (nextStatus === "published" && !content.replace(/<[^>]+>/g, "").trim()) fieldErrors.content = "Write something before publishing.";

  if (slug && !fieldErrors.slug) {
    const [clash] = await db
      .select({ id: posts.id })
      .from(posts)
      .where(and(eq(posts.slug, slug), id ? ne(posts.id, id) : undefined));
    if (clash) fieldErrors.slug = "Another post already uses this URL.";
  }
  if (Object.keys(fieldErrors).length) return { error: "Fix the highlighted fields.", fieldErrors };

  // Authors always write as themselves; admins can pick the byline.
  const requestedAuthor = Number(formData.get("authorId")) || null;
  const authorId = user.role === "admin" ? (requestedAuthor ?? existing?.authorId ?? user.authorId) : (existing?.authorId ?? user.authorId);

  const categoryIds = formData
    .getAll("categoryIds")
    .map(Number)
    .filter((n) => Number.isInteger(n) && n > 0);
  const validCategories = categoryIds.length
    ? (await db.select({ id: categories.id }).from(categories).where(inArray(categories.id, categoryIds))).map((c) => c.id)
    : [];
  const primaryChoice = Number(formData.get("primaryCategoryId"));
  const primaryCategoryId = validCategories.includes(primaryChoice) ? primaryChoice : (validCategories[0] ?? null);

  const excerptInput = str(formData, "excerpt");
  const excerpt = excerptInput || truncate(openingParagraph(content), 300) || null;
  const now = new Date();
  const requestedDate = parseDate(str(formData, "publishedAt"));
  const publishedAt =
    nextStatus === "published" ? (requestedDate ?? existing?.publishedAt ?? now) : (requestedDate ?? existing?.publishedAt ?? null);

  const values = {
    type,
    status: nextStatus,
    slug,
    title,
    excerpt,
    content,
    coverImage,
    coverAlt: str(formData, "coverAlt").slice(0, 255) || null,
    seoTitle: str(formData, "seoTitle").slice(0, 255) || null,
    seoDescription: str(formData, "seoDescription").slice(0, 320) || null,
    featured: formData.get("featured") === "on",
    readingMinutes: readingMinutes(content),
    authorId,
    primaryCategoryId,
    publishedAt,
    updatedAt: now,
  } as const;

  let postId = id;
  if (existing) {
    await db.update(posts).set(values).where(eq(posts.id, existing.id));
    if (existing.slug !== slug && existing.status === "published") await recordSlugChange(existing.slug, slug);
  } else {
    [{ id: postId }] = await db.insert(posts).values({ ...values, createdAt: now }).$returningId();
  }

  await db.delete(postCategories).where(eq(postCategories.postId, postId!));
  if (validCategories.length) await db.insert(postCategories).values(validCategories.map((categoryId) => ({ postId: postId!, categoryId })));
  await syncTags(postId!, str(formData, "tags").split(","));

  // Pages, listings, sitemap and feed all read through this tag.
  updateTag(CONTENT_TAG);

  // A new post returns its id rather than redirecting: a redirect would render the whole
  // edit page inside this response, which is slow on shared hosting and left the UI on "Saving…".
  return { ok: true, savedAt: now.toISOString(), status: nextStatus, slug, createdId: existing ? undefined : postId! };
}

export async function deletePost(formData: FormData) {
  const user = await requireUser();
  const id = Number(formData.get("id"));
  const [post] = await db.select().from(posts).where(eq(posts.id, id));
  if (!post) redirect("/admin/posts/");
  if (!canEditPost(user, post)) throw new Error("You can only delete your own posts.");

  await db.delete(posts).where(eq(posts.id, id));
  updateTag(CONTENT_TAG);
  redirect(post.type === "page" ? "/admin/posts/?type=page&deleted=1" : "/admin/posts/?deleted=1");
}
