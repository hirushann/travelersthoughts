import "server-only";
import { eq, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "../db/client";
import { users } from "../db/schema";
import { hashPassword, verifyPassword } from "./password";
import { createSession } from "./session";

const MAX_FAILURES = 5;
const LOCK_MINUTES = 15;
const IP_WINDOW_MS = 15 * 60 * 1000;
const IP_MAX_ATTEMPTS = 30;

// Per-IP throttle on top of the per-account lock, so one address can't spray many accounts.
const ipAttempts = new Map<string, number[]>();

function ipLimited(ip: string) {
  const now = Date.now();
  const recent = (ipAttempts.get(ip) ?? []).filter((t) => now - t < IP_WINDOW_MS);
  recent.push(now);
  ipAttempts.set(ip, recent);
  return recent.length > IP_MAX_ATTEMPTS;
}

// Verifying against a dummy hash when the email is unknown keeps response times uniform.
let dummyHash: Promise<string> | undefined;

export type LoginResult = { ok: true } | { ok: false; error: string };

const GENERIC_ERROR = "That email and password don't match.";

export async function attemptLogin(emailInput: string, password: string): Promise<LoginResult> {
  const email = emailInput.trim().toLowerCase();
  const ip = ((await headers()).get("x-forwarded-for")?.split(",")[0] ?? "local").trim();
  if (ipLimited(ip)) return { ok: false, error: "Too many attempts. Wait a few minutes and try again." };
  if (!email || !password) return { ok: false, error: GENERIC_ERROR };

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user) {
    dummyHash ??= hashPassword("not-a-real-password");
    await verifyPassword(password, await dummyHash);
    return { ok: false, error: GENERIC_ERROR };
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    return { ok: false, error: `This account is locked after too many attempts. Try again in ${LOCK_MINUTES} minutes.` };
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid || !user.active) {
    if (valid) return { ok: false, error: "This account has been deactivated. Ask an admin to restore it." };
    const failures = user.failedLogins + 1;
    await db
      .update(users)
      .set({
        failedLogins: failures >= MAX_FAILURES ? 0 : sql`${users.failedLogins} + 1`,
        lockedUntil: failures >= MAX_FAILURES ? new Date(Date.now() + LOCK_MINUTES * 60 * 1000) : user.lockedUntil,
      })
      .where(eq(users.id, user.id));
    return { ok: false, error: GENERIC_ERROR };
  }

  await db.update(users).set({ failedLogins: 0, lockedUntil: null, lastLoginAt: new Date() }).where(eq(users.id, user.id));
  await createSession(user.id);
  return { ok: true };
}
