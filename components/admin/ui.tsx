import type { ReactNode } from "react";

export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1.5 text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Notice({ tone = "info", children }: { tone?: "info" | "success" | "error"; children: ReactNode }) {
  const styles = {
    info: "border-line bg-surface",
    success: "border-sea/30 bg-sea/10",
    error: "border-accent/30 bg-accent-soft",
  }[tone];
  return (
    <p role={tone === "error" ? "alert" : "status"} className={`mb-6 rounded-xl border px-4 py-3 text-sm ${styles}`}>
      {children}
    </p>
  );
}

export function StatusBadge({ status }: { status: "draft" | "published" }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
        status === "published" ? "bg-sea/12 text-sea" : "bg-sunken text-muted"
      }`}
    >
      <span className={`size-1.5 rounded-full ${status === "published" ? "bg-sea" : "bg-muted"}`} />
      {status === "published" ? "Published" : "Draft"}
    </span>
  );
}

export const inputClass =
  "block w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm outline-none transition focus:border-ink aria-[invalid=true]:border-accent";

export const buttonClass = {
  primary: "rounded-full bg-ink px-4 py-2 text-sm font-semibold text-paper hover:bg-accent disabled:opacity-50",
  accent: "rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-strong disabled:opacity-50",
  secondary: "rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium hover:border-ink disabled:opacity-50",
  danger: "rounded-full px-4 py-2 text-sm font-medium text-accent hover:bg-accent-soft disabled:opacity-50",
};

export function adminDate(value: Date | string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}
