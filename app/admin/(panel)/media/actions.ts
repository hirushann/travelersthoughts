"use server";

import { eq, like, or, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { media, posts } from "@/lib/db/schema";
import { deleteMediaFile, mediaUrl } from "@/lib/media/storage";

export type MediaActionState = { ok?: boolean; error?: string };

async function loadOwned(id: number) {
  const user = await requireUser();
  const [item] = await db.select().from(media).where(eq(media.id, id));
  if (!item) return { error: "That image no longer exists." } as const;
  if (user.role !== "admin" && item.uploadedBy !== user.id) return { error: "Only admins can change images other people uploaded." } as const;
  return { item } as const;
}

export async function updateAlt(_prev: MediaActionState, formData: FormData): Promise<MediaActionState> {
  const result = await loadOwned(Number(formData.get("id")));
  if ("error" in result) return { error: result.error };
  const alt = String(formData.get("alt") ?? "").trim().slice(0, 255) || null;
  await db.update(media).set({ alt }).where(eq(media.id, result.item.id));
  revalidatePath("/admin/media/");
  return { ok: true };
}

export async function deleteMedia(_prev: MediaActionState, formData: FormData): Promise<MediaActionState> {
  const result = await loadOwned(Number(formData.get("id")));
  if ("error" in result) return { error: result.error };

  // Refuse to break published images; the editor shows where it's used.
  const url = mediaUrl(result.item.path);
  const [{ uses }] = await db
    .select({ uses: sql<number>`count(*)` })
    .from(posts)
    .where(or(like(posts.content, `%${url}%`), eq(posts.coverImage, url)));
  if (Number(uses) > 0) return { error: `This image is used in ${uses} post${Number(uses) === 1 ? "" : "s"}. Remove it there first.` };

  await db.delete(media).where(eq(media.id, result.item.id));
  await deleteMediaFile(result.item.path);
  revalidatePath("/admin/media/");
  return { ok: true };
}
