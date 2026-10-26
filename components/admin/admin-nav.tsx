"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

type Item = { href: string; label: string; match: (path: string, type: string | null) => boolean };

const ITEMS: Item[] = [
  { href: "/admin/", label: "Dashboard", match: (p) => p === "/admin/" },
  { href: "/admin/posts/", label: "Posts", match: (p, t) => p.startsWith("/admin/posts") && t !== "page" },
  { href: "/admin/posts/?type=page", label: "Pages", match: (p, t) => p.startsWith("/admin/posts") && t === "page" },
  { href: "/admin/media/", label: "Media", match: (p) => p.startsWith("/admin/media") },
];

const ADMIN_ITEMS: Item[] = [
  { href: "/admin/categories/", label: "Categories", match: (p) => p.startsWith("/admin/categories") },
  { href: "/admin/tags/", label: "Tags", match: (p) => p.startsWith("/admin/tags") },
  { href: "/admin/users/", label: "Users", match: (p) => p.startsWith("/admin/users") },
];

export function AdminNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const type = useSearchParams().get("type");
  const items = isAdmin ? [...ITEMS, ...ADMIN_ITEMS] : ITEMS;

  return (
    <ul className="flex gap-1 overflow-x-auto text-sm lg:flex-col lg:overflow-visible">
      {items.map((item) => {
        const active = item.match(pathname, type);
        return (
          <li key={item.label} className="shrink-0">
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`block rounded-xl px-3 py-2 font-medium transition-colors ${
                active ? "bg-ink text-paper" : "text-muted hover:bg-sunken hover:text-ink"
              }`}
            >
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
