import Link from "next/link";
import { getPosts } from "@/lib/content";
import { PostCard } from "./post-card";

export async function NotFoundContent() {
  const posts = await getPosts({ limit: 3 });
  return (
    <div className="mx-auto max-w-7xl px-4 pt-20 sm:px-6 lg:px-8">
      <div className="max-w-2xl">
        <p className="text-xs font-semibold tracking-[0.18em] text-accent uppercase">404 · Off the map</p>
        <h1 className="mt-4 font-display text-5xl leading-tight font-semibold tracking-tight">This page took a different route.</h1>
        <p className="mt-5 text-lg text-muted">
          The link may be old or mistyped. Head back to the <Link href="/" className="text-accent underline underline-offset-4">homepage</Link>, or pick up one of our latest stories.
        </p>
      </div>
      <div className="mt-14 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((p) => (
          <PostCard key={p.slug} post={p} headingLevel="h2" />
        ))}
      </div>
    </div>
  );
}
