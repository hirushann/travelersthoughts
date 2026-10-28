import Image from "next/image";
import Link from "next/link";
import { getRelatedPosts, type Post } from "@/lib/content";
import { opensWith, prepareArticleHtml, type TocItem } from "@/lib/content/html";
import { articleJsonLd } from "@/lib/seo";
import { categoryPath, formatDate, postPath, site } from "@/lib/site";
import { Breadcrumbs } from "./breadcrumbs";
import { ContactForm } from "./contact-form";
import { CoverImage } from "./cover-image";
import { JsonLd } from "./json-ld";
import { PostCard } from "./post-card";

const DAY = 24 * 60 * 60 * 1000;

export async function Article({ post }: { post: Post }) {
  const { html, toc } = prepareArticleHtml(post.content);
  const related = await getRelatedPosts(post.slug, post.category?.slug);
  const wasUpdated = new Date(post.updatedAt).getTime() - new Date(post.publishedAt).getTime() > DAY;
  const tocItems = toc.filter((t) => t.level === 2);
  const showDek = post.excerpt && !opensWith(html, post.excerpt);

  return (
    <article>
      <JsonLd data={articleJsonLd(post)} />

      <header className="mx-auto max-w-4xl px-4 pt-10 text-center sm:px-6 sm:pt-14">
        <Breadcrumbs
          className="flex justify-center"
          items={[
            { name: "Home", path: "/" },
            ...(post.category ? [{ name: post.category.name, path: categoryPath(post.category.slug) }] : []),
            { name: post.title, path: postPath(post.slug) },
          ]}
        />
        {post.category && (
          <Link
            href={categoryPath(post.category.slug)}
            className="mt-8 inline-block rounded-full bg-accent-soft px-3 py-1 text-[11px] font-semibold tracking-[0.14em] text-accent uppercase"
          >
            {post.category.name}
          </Link>
        )}
        <h1 className="mt-5 font-display text-4xl leading-[1.08] font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
          {post.title}
        </h1>
        {showDek && (
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-pretty text-muted">{post.excerpt}</p>
        )}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm text-muted">
          {post.author && (
            <span className="flex items-center gap-2.5 text-ink">
              {post.author.avatarUrl && (
                <Image src={post.author.avatarUrl} alt="" width={32} height={32} className="rounded-full" />
              )}
              <span>
                By <span className="font-semibold">{post.author.name}</span>
              </span>
            </span>
          )}
          <span aria-hidden>·</span>
          <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
          {wasUpdated && (
            <>
              <span aria-hidden>·</span>
              <span>
                Updated <time dateTime={post.updatedAt}>{formatDate(post.updatedAt)}</time>
              </span>
            </>
          )}
          <span aria-hidden>·</span>
          <span>{post.readingMinutes} min read</span>
        </div>
      </header>

      {post.coverImage && (
        <div className="mx-auto mt-12 max-w-6xl px-4 sm:px-6">
          <div className="relative aspect-[16/9] overflow-hidden rounded-3xl bg-sunken">
            <CoverImage src={post.coverImage} alt={post.coverAlt ?? post.title} sizes="(min-width: 1152px) 1104px, 100vw" priority />
          </div>
        </div>
      )}

      <div className="mx-auto mt-14 grid max-w-6xl gap-12 px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_16rem] lg:gap-16">
        <div className="min-w-0">
          {tocItems.length > 2 && (
            <details className="mb-10 rounded-2xl border border-line bg-surface p-5 lg:hidden">
              <summary className="cursor-pointer text-sm font-semibold">In this guide</summary>
              <TableOfContents items={tocItems} className="mt-4" />
            </details>
          )}

          <div
            className="article-body prose prose-lg mx-auto max-w-[44rem] prose-headings:scroll-mt-24"
            dangerouslySetInnerHTML={{ __html: html }}
          />

          <footer className="mx-auto mt-14 max-w-[44rem] space-y-10">
            {post.tags.length > 0 && (
              <ul className="flex flex-wrap gap-2" aria-label="Tags">
                {post.tags.map((t) => (
                  <li key={t.slug} className="rounded-full bg-sunken px-3 py-1 text-xs text-muted">#{t.name}</li>
                ))}
              </ul>
            )}
            {post.author && (
              <section aria-label="About the author" className="flex gap-5 rounded-2xl border border-line bg-surface p-6">
                {post.author.avatarUrl && (
                  <Image src={post.author.avatarUrl} alt="" width={56} height={56} className="size-14 shrink-0 rounded-full" />
                )}
                <div>
                  <p className="text-xs font-semibold tracking-[0.14em] text-muted uppercase">Written by</p>
                  <p className="mt-1 font-display text-lg font-semibold">{post.author.name}</p>
                  <p className="mt-2 text-sm leading-relaxed text-muted">
                    {post.author.bio ?? "Part of the Traveler's Thoughts team, sharing routes, costs and lessons learned from the road."}{" "}
                    <Link href="/about/" className="font-medium text-accent hover:text-accent-strong">More about us →</Link>
                  </p>
                </div>
              </section>
            )}
          </footer>
        </div>

        {tocItems.length > 2 && (
          <aside className="hidden lg:block">
            <div className="sticky top-24">
              <p className="text-xs font-semibold tracking-[0.14em] text-muted uppercase">In this guide</p>
              <TableOfContents items={tocItems} className="mt-4 max-h-[calc(100vh-10rem)] overflow-y-auto pr-2" />
            </div>
          </aside>
        )}
      </div>

      {related.length > 0 && (
        <section aria-labelledby="related-heading" className="mx-auto mt-24 max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 id="related-heading" className="border-b border-line pb-5 font-display text-3xl font-semibold tracking-tight">
            Keep exploring
          </h2>
          <div className="mt-8 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((p) => (
              <PostCard key={p.slug} post={p} />
            ))}
          </div>
        </section>
      )}
    </article>
  );
}

function TableOfContents({ items, className = "" }: { items: TocItem[]; className?: string }) {
  return (
    <ol className={`space-y-1 border-l border-line text-sm ${className}`}>
      {items.map((item) => (
        <li key={item.id}>
          <a href={`#${item.id}`} className="-ml-px block border-l border-transparent py-1.5 pl-4 leading-snug text-muted hover:border-accent hover:text-ink">
            {item.text}
          </a>
        </li>
      ))}
    </ol>
  );
}

export function StandalonePage({ page }: { page: Post }) {
  const { html } = prepareArticleHtml(page.content);
  return (
    <article className="mx-auto max-w-3xl px-4 pt-10 sm:px-6 sm:pt-14">
      <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: page.title, path: postPath(page.slug) }]} />
      <h1 className="mt-8 font-display text-4xl leading-tight font-semibold tracking-tight text-balance sm:text-5xl">{page.title}</h1>
      <div className="article-body prose prose-lg mt-10 max-w-none" dangerouslySetInnerHTML={{ __html: html }} />
      {page.slug === site.contactPageSlug && <ContactForm />}
    </article>
  );
}
