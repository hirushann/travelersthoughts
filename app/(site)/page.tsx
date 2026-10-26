import Link from "next/link";
import { CoverImage } from "@/components/cover-image";
import { JsonLd } from "@/components/json-ld";
import { CategoryLabel, PostCard, PostMeta, PostRow } from "@/components/post-card";
import { countPosts, getCategories, getPosts } from "@/lib/content";
import { organizationJsonLd, websiteJsonLd } from "@/lib/seo";
import { categoryPath, postPath } from "@/lib/site";

export default async function HomePage() {
  const [latest, categories] = await Promise.all([getPosts({ limit: 11 }), getCategories()]);
  const [lead, ...rest] = latest;
  const sideList = rest.slice(0, 4);
  const grid = rest.slice(4, 10);

  // Posts often sit in several categories, so skip anything already on the page.
  const shown = latest.map((p) => p.slug);
  const topics = await Promise.all(
    categories.map(async (category) => {
      const [posts, total] = await Promise.all([
        getPosts({ categorySlug: category.slug, limit: 12, excludeSlugs: shown }),
        countPosts(category.slug),
      ]);
      return { category, posts, total };
    }),
  );

  const usedCovers = new Set<string>();
  const tiles = topics.map(({ category, posts, total }) => {
    const cover = posts.find((p) => p.coverImage && !usedCovers.has(p.coverImage))?.coverImage ?? null;
    if (cover) usedCovers.add(cover);
    return { category, total, cover };
  });

  const railSlugs = new Set<string>();
  const rails = topics
    .map(({ category, posts }) => {
      const picked = posts.filter((p) => !railSlugs.has(p.slug)).slice(0, 4);
      picked.forEach((p) => railSlugs.add(p.slug));
      return { category, posts: picked };
    })
    .filter((r) => r.posts.length === 4)
    .slice(0, 3);

  return (
    <>
      <JsonLd data={[organizationJsonLd(), websiteJsonLd()]} />

      <section className="mx-auto max-w-7xl px-4 pt-12 sm:px-6 sm:pt-16 lg:px-8">
        <p className="text-xs font-semibold tracking-[0.18em] text-accent uppercase">Independent travel journal</p>
        <h1 className="mt-4 max-w-4xl font-display text-4xl leading-[1.05] font-semibold tracking-tight text-balance sm:text-6xl">
          A travel blog for curious, <em className="font-normal text-accent">budget-savvy</em> explorers.
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">
          Destination guides, day-by-day itineraries and honest tips from the road, so you can plan smarter and travel further.
        </p>
        <ul className="no-scrollbar -mx-4 mt-8 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          {categories.map((c) => (
            <li key={c.slug} className="shrink-0">
              <Link
                href={categoryPath(c.slug)}
                className="inline-block rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium transition-colors hover:border-ink"
              >
                {c.name}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {lead && (
        <section aria-labelledby="latest-heading" className="mx-auto mt-12 grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[1.65fr_1fr] lg:px-8">
          <h2 id="latest-heading" className="sr-only">Latest stories</h2>
          <article className="group relative">
            <div className="relative aspect-[16/10] overflow-hidden rounded-3xl bg-sunken">
              <CoverImage
                src={lead.coverImage}
                alt={lead.coverAlt ?? lead.title}
                sizes="(min-width: 1280px) 780px, (min-width: 1024px) 62vw, 100vw"
                priority
                className="transition-transform duration-700 ease-out group-hover:scale-[1.03]"
              />
              <span className="absolute top-4 left-4 rounded-full bg-paper/90 px-3 py-1 text-xs font-semibold backdrop-blur">
                Latest story
              </span>
            </div>
            <div className="mt-6 max-w-2xl">
              <CategoryLabel post={lead} />
              <h3 className="mt-2 font-display text-3xl leading-tight font-semibold tracking-tight text-balance sm:text-4xl">
                <Link href={postPath(lead.slug)} className="after:absolute after:inset-0 group-hover:text-accent">
                  {lead.title}
                </Link>
              </h3>
              {lead.excerpt && <p className="mt-3 line-clamp-3 leading-relaxed text-muted">{lead.excerpt}</p>}
              <PostMeta post={lead} className="mt-4" />
            </div>
          </article>

          <aside aria-label="More new stories" className="lg:border-l lg:border-line lg:pl-10">
            <h2 className="text-xs font-semibold tracking-[0.18em] text-muted uppercase">Just published</h2>
            <ol className="mt-6 space-y-7">
              {sideList.map((post, i) => (
                <li key={post.slug} className="border-b border-line pb-7 last:border-0 last:pb-0">
                  <PostRow post={post} index={i} />
                </li>
              ))}
            </ol>
          </aside>
        </section>
      )}

      {grid.length > 0 && (
        <section aria-labelledby="recent-heading" className="mx-auto mt-24 max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading id="recent-heading" title="Recent stories" />
          <div className="mt-8 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {grid.map((post) => (
              <PostCard key={post.slug} post={post} />
            ))}
          </div>
        </section>
      )}

      <section aria-labelledby="topics-heading" className="mt-24 bg-sunken/70 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading id="topics-heading" title="Explore by topic" />
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {tiles.map(({ category, cover, total }) => (
              <li key={category.slug}>
                <Link
                  href={categoryPath(category.slug)}
                  className="group relative flex aspect-[3/4] flex-col justify-end overflow-hidden rounded-2xl bg-ink p-5 text-white sm:aspect-[4/5]"
                >
                  <CoverImage
                    src={cover}
                    alt=""
                    sizes="(min-width: 1024px) 20vw, (min-width: 640px) 50vw, 100vw"
                    className="opacity-80 transition duration-700 group-hover:scale-105 group-hover:opacity-100"
                  />
                  <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                  <span className="relative font-display text-xl leading-tight font-semibold">{category.name}</span>
                  <span className="relative mt-1 text-sm text-white/75">{total} {total === 1 ? "story" : "stories"} →</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {rails.map(({ category, posts }) => (
        <section key={category.slug} aria-labelledby={`rail-${category.slug}`} className="mx-auto mt-24 max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            id={`rail-${category.slug}`}
            title={category.name}
            description={category.description}
            href={categoryPath(category.slug)}
          />
          <div className="mt-8 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
            {posts.map((post) => (
              <PostCard key={post.slug} post={post} />
            ))}
          </div>
        </section>
      ))}

      <section className="mx-auto mt-24 max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-8 rounded-3xl bg-ink px-8 py-12 text-paper sm:px-12 md:grid-cols-[1.5fr_1fr]">
          <div>
            <h2 className="font-display text-3xl leading-tight font-semibold tracking-tight text-balance sm:text-4xl">
              Written by travelers, <em className="font-normal">not travel brochures.</em>
            </h2>
            <p className="mt-4 max-w-xl leading-relaxed text-paper/70">
              We test the routes, count the costs and share what actually worked, from first-timer itineraries to solo trips on a shoestring.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 md:justify-end">
            <Link href="/about/" className="rounded-full bg-paper px-5 py-3 text-sm font-semibold text-ink hover:bg-accent-soft">
              Meet the team
            </Link>
            <Link href="/contact-travel-blog/" className="rounded-full border border-paper/30 px-5 py-3 text-sm font-semibold hover:border-paper">
              Get in touch
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

function SectionHeading({ id, title, description, href }: { id: string; title: string; description?: string | null; href?: string }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
      <div className="max-w-2xl">
        <h2 id={id} className="font-display text-3xl font-semibold tracking-tight">{title}</h2>
        {description && <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted">{description}</p>}
      </div>
      {href && (
        <Link href={href} className="shrink-0 text-sm font-semibold text-accent hover:text-accent-strong">
          View all →
        </Link>
      )}
    </div>
  );
}
