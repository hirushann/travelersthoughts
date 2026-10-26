import Link from "next/link";

type Props = { page: number; totalPages: number; hrefFor: (page: number) => string };

export function Pagination({ page, totalPages, hrefFor }: Props) {
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1,
  );

  const base = "inline-flex h-10 min-w-10 items-center justify-center rounded-full px-3 text-sm";
  return (
    <nav aria-label="Pagination" className="mt-16 flex items-center justify-center gap-1.5">
      {page > 1 && (
        <Link href={hrefFor(page - 1)} rel="prev" className={`${base} border border-line hover:border-ink`}>
          ← Newer
        </Link>
      )}
      {pages.map((p, i) => (
        <span key={p} className="flex items-center gap-1.5">
          {i > 0 && p - pages[i - 1] > 1 && <span className="px-1 text-muted">…</span>}
          {p === page ? (
            <span aria-current="page" className={`${base} bg-ink text-paper`}>{p}</span>
          ) : (
            <Link href={hrefFor(p)} className={`${base} hover:bg-sunken`}>{p}</Link>
          )}
        </span>
      ))}
      {page < totalPages && (
        <Link href={hrefFor(page + 1)} rel="next" className={`${base} border border-line hover:border-ink`}>
          Older →
        </Link>
      )}
    </nav>
  );
}
