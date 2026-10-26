import Link from "next/link";
import { site } from "@/lib/site";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`group inline-flex items-center gap-2.5 ${className}`} aria-label={`${site.name} home`}>
      <svg viewBox="0 0 32 32" className="size-8 shrink-0 text-accent transition-transform duration-500 group-hover:rotate-45" aria-hidden>
        <circle cx="16" cy="16" r="14.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M16 5.5 19 16l-3 10.5L13 16Z" fill="currentColor" />
        <path d="M16 5.5 19 16h-6Z" className="fill-ink" />
        <circle cx="16" cy="16" r="1.6" className="fill-paper" />
      </svg>
      <span className="font-display text-xl leading-none font-semibold tracking-tight">
        Traveler&rsquo;s <span className="italic font-normal">Thoughts</span>
      </span>
    </Link>
  );
}
