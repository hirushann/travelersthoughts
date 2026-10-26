import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getSessionUser, type SessionUser } from "./session";

export type { SessionUser };

/** The signed-in user for this request, or null. Deduplicated per render. */
export const getCurrentUser = cache(getSessionUser);

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login/");
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/admin/?denied=1");
  return user;
}

/** Admins edit anything; authors edit posts under their own byline. */
export function canEditPost(user: SessionUser, post: { authorId: number | null }) {
  return user.role === "admin" || (user.authorId !== null && post.authorId === user.authorId);
}
