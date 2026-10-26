import type { Metadata } from "next";
import { CategoryListing } from "@/components/category-listing";
import { getCategories, getCategory } from "@/lib/content";
import { categoryMetadata } from "@/lib/seo";

// Navigation waits for the lookup rather than showing a skeleton. Known URLs are
// prerendered from generateStaticParams, so in practice this is instant.
export const instant = false;

export async function generateStaticParams() {
  return (await getCategories()).map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: PageProps<"/category/[slug]">): Promise<Metadata> {
  const category = await getCategory((await params).slug);
  return category ? categoryMetadata(category, 1) : {};
}

export default async function CategoryPage({ params }: PageProps<"/category/[slug]">) {
  return <CategoryListing slug={(await params).slug} page={1} />;
}
