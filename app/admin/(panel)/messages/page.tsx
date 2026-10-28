import type { Metadata } from "next";
import { ConfirmSubmit } from "@/components/admin/confirm-submit";
import Link from "@/components/admin/link";
import { adminDate, buttonClass, Notice, PageHeader } from "@/components/admin/ui";
import { listMessages } from "@/lib/admin/queries";
import { requireAdmin } from "@/lib/auth";
import { topicLabel } from "@/lib/contact";
import { deleteMessage, setMessageStatus } from "./actions";

export const metadata: Metadata = { title: "Messages" };

export default async function MessagesPage({ searchParams }: PageProps<"/admin/messages">) {
  await requireAdmin();
  const sp = await searchParams;
  const status = sp.status === "new" || sp.status === "read" ? sp.status : undefined;
  const page = Number(sp.page) || 1;
  const result = await listMessages({ status, page }).catch((err) => {
    console.error("Could not load contact messages (has `db:migrate` been run?)", err);
    return null;
  });
  if (!result) {
    return (
      <>
        <PageHeader title="Messages" />
        <Notice tone="error">
          The messages table doesn&rsquo;t exist in this database yet. Run <code>npm run db:migrate</code> against it, then reload.
        </Notice>
      </>
    );
  }
  const { rows, total, totalPages } = result;

  const href = (overrides: { status?: string; page?: number }) => {
    const params = new URLSearchParams();
    const s = "status" in overrides ? overrides.status : status;
    if (s) params.set("status", s);
    if (overrides.page && overrides.page > 1) params.set("page", String(overrides.page));
    const qs = params.toString();
    return `/admin/messages/${qs ? `?${qs}` : ""}`;
  };
  const tabs = [
    { label: "All", value: undefined },
    { label: "New", value: "new" },
    { label: "Read", value: "read" },
  ];

  return (
    <>
      <PageHeader title="Messages" description={`${total} message${total === 1 ? "" : "s"} from the contact form`} />

      <div className="mb-6 flex w-fit gap-1 rounded-full border border-line bg-surface p-1 text-sm">
        {tabs.map((t) => (
          <Link
            key={t.label}
            href={href({ status: t.value })}
            className={`rounded-full px-3.5 py-1.5 ${status === t.value ? "bg-ink text-paper" : "text-muted hover:text-ink"}`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="rounded-2xl border border-line bg-surface p-10 text-center text-sm text-muted">
          No messages here yet. They&rsquo;ll appear when readers use the form on your contact page.
        </p>
      ) : (
        <ul className="space-y-3">
          {rows.map((m) => (
            <li key={m.id}>
              <details open={m.status === "new"} className="group rounded-2xl border border-line bg-surface">
                <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-4 gap-y-1 p-5 [&::-webkit-details-marker]:hidden">
                  {m.status === "new" && <span className="size-2 rounded-full bg-accent" aria-label="New" />}
                  <span className={m.status === "new" ? "font-semibold" : "font-medium"}>{m.name}</span>
                  <span className="text-sm text-muted">{topicLabel(m.topic)}</span>
                  <span className="ml-auto text-xs text-muted">{adminDate(m.createdAt)}</span>
                </summary>
                <div className="border-t border-line px-5 pt-4 pb-5">
                  <p className="text-sm text-muted">
                    <a href={`mailto:${m.email}`} className="text-accent hover:text-accent-strong">{m.email}</a>
                  </p>
                  <p className="mt-3 text-[15px] leading-relaxed whitespace-pre-wrap">{m.message}</p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <a
                      href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: ${topicLabel(m.topic)} – Traveler's Thoughts`)}`}
                      className={buttonClass.accent}
                    >
                      Reply by email
                    </a>
                    <form action={setMessageStatus}>
                      <input type="hidden" name="id" value={m.id} />
                      <input type="hidden" name="status" value={m.status === "new" ? "read" : "new"} />
                      <button className={buttonClass.secondary}>{m.status === "new" ? "Mark as read" : "Mark as unread"}</button>
                    </form>
                    <form action={deleteMessage}>
                      <input type="hidden" name="id" value={m.id} />
                      <ConfirmSubmit message={`Delete the message from ${m.name}? This can't be undone.`} className={buttonClass.danger}>
                        Delete
                      </ConfirmSubmit>
                    </form>
                  </div>
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between text-sm">
          <span className="text-muted">Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            {page > 1 && <Link href={href({ page: page - 1 })} className={buttonClass.secondary}>← Newer</Link>}
            {page < totalPages && <Link href={href({ page: page + 1 })} className={buttonClass.secondary}>Older →</Link>}
          </div>
        </div>
      )}
    </>
  );
}
