import Link from "next/link";
import { getCategories } from "@/lib/content";
import { categoryPath } from "@/lib/site";
import { Logo } from "./logo";

// Short labels keep the bar on one line; full names live on the category pages.
const NAV_LABELS: Record<string, string> = {
  "travel-destinations": "Destinations",
  "adventure-travel-experiences": "Adventure",
  "travel-tips-and-hacks": "Tips & Hacks",
  "budget-and-luxury-travel": "Budget & Luxury",
  "solo-and-sustainable-travel": "Solo & Sustainable",
};

export async function SiteHeader() {
  const categories = await getCategories();
  const links = [
    ...categories.map((c) => ({ href: categoryPath(c.slug), label: NAV_LABELS[c.slug] ?? c.name })),
    { href: "/about/", label: "About" },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-paper/85 backdrop-blur-md supports-[backdrop-filter]:bg-paper/75">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
        <Logo />

        <nav aria-label="Main" className="hidden lg:block">
          <ul className="flex items-center gap-1 text-sm font-medium">
            {links.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="rounded-full px-3 py-2 text-muted transition-colors hover:bg-sunken hover:text-ink">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <details className="group relative lg:hidden">
          <summary className="flex cursor-pointer list-none items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-medium [&::-webkit-details-marker]:hidden">
            <span className="group-open:hidden">Menu</span>
            <span className="hidden group-open:inline">Close</span>
            <svg viewBox="0 0 20 20" className="size-4" aria-hidden>
              <path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className="group-open:hidden" />
              <path d="m5 5 10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className="hidden group-open:block" />
            </svg>
          </summary>
          <nav aria-label="Main" className="absolute right-0 mt-3 w-64 overflow-hidden rounded-2xl border border-line bg-surface p-2 shadow-xl shadow-black/5">
            <ul className="text-sm">
              {links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="block rounded-xl px-4 py-3 hover:bg-sunken">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </details>
      </div>
    </header>
  );
}
