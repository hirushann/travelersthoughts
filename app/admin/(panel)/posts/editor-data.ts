import "server-only";
import { listAuthors, listCategoriesWithCounts, listTagsWithCounts, type EditablePost } from "@/lib/admin/queries";
import type { EditorPost } from "@/components/admin/post-editor";

export async function editorOptions() {
  const [categories, authors, tags] = await Promise.all([listCategoriesWithCounts(), listAuthors(), listTagsWithCounts()]);
  return {
    categories: categories.map((c) => ({ id: c.id, name: c.name })),
    authors,
    tagSuggestions: tags.map((t) => t.name),
  };
}

const utcInput = (d: Date | null) => (d ? d.toISOString().slice(0, 16) : "");

export function toEditorPost(p: EditablePost): EditorPost {
  return {
    id: p.id,
    type: p.type,
    status: p.status,
    title: p.title,
    slug: p.slug,
    content: p.content,
    excerpt: p.excerpt ?? "",
    coverImage: p.coverImage ?? "",
    coverAlt: p.coverAlt ?? "",
    seoTitle: p.seoTitle ?? "",
    seoDescription: p.seoDescription ?? "",
    featured: p.featured,
    authorId: p.authorId,
    categoryIds: p.categoryIds,
    primaryCategoryId: p.primaryCategoryId,
    tags: p.tagNames.join(", "),
    publishedAt: utcInput(p.publishedAt),
    updatedAt: p.updatedAt.toISOString(),
  };
}
