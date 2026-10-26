import Link from "next/link";
import { getCategories } from "@/lib/content";
import { categoryPath, site } from "@/lib/site";
import { Logo } from "./logo";

export async function SiteFooter() {
  "use cache";
  const categories = await getCategories();
  const social = [
    { href: site.social.instagram, label: "Instagram" },
    { href: site.social.facebook, label: "Facebook" },
    { href: site.social.tiktok, label: "TikTok" },
    { href: site.social.x, label: "X" },
  ];

  return (
    <footer className="mt-24 border-t border-line bg-sunken/60">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr] lg:px-8">
        <div className="max-w-sm">
          <Logo />
          <p className="mt-4 text-sm leading-relaxed text-muted">{site.description}</p>
          <ul className="mt-6 flex flex-wrap gap-2 text-sm">
            {social.map((s) => (
              <li key={s.label}>
                <a href={s.href} rel="me noopener" target="_blank" className="inline-block rounded-full border border-line px-3.5 py-1.5 hover:border-ink">
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <nav aria-label="Topics">
          <h2 className="text-xs font-semibold tracking-[0.14em] text-muted uppercase">Topics</h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            {categories.map((c) => (
              <li key={c.slug}>
                <Link href={categoryPath(c.slug)} className="hover:text-accent">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Site">
          <h2 className="text-xs font-semibold tracking-[0.14em] text-muted uppercase">Traveler&rsquo;s Thoughts</h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li><Link href="/about/" className="hover:text-accent">About us</Link></li>
            <li><Link href="/contact-travel-blog/" className="hover:text-accent">Contact</Link></li>
            <li><Link href="/privacy-policy/" className="hover:text-accent">Privacy policy</Link></li>
            <li><a href="/rss.xml" className="hover:text-accent">RSS feed</a></li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-line">
        <p className="mx-auto max-w-7xl px-4 py-6 text-xs text-muted sm:px-6 lg:px-8">
          &copy; {new Date().getFullYear()} {site.name}. Written by travelers, for travelers.
        </p>
      </div>
    </footer>
  );
}
