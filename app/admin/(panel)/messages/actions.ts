"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { contactMessages } from "@/lib/db/schema";

export async function setMessageStatus(formData: FormData) {
  await requireAdmin();
  const status = formData.get("status") === "read" ? "read" : "new";
  await db.update(contactMessages).set({ status }).where(eq(contactMessages.id, Number(formData.get("id"))));
  revalidatePath("/admin/messages/");
}

export async function deleteMessage(formData: FormData) {
  await requireAdmin();
  await db.delete(contactMessages).where(eq(contactMessages.id, Number(formData.get("id"))));
  revalidatePath("/admin/messages/");
}
