"use server";

import { redirect } from "next/navigation";
import { attemptLogin } from "@/lib/auth/login";

export type LoginState = { error?: string; email?: string };

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "");
  const result = await attemptLogin(email, String(formData.get("password") ?? ""));
  if (!result.ok) return { error: result.error, email };
  redirect("/admin/");
}
