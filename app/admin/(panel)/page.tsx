import type { Metadata } from "next";
import Link from "@/components/admin/link";
import { adminDate, Notice, PageHeader } from "@/components/admin/ui";
import { dashboardStats } from "@/lib/admin/queries";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Dashboard" };

export default async function Dashboard({ searchParams }: PageProps<"/admin">) {
  const user = await requireUser();
  const { denied } = await searchParams;
  const stats = await dashboardStats(user.authorId);
  const firstName = user.name.split(" ")[0];

  const cards = [
    { label: "Published posts", value: stats.published, href: "/admin/posts/?status=published" },
    { label: "Drafts", value: stats.drafts, href: "/admin/posts/?status=draft" },
    { label: "Written by you", value: stats.mine, href: "/admin/posts/?mine=1" },
    { label: "Images", value: stats.mediaCount, href: "/admin/media/" },
  ];

  return (
    <>
      {denied && <Notice tone="error">That section is for admins only.</Notice>}
      <PageHeader title={`Hello, ${firstName}`} description="Here's what's happening on Traveler's Thoughts." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <Link key={c.label} href={c.href} className="rounded-2xl border border-line bg-surface p-5 transition hover:border-ink">
            <p className="text-sm text-muted">{c.label}</p>
            <p className="mt-2 font-display text-4xl font-semibold tabular-nums">{c.value}</p>
          </Link>
        ))}
      </div>

      <div className="mt-10 grid gap-8 xl:grid-cols-2">
        <section className="rounded-2xl border border-line bg-surface p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Drafts in progress</h2>
            <Link href="/admin/posts/?status=draft" className="text-sm text-accent">All drafts →</Link>
          </div>
          {stats.recentDrafts.length ? (
            <ul className="mt-4 divide-y divide-line">
              {stats.recentDrafts.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-4 py-3">
                  <Link href={`/admin/posts/${p.id}/`} className="min-w-0 truncate font-medium hover:text-accent">
                    {p.title || "Untitled"}
                  </Link>
                  <span className="shrink-0 text-xs text-muted">
                    {p.authorName} · {adminDate(p.updatedAt)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-muted">
              No drafts. <Link href="/admin/posts/new/" className="text-accent">Start a new post</Link>.
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-line bg-surface p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Recently published</h2>
            <Link href="/admin/posts/?status=published" className="text-sm text-accent">All posts →</Link>
          </div>
          <ul className="mt-4 divide-y divide-line">
            {stats.recent.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-4 py-3">
                <Link href={`/admin/posts/${p.id}/`} className="min-w-0 truncate font-medium hover:text-accent">
                  {p.title}
                </Link>
                <a href={`/${p.slug}/`} target="_blank" className="shrink-0 text-xs text-muted hover:text-ink">
                  {adminDate(p.publishedAt)} ↗
                </a>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
