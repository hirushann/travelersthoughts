import type { Metadata } from "next";
import Image from "next/image";
import Link from "@/components/admin/link";
import { adminDate, buttonClass, inputClass, Notice, PageHeader, StatusBadge } from "@/components/admin/ui";
import { listPosts } from "@/lib/admin/queries";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Posts" };

export default async function PostsPage({ searchParams }: PageProps<"/admin/posts">) {
  const user = await requireUser();
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const type = one(sp.type) === "page" ? "page" : "post";
  const status = one(sp.status) === "draft" || one(sp.status) === "published" ? (one(sp.status) as "draft" | "published") : undefined;
  const q = one(sp.q)?.trim() || undefined;
  const mine = one(sp.mine) === "1";
  const page = Number(one(sp.page)) || 1;

  const { rows, total, totalPages } = await listPosts({
    type,
    status,
    q,
    page,
    authorId: mine && user.authorId ? user.authorId : undefined,
  });

  const noun = type === "page" ? "pages" : "posts";
  const href = (overrides: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const merged = { type: type === "page" ? "page" : undefined, status, q, mine: mine ? "1" : undefined, ...overrides };
    for (const [k, v] of Object.entries(merged)) if (v) params.set(k, v);
    const qs = params.toString();
    return `/admin/posts/${qs ? `?${qs}` : ""}`;
  };
  const tabs = [
    { label: "All", value: undefined },
    { label: "Published", value: "published" },
    { label: "Drafts", value: "draft" },
  ];

  return (
    <>
      {one(sp.deleted) && <Notice tone="success">Deleted.</Notice>}
      <PageHeader
        title={type === "page" ? "Pages" : "Posts"}
        description={`${total} ${noun}${q ? ` matching “${q}”` : ""}`}
        actions={
          <Link href={type === "page" ? "/admin/posts/new/?type=page" : "/admin/posts/new/"} className={buttonClass.accent}>
            New {type === "page" ? "page" : "post"}
          </Link>
        }
      />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-full border border-line bg-surface p-1 text-sm">
          {tabs.map((t) => (
            <Link
              key={t.label}
              href={href({ status: t.value, page: undefined })}
              className={`rounded-full px-3.5 py-1.5 ${status === t.value ? "bg-ink text-paper" : "text-muted hover:text-ink"}`}
            >
              {t.label}
            </Link>
          ))}
          {user.authorId && (
            <Link
              href={href({ mine: mine ? undefined : "1", page: undefined })}
              className={`rounded-full px-3.5 py-1.5 ${mine ? "bg-ink text-paper" : "text-muted hover:text-ink"}`}
            >
              Mine
            </Link>
          )}
        </div>
        <form className="flex gap-2" action="/admin/posts/">
          {type === "page" && <input type="hidden" name="type" value="page" />}
          {status && <input type="hidden" name="status" value={status} />}
          <input name="q" defaultValue={q} placeholder={`Search ${noun}…`} className={`${inputClass} w-64`} />
        </form>
      </div>

      <div className="overflow-hidden rounded-2xl border border-line bg-surface">
        {rows.length === 0 ? (
          <p className="p-10 text-center text-sm text-muted">No {noun} here yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-line text-left text-xs text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="hidden px-4 py-3 font-medium md:table-cell">Author</th>
                {type === "post" && <th className="hidden px-4 py-3 font-medium lg:table-cell">Category</th>}
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((p) => (
                <tr key={p.id} className="hover:bg-sunken/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="relative hidden size-11 shrink-0 overflow-hidden rounded-lg bg-sunken sm:block">
                        {p.coverImage && <Image src={p.coverImage} alt="" fill sizes="44px" className="object-cover" />}
                      </div>
                      <div className="min-w-0">
                        <Link href={`/admin/posts/${p.id}/`} className="line-clamp-1 font-medium hover:text-accent">
                          {p.title || "Untitled"}
                        </Link>
                        <p className="line-clamp-1 text-xs text-muted">/{p.slug}/</p>
                      </div>
                    </div>
                  </td>
                  <td className="hidden px-4 py-3 text-muted md:table-cell">{p.authorName ?? "—"}</td>
                  {type === "post" && <td className="hidden px-4 py-3 text-muted lg:table-cell">{p.categoryName ?? "—"}</td>}
                  <td className="px-4 py-3">
                    <StatusBadge status={p.status} />
                  </td>
                  <td className="hidden px-4 py-3 whitespace-nowrap text-muted sm:table-cell">{adminDate(p.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between text-sm">
          <span className="text-muted">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            {page > 1 && <Link href={href({ page: String(page - 1) })} className={buttonClass.secondary}>← Previous</Link>}
            {page < totalPages && <Link href={href({ page: String(page + 1) })} className={buttonClass.secondary}>Next →</Link>}
          </div>
        </div>
      )}
    </>
  );
}
