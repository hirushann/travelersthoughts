import type { Metadata } from "next";
import type { Category, Post, PostSummary } from "./content";
import { absoluteUrl, categoryPath, postPath, site } from "./site";

export type Crumb = { name: string; path: string };

const ORG_ID = `${site.url}/#organization`;
const WEBSITE_ID = `${site.url}/#website`;

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": ORG_ID,
    name: site.name,
    url: absoluteUrl("/"),
    logo: { "@type": "ImageObject", url: `${site.url}/logo.png`, width: 512, height: 512 },
    sameAs: Object.values(site.social),
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    name: site.name,
    url: absoluteUrl("/"),
    description: site.description,
    inLanguage: "en",
    publisher: { "@id": ORG_ID },
  };
}

export function breadcrumbJsonLd(items: Crumb[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function articleJsonLd(post: Post) {
  const url = absoluteUrl(postPath(post.slug));
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": `${url}#article`,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    headline: post.title,
    description: post.seoDescription ?? post.excerpt ?? undefined,
    image: post.coverImage ? [post.coverImage] : undefined,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    author: post.author
      ? { "@type": "Person", name: post.author.name, url: absoluteUrl("/about/") }
      : { "@id": ORG_ID },
    publisher: { "@id": ORG_ID },
    isPartOf: { "@id": WEBSITE_ID },
    articleSection: post.category?.name,
    keywords: post.tags.map((t) => t.name).join(", ") || undefined,
    inLanguage: "en",
  };
}

export function itemListJsonLd(posts: PostSummary[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: posts.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: absoluteUrl(postPath(p.slug)),
      name: p.title,
    })),
  };
}

export function postMetadata(post: Post): Metadata {
  const path = postPath(post.slug);
  const description = post.seoDescription ?? post.excerpt ?? site.description;
  const images = post.coverImage ? [{ url: post.coverImage, alt: post.coverAlt ?? post.title }] : undefined;
  return {
    // `absolute` because most titles already carry the year/keywords; the brand suffix would truncate them.
    title: post.seoTitle ? { absolute: post.seoTitle } : post.title,
    description,
    alternates: { canonical: path },
    authors: post.author ? [{ name: post.author.name }] : undefined,
    openGraph:
      post.type === "post"
        ? {
            type: "article",
            url: path,
            title: post.title,
            description,
            images,
            publishedTime: post.publishedAt,
            modifiedTime: post.updatedAt,
            section: post.category?.name,
            tags: post.tags.map((t) => t.name),
            authors: post.author ? [post.author.name] : undefined,
          }
        : { type: "website", url: path, title: post.title, description, images },
    twitter: { card: "summary_large_image", title: post.title, description, images: images?.map((i) => i.url) },
  };
}

export function categoryMetadata(category: Category, page: number): Metadata {
  const path = categoryPath(category.slug, page);
  const title = page > 1 ? `${category.name} – Page ${page}` : `${category.name} Travel Guides`;
  const description = category.description ?? `${category.name} articles from ${site.name}.`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { type: "website", url: path, title, description },
  };
}
