import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import { CategoryListing } from "@/components/category-listing";
import { countPosts, getCategories, getCategory, POSTS_PER_PAGE } from "@/lib/content";
import { categoryMetadata } from "@/lib/seo";
import { categoryPath } from "@/lib/site";

// Navigation waits for the lookup rather than showing a skeleton. Known URLs are
// prerendered from generateStaticParams, so in practice this is instant.
export const instant = false;

export async function generateStaticParams() {
  const categories = await getCategories();
  const params = await Promise.all(
    categories.map(async (c) => {
      const pages = Math.ceil((await countPosts(c.slug)) / POSTS_PER_PAGE);
      return Array.from({ length: Math.max(0, pages - 1) }, (_, i) => ({ slug: c.slug, page: String(i + 2) }));
    }),
  );
  return params.flat();
}

export async function generateMetadata({ params }: PageProps<"/category/[slug]/page/[page]">): Promise<Metadata> {
  const { slug, page } = await params;
  const category = await getCategory(slug);
  return category ? categoryMetadata(category, Number(page)) : {};
}

export default async function CategoryPagedPage({ params }: PageProps<"/category/[slug]/page/[page]">) {
  const { slug, page } = await params;
  if (page === "1") permanentRedirect(categoryPath(slug));
  return <CategoryListing slug={slug} page={Number(page)} />;
}
