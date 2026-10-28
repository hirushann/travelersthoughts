import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/admin/");
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm rounded-3xl border border-line bg-surface p-8 shadow-xl shadow-black/5">
        <Logo prefetch={false} />
        <h1 className="mt-8 font-display text-3xl font-semibold tracking-tight">Sign in to write</h1>
        <p className="mt-2 text-sm text-muted">For the Traveler&rsquo;s Thoughts team.</p>
        <LoginForm />
      </div>
    </main>
  );
}
