"use server";

import { randomBytes } from "node:crypto";
import { and, count, eq, ne, sql } from "drizzle-orm";
import { revalidatePath, updateTag } from "next/cache";
import { requireAdmin, requireUser } from "@/lib/auth";
import { hashPassword, passwordProblem, verifyPassword } from "@/lib/auth/password";
import { destroyAllSessions } from "@/lib/auth/session";
import { CONTENT_TAG } from "@/lib/content";
import { slugify } from "@/lib/content/sanitize";
import { db } from "@/lib/db/client";
import { authors, users } from "@/lib/db/schema";

export type UserState = { ok?: boolean; error?: string; message?: string; tempPassword?: string };

const field = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();

// Readable but strong: 4 groups of 4 from an unambiguous alphabet (~80 bits).
function temporaryPassword() {
  const alphabet = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(16);
  const chars = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
  return chars.match(/.{4}/g)!.join("-");
}

async function authorFor(name: string) {
  const [existing] = await db.select().from(authors).where(sql`lower(${authors.name}) = ${name.toLowerCase()}`);
  if (existing) return existing.id;
  let slug = slugify(name) || "author";
  for (let n = 2; (await db.select({ id: authors.id }).from(authors).where(eq(authors.slug, slug))).length; n++) slug = `${slugify(name)}-${n}`;
  const [{ id }] = await db.insert(authors).values({ slug, name }).$returningId();
  return id;
}

async function otherActiveAdmins(userId: number) {
  const [{ n }] = await db
    .select({ n: count() })
    .from(users)
    .where(and(eq(users.role, "admin"), eq(users.active, true), ne(users.id, userId)));
  return n;
}

export async function createUser(_prev: UserState, formData: FormData): Promise<UserState> {
  await requireAdmin();
  const email = field(formData, "email").toLowerCase();
  const name = field(formData, "name");
  const role = field(formData, "role") === "admin" ? "admin" : "author";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Enter a valid email address." };
  if (!name) return { error: "Enter the name readers will see on their posts." };
  if ((await db.select({ id: users.id }).from(users).where(eq(users.email, email))).length) {
    return { error: "Someone already has that email." };
  }

  const tempPassword = temporaryPassword();
  const now = new Date();
  await db.insert(users).values({
    email,
    name,
    role,
    passwordHash: await hashPassword(tempPassword),
    authorId: await authorFor(name),
    createdAt: now,
    updatedAt: now,
  });
  revalidatePath("/admin/users/");
  return { ok: true, message: `${name} can now sign in as ${email}.`, tempPassword };
}

export async function updateUser(_prev: UserState, formData: FormData): Promise<UserState> {
  const admin = await requireAdmin();
  const id = Number(formData.get("id"));
  const intent = field(formData, "intent");
  const [user] = await db.select().from(users).where(eq(users.id, id));
  if (!user) return { error: "That user no longer exists." };

  if (intent === "role") {
    const role = field(formData, "role") === "admin" ? "admin" : "author";
    if (role === "author" && user.role === "admin" && (await otherActiveAdmins(id)) === 0) {
      return { error: "There must be at least one admin." };
    }
    await db.update(users).set({ role, updatedAt: new Date() }).where(eq(users.id, id));
  } else if (intent === "toggle-active") {
    if (id === admin.id) return { error: "You can't deactivate yourself." };
    if (user.active && user.role === "admin" && (await otherActiveAdmins(id)) === 0) return { error: "There must be at least one admin." };
    await db.update(users).set({ active: !user.active, updatedAt: new Date() }).where(eq(users.id, id));
    if (user.active) await destroyAllSessions(id);
  } else if (intent === "reset-password") {
    const tempPassword = temporaryPassword();
    await db
      .update(users)
      .set({ passwordHash: await hashPassword(tempPassword), failedLogins: 0, lockedUntil: null, updatedAt: new Date() })
      .where(eq(users.id, id));
    await destroyAllSessions(id);
    revalidatePath("/admin/users/");
    return { ok: true, message: `New password for ${user.email}. Their other sessions were signed out.`, tempPassword };
  } else if (intent === "unlock") {
    await db.update(users).set({ failedLogins: 0, lockedUntil: null }).where(eq(users.id, id));
  }
  revalidatePath("/admin/users/");
  return { ok: true };
}

export async function updateProfile(_prev: UserState, formData: FormData): Promise<UserState> {
  const user = await requireUser();
  const name = field(formData, "name");
  if (!name) return { error: "Your name can't be empty." };
  const bio = field(formData, "bio").slice(0, 1000) || null;
  const avatarUrl = field(formData, "avatarUrl") || null;
  if (avatarUrl && !avatarUrl.startsWith("/uploads/")) return { error: "Pick your photo from the media library." };

  await db.update(users).set({ name, updatedAt: new Date() }).where(eq(users.id, user.id));
  if (user.authorId) {
    await db.update(authors).set({ name, bio, avatarUrl }).where(eq(authors.id, user.authorId));
    // Bylines and author boxes are part of cached pages.
    updateTag(CONTENT_TAG);
  }
  revalidatePath("/admin/profile/");
  return { ok: true, message: "Profile saved." };
}

export async function changePassword(_prev: UserState, formData: FormData): Promise<UserState> {
  const session = await requireUser();
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const [user] = await db.select().from(users).where(eq(users.id, session.id));
  if (!(await verifyPassword(current, user.passwordHash))) return { error: "Your current password is wrong." };
  const problem = passwordProblem(next);
  if (problem) return { error: problem };
  if (next !== String(formData.get("confirm") ?? "")) return { error: "The new passwords don't match." };

  await db.update(users).set({ passwordHash: await hashPassword(next), updatedAt: new Date() }).where(eq(users.id, user.id));
  return { ok: true, message: "Password changed." };
}
