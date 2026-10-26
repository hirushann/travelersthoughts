"use server";

import { and, eq, ne } from "drizzle-orm";
import { revalidatePath, updateTag } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { CONTENT_TAG } from "@/lib/content";
import { slugify } from "@/lib/content/sanitize";
import { db } from "@/lib/db/client";
import { categories, posts, redirects, tags } from "@/lib/db/schema";
import { categoryPath } from "@/lib/site";

export type TermState = { ok?: boolean; error?: string };

const field = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();

function done(path: string): TermState {
  updateTag(CONTENT_TAG);
  revalidatePath(path);
  return { ok: true };
}

export async function saveCategory(_prev: TermState, formData: FormData): Promise<TermState> {
  await requireAdmin();
  const id = Number(formData.get("id")) || null;
  const name = field(formData, "name");
  const slug = slugify(field(formData, "slug") || name);
  if (!name || !slug) return { error: "A category needs a name." };

  const [clash] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(and(eq(categories.slug, slug), id ? ne(categories.id, id) : undefined));
  if (clash) return { error: "Another category already uses that URL." };

  const values = {
    name: name.slice(0, 191),
    slug,
    description: field(formData, "description") || null,
    sortOrder: Number(formData.get("sortOrder")) || 0,
  };

  if (id) {
    const [before] = await db.select().from(categories).where(eq(categories.id, id));
    if (!before) return { error: "That category no longer exists." };
    await db.update(categories).set(values).where(eq(categories.id, id));
    if (before.slug !== slug) {
      await db
        .insert(redirects)
        .values({ fromPath: categoryPath(before.slug), toPath: categoryPath(slug), createdAt: new Date() })
        .onDuplicateKeyUpdate({ set: { toPath: categoryPath(slug) } });
    }
  } else {
    await db.insert(categories).values(values);
  }
  return done("/admin/categories/");
}

export async function deleteCategory(_prev: TermState, formData: FormData): Promise<TermState> {
  await requireAdmin();
  const id = Number(formData.get("id"));
  // Posts keep their other categories; only the primary pointer needs clearing.
  await db.update(posts).set({ primaryCategoryId: null }).where(eq(posts.primaryCategoryId, id));
  await db.delete(categories).where(eq(categories.id, id));
  return done("/admin/categories/");
}

export async function saveTag(_prev: TermState, formData: FormData): Promise<TermState> {
  await requireAdmin();
  const id = Number(formData.get("id")) || null;
  const name = field(formData, "name");
  const slug = slugify(field(formData, "slug") || name);
  if (!name || !slug) return { error: "A tag needs a name." };
  const [clash] = await db
    .select({ id: tags.id })
    .from(tags)
    .where(and(eq(tags.slug, slug), id ? ne(tags.id, id) : undefined));
  if (clash) return { error: "That tag already exists." };

  if (id) await db.update(tags).set({ name: name.slice(0, 191), slug }).where(eq(tags.id, id));
  else await db.insert(tags).values({ name: name.slice(0, 191), slug });
  return done("/admin/tags/");
}

export async function deleteTag(_prev: TermState, formData: FormData): Promise<TermState> {
  await requireAdmin();
  await db.delete(tags).where(eq(tags.id, Number(formData.get("id"))));
  return done("/admin/tags/");
}
