/**
 * Loads data/wp-export.json into MySQL. Safe to re-run: rows are upserted by slug.
 *
 *   npm run wp:seed
 */
import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "../../lib/db/schema";
import type { Snapshot } from "../../lib/content/types";

const { authors, categories, tags, posts, postCategories, postTags } = schema;

export async function seedDatabase(snapshot: Snapshot) {
  const pool = mysql.createPool({ uri: process.env.DATABASE_URL!, connectionLimit: 5 });
  const db = drizzle(pool, { schema, mode: "default" });

  try {
    for (const a of snapshot.authors) {
      await db.insert(authors).values(a).onDuplicateKeyUpdate({ set: { name: a.name, bio: a.bio, avatarUrl: a.avatarUrl } });
    }
    for (const c of snapshot.categories) {
      await db
        .insert(categories)
        .values(c)
        .onDuplicateKeyUpdate({ set: { name: c.name, description: c.description, sortOrder: c.sortOrder } });
    }
    for (const t of snapshot.tags) {
      await db.insert(tags).values(t).onDuplicateKeyUpdate({ set: { name: t.name } });
    }

    const idMap = async <T extends { id: number; slug: string }>(rows: Promise<T[]>) =>
      new Map((await rows).map((r) => [r.slug, r.id]));
    const authorIds = await idMap(db.select({ id: authors.id, slug: authors.slug }).from(authors));
    const categoryIds = await idMap(db.select({ id: categories.id, slug: categories.slug }).from(categories));
    const tagIds = await idMap(db.select({ id: tags.id, slug: tags.slug }).from(tags));

    // Posts edited in the admin after their WordPress version are left alone.
    const existing = new Map(
      (await db.select({ slug: posts.slug, updatedAt: posts.updatedAt }).from(posts)).map((r) => [r.slug, r.updatedAt]),
    );
    let skipped = 0;

    for (const p of snapshot.posts) {
      const current = existing.get(p.slug);
      if (current && current.getTime() >= new Date(p.updatedAt).getTime()) {
        skipped++;
        continue;
      }
      const values = {
        type: p.type,
        status: p.status,
        slug: p.slug,
        title: p.title,
        excerpt: p.excerpt,
        content: p.content,
        coverImage: p.coverImage,
        coverAlt: p.coverAlt?.slice(0, 255) ?? null,
        seoTitle: p.seoTitle,
        seoDescription: p.seoDescription,
        featured: p.featured,
        readingMinutes: p.readingMinutes,
        authorId: p.authorSlug ? (authorIds.get(p.authorSlug) ?? null) : null,
        primaryCategoryId: categoryIds.get(p.categorySlugs[0]) ?? null,
        publishedAt: new Date(p.publishedAt),
        updatedAt: new Date(p.updatedAt),
        createdAt: new Date(p.publishedAt),
      };
      // Keep the original createdAt on re-runs.
      await db.insert(posts).values(values).onDuplicateKeyUpdate({ set: { ...values, createdAt: undefined } });

      const [row] = await db.select({ id: posts.id }).from(posts).where(eq(posts.slug, p.slug));
      await db.delete(postCategories).where(eq(postCategories.postId, row.id));
      await db.delete(postTags).where(eq(postTags.postId, row.id));

      const catRows = p.categorySlugs.flatMap((s) => (categoryIds.has(s) ? [{ postId: row.id, categoryId: categoryIds.get(s)! }] : []));
      const tagRows = p.tagSlugs.flatMap((s) => (tagIds.has(s) ? [{ postId: row.id, tagId: tagIds.get(s)! }] : []));
      if (catRows.length) await db.insert(postCategories).values(catRows);
      if (tagRows.length) await db.insert(postTags).values(tagRows);
    }

    const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(posts);
    console.log(`MySQL now holds ${count} posts and pages (${skipped} already up to date, left untouched).`);
  } finally {
    await pool.end();
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const file = path.join(process.cwd(), "data", "wp-export.json");
  readFile(file, "utf8")
    .then((raw) => seedDatabase(JSON.parse(raw) as Snapshot))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
