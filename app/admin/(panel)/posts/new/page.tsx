import type { Metadata } from "next";
import { PostEditor } from "@/components/admin/post-editor";
import { requireUser } from "@/lib/auth";
import { site } from "@/lib/site";
import { editorOptions } from "../editor-data";

export const metadata: Metadata = { title: "New post" };

export default async function NewPostPage({ searchParams }: PageProps<"/admin/posts/new">) {
  const user = await requireUser();
  const type = (await searchParams).type === "page" ? "page" : "post";
  const options = await editorOptions();
  return (
    <PostEditor
      {...options}
      canChooseAuthor={user.role === "admin"}
      siteUrl={site.url}
      post={{
        id: null,
        type,
        status: "draft",
        title: "",
        slug: "",
        content: "",
        excerpt: "",
        coverImage: "",
        coverAlt: "",
        seoTitle: "",
        seoDescription: "",
        featured: false,
        authorId: user.authorId,
        categoryIds: [],
        primaryCategoryId: null,
        tags: "",
        publishedAt: "",
        updatedAt: null,
      }}
    />
  );
}
