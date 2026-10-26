import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, lt } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { connection } from "next/server";
import { db } from "../db/client";
import { sessions, users } from "../db/schema";

export const SESSION_COOKIE = "tt_session";
const SESSION_DAYS = 30;

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export type SessionUser = {
  id: number;
  email: string;
  name: string;
  role: "admin" | "author";
  authorId: number | null;
};

/** Creates a session and sets the cookie. Call only from Server Actions or Route Handlers. */
export async function createSession(userId: number) {
  const token = randomBytes(32).toString("base64url");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  const h = await headers();

  await db.insert(sessions).values({
    id: hashToken(token),
    userId,
    expiresAt,
    createdAt: now,
    ip: (h.get("x-forwarded-for")?.split(",")[0] ?? "").trim().slice(0, 64) || null,
    userAgent: h.get("user-agent")?.slice(0, 255) ?? null,
  });
  // Housekeeping: drop this user's expired sessions.
  await db.delete(sessions).where(and(eq(sessions.userId, userId), lt(sessions.expiresAt, now)));

  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  // Expiry is checked against the clock, so this must run per request, never at build time.
  await connection();
  const [row] = await db
    .select({ id: users.id, email: users.email, name: users.name, role: users.role, authorId: users.authorId })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.id, hashToken(token)), gt(sessions.expiresAt, new Date()), eq(users.active, true)))
    .limit(1);
  return row ?? null;
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.delete(sessions).where(eq(sessions.id, hashToken(token)));
  jar.delete(SESSION_COOKIE);
}

/** Signs a user out everywhere, e.g. after a password reset or deactivation. */
export async function destroyAllSessions(userId: number) {
  await db.delete(sessions).where(eq(sessions.userId, userId));
}
