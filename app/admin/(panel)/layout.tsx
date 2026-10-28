import Link from "@/components/admin/link";
import { Suspense } from "react";
import { AdminNav } from "@/components/admin/admin-nav";
import { Logo } from "@/components/logo";
import { requireUser } from "@/lib/auth";
import { signOut } from "./sign-out";

export default async function PanelLayout({ children }: LayoutProps<"/admin">) {
  const user = await requireUser();
  return (
    // The sidebar hugs the left edge at any screen width; only the content column is width-capped.
    <div className="flex w-full flex-1 flex-col lg:flex-row">
      <aside className="border-b border-line bg-surface lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:shrink-0 lg:overflow-y-auto lg:border-r lg:border-b-0">
        <div className="flex h-full flex-col gap-4 p-4 lg:p-5">
          <div className="flex items-center justify-between">
            <Logo className="[&_span]:text-lg" prefetch={false} />
            <Link href="/admin/posts/new/" className="rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-white lg:hidden">
              New post
            </Link>
          </div>
          <Link
            href="/admin/posts/new/"
            className="hidden rounded-full bg-accent px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-accent-strong lg:block"
          >
            + New post
          </Link>
          <nav aria-label="Admin">
            <Suspense>
              <AdminNav isAdmin={user.role === "admin"} />
            </Suspense>
          </nav>
          <div className="mt-auto hidden space-y-1 border-t border-line pt-4 text-sm lg:block">
            <Link href="/admin/profile/" className="block rounded-xl px-3 py-2 hover:bg-sunken">
              <span className="block font-medium">{user.name}</span>
              <span className="block text-xs text-muted capitalize">{user.role} · Profile</span>
            </Link>
            <a href="/" target="_blank" className="block rounded-xl px-3 py-2 text-muted hover:bg-sunken hover:text-ink">
              View site ↗
            </a>
            <form action={signOut}>
              <button className="w-full rounded-xl px-3 py-2 text-left text-muted hover:bg-sunken hover:text-ink">Sign out</button>
            </form>
          </div>
        </div>
      </aside>
      <main className="min-w-0 flex-1">
        <div className="w-full max-w-[1600px] px-4 py-8 sm:px-8 lg:px-10 lg:py-10">{children}</div>
      </main>
      <div className="flex items-center justify-between border-t border-line bg-surface px-4 py-3 text-sm lg:hidden">
        <Link href="/admin/profile/">{user.name}</Link>
        <form action={signOut}>
          <button className="text-muted">Sign out</button>
        </form>
      </div>
    </div>
  );
}
