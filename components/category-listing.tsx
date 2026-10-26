import { notFound, permanentRedirect } from "next/navigation";
import { Breadcrumbs } from "./breadcrumbs";
import { JsonLd } from "./json-ld";
import { Pagination } from "./pagination";
import { PostCard } from "./post-card";
import { countPosts, getCategory, getPosts, getRedirect, POSTS_PER_PAGE } from "@/lib/content";
import { itemListJsonLd } from "@/lib/seo";
import { categoryPath } from "@/lib/site";

export async function CategoryListing({ slug, page }: { slug: string; page: number }) {
  const category = await getCategory(slug);
  if (!category) {
    const target = await getRedirect(categoryPath(slug));
    if (target) permanentRedirect(page > 1 ? target.replace(/\/$/, `/page/${page}/`) : target);
    notFound();
  }

  const total = await countPosts(slug);
  const totalPages = Math.max(1, Math.ceil(total / POSTS_PER_PAGE));
  if (!Number.isInteger(page) || page < 1 || page > totalPages) notFound();

  const posts = await getPosts({ categorySlug: slug, limit: POSTS_PER_PAGE, offset: (page - 1) * POSTS_PER_PAGE });

  return (
    <div className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 sm:pt-14 lg:px-8">
      <JsonLd data={itemListJsonLd(posts)} />
      <Breadcrumbs
        items={[
          { name: "Home", path: "/" },
          { name: category.name, path: categoryPath(slug) },
          ...(page > 1 ? [{ name: `Page ${page}`, path: categoryPath(slug, page) }] : []),
        ]}
      />
      <header className="mt-8 max-w-3xl border-b border-line pb-10">
        <p className="text-xs font-semibold tracking-[0.18em] text-accent uppercase">
          {total} {total === 1 ? "story" : "stories"}
          {page > 1 && ` · Page ${page} of ${totalPages}`}
        </p>
        <h1 className="mt-3 font-display text-4xl leading-tight font-semibold tracking-tight text-balance sm:text-6xl">
          {category.name}
        </h1>
        {category.description && <p className="mt-5 text-lg leading-relaxed text-muted">{category.description}</p>}
      </header>

      <div className="mt-12 grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((post, i) => (
          <PostCard key={post.slug} post={post} headingLevel="h2" priority={i < 3} />
        ))}
      </div>

      <Pagination page={page} totalPages={totalPages} hrefFor={(p) => categoryPath(slug, p)} />
    </div>
  );
}
