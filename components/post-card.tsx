import Link from "next/link";
import type { PostSummary } from "@/lib/content";
import { categoryPath, formatDate, postPath } from "@/lib/site";
import { CoverImage } from "./cover-image";

export function PostMeta({ post, className = "" }: { post: PostSummary; className?: string }) {
  return (
    <p className={`flex flex-wrap items-center gap-x-2 text-xs text-muted ${className}`}>
      <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
      <span aria-hidden>·</span>
      <span>{post.readingMinutes} min read</span>
    </p>
  );
}

export function CategoryLabel({ post, className = "" }: { post: PostSummary; className?: string }) {
  if (!post.category) return null;
  return (
    <Link
      href={categoryPath(post.category.slug)}
      className={`relative z-10 text-[11px] font-semibold tracking-[0.14em] text-accent uppercase hover:text-accent-strong ${className}`}
    >
      {post.category.name}
    </Link>
  );
}

type CardProps = { post: PostSummary; headingLevel?: "h2" | "h3"; priority?: boolean };

/** Vertical card for grids. The whole card is clickable via a stretched title link. */
export function PostCard({ post, headingLevel: H = "h3", priority }: CardProps) {
  return (
    <article className="group relative flex flex-col">
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-sunken">
        <CoverImage
          src={post.coverImage}
          alt={post.coverAlt ?? post.title}
          sizes="(min-width: 1280px) 400px, (min-width: 640px) 50vw, 100vw"
          priority={priority}
          className="transition-transform duration-700 ease-out group-hover:scale-[1.04]"
        />
      </div>
      <div className="mt-4 flex flex-1 flex-col">
        <CategoryLabel post={post} />
        <H className="mt-2 font-display text-xl leading-snug font-semibold tracking-tight text-balance">
          <Link href={postPath(post.slug)} className="after:absolute after:inset-0 group-hover:text-accent">
            {post.title}
          </Link>
        </H>
        {post.excerpt && <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted">{post.excerpt}</p>}
        <PostMeta post={post} className="mt-auto pt-4" />
      </div>
    </article>
  );
}

/** Small horizontal row for sidebars and lists. */
export function PostRow({ post, index, headingLevel: H = "h3" }: CardProps & { index?: number }) {
  return (
    <article className="group relative flex items-start gap-4">
      {index !== undefined ? (
        <span className="w-8 shrink-0 font-display text-3xl leading-none font-semibold text-accent/70 tabular-nums">
          {String(index + 1).padStart(2, "0")}
        </span>
      ) : (
        <div className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-sunken">
          <CoverImage src={post.coverImage} alt={post.coverAlt ?? post.title} sizes="80px" />
        </div>
      )}
      <div className="min-w-0">
        <CategoryLabel post={post} />
        <H className="mt-1 font-display text-base leading-snug font-semibold text-balance">
          <Link href={postPath(post.slug)} className="after:absolute after:inset-0 group-hover:text-accent">
            {post.title}
          </Link>
        </H>
        <PostMeta post={post} className="mt-1.5" />
      </div>
    </article>
  );
}
