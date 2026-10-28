"use server";

import { and, count, eq, gt } from "drizzle-orm";
import { headers } from "next/headers";
import { CONTACT_TOPICS } from "@/lib/contact";
import { db } from "@/lib/db/client";
import { contactMessages } from "@/lib/db/schema";

export type ContactState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Partial<Record<"name" | "email" | "topic" | "message", string>>;
  values?: { name: string; email: string; topic: string; message: string };
};

const MIN_FILL_MS = 3000;
const MAX_PER_HOUR = 5;
const MAX_LINKS = 3;

const field = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();

export async function sendContactMessage(_prev: ContactState, formData: FormData): Promise<ContactState> {
  const values = {
    name: field(formData, "name").slice(0, 191),
    email: field(formData, "email").slice(0, 191),
    topic: field(formData, "topic"),
    message: field(formData, "message").slice(0, 5000),
  };

  // Bots fill the hidden field or submit instantly. Tell them it worked and store nothing.
  const startedAt = Number(formData.get("startedAt")) || 0;
  if (field(formData, "website") || !startedAt || Date.now() - startedAt < MIN_FILL_MS) return { ok: true };

  const fieldErrors: ContactState["fieldErrors"] = {};
  if (!values.name) fieldErrors.name = "Please tell us your name.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) fieldErrors.email = "That email doesn't look right.";
  if (!CONTACT_TOPICS.some((t) => t.value === values.topic)) fieldErrors.topic = "Pick what your message is about.";
  if (values.message.length < 10) fieldErrors.message = "Add a little more detail so we can help.";
  else if ((values.message.match(/https?:\/\/|www\./gi) ?? []).length > MAX_LINKS) {
    fieldErrors.message = `Please include no more than ${MAX_LINKS} links.`;
  }
  if (Object.keys(fieldErrors).length) return { error: "Please check the highlighted fields.", fieldErrors, values };

  const h = await headers();
  const ip = (h.get("cf-connecting-ip") ?? h.get("x-forwarded-for")?.split(",")[0] ?? "").trim().slice(0, 64) || null;
  if (ip) {
    const [{ n }] = await db
      .select({ n: count() })
      .from(contactMessages)
      .where(and(eq(contactMessages.ip, ip), gt(contactMessages.createdAt, new Date(Date.now() - 60 * 60 * 1000))));
    if (n >= MAX_PER_HOUR) return { error: "You've sent a few messages already. Please try again in an hour.", values };
  }

  await db.insert(contactMessages).values({
    ...values,
    ip,
    userAgent: h.get("user-agent")?.slice(0, 255) ?? null,
    createdAt: new Date(),
  });
  return { ok: true };
}
