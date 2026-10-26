import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { Article, StandalonePage } from "@/components/article";
import { getPost, getRedirect, getRoutes } from "@/lib/content";
import { postMetadata } from "@/lib/seo";

// Navigation waits for the lookup rather than showing a skeleton. Known URLs are
// prerendered from generateStaticParams, so in practice this is instant.
export const instant = false;

export async function generateStaticParams() {
  const routes = await getRoutes();
  return routes.map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: PageProps<"/[slug]">): Promise<Metadata> {
  const post = await getPost((await params).slug);
  return post ? postMetadata(post) : {};
}

export default async function PostPage({ params }: PageProps<"/[slug]">) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) {
    // Posts whose URL changed keep their old address working (and their rankings).
    const target = await getRedirect(`/${slug}/`);
    if (target) permanentRedirect(target);
    notFound();
  }
  return post.type === "page" ? <StandalonePage page={post} /> : <Article post={post} />;
}
