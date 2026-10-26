import type { Metadata } from "next";
import Link from "next/link";
import { MediaLibrary } from "@/components/admin/media-library";
import { buttonClass, inputClass, PageHeader } from "@/components/admin/ui";
import { listMedia } from "@/lib/admin/queries";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Media" };

export default async function MediaPage({ searchParams }: PageProps<"/admin/media">) {
  await requireUser();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() || undefined : undefined;
  const page = Number(sp.page) || 1;
  const { items, total, totalPages } = await listMedia({ page, q });
  const qs = (p: number) => `/admin/media/?${new URLSearchParams({ ...(q ? { q } : {}), page: String(p) })}`;

  return (
    <>
      <PageHeader title="Media" description={`${total} images`} />
      <form className="mb-6" action="/admin/media/">
        <input name="q" defaultValue={q} placeholder="Search by file name or alt text…" className={`${inputClass} max-w-sm`} />
      </form>
      <MediaLibrary items={items} />
      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-between text-sm">
          <span className="text-muted">Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            {page > 1 && <Link href={qs(page - 1)} className={buttonClass.secondary}>← Previous</Link>}
            {page < totalPages && <Link href={qs(page + 1)} className={buttonClass.secondary}>Next →</Link>}
          </div>
        </div>
      )}
    </>
  );
}
