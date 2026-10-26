import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PostEditor } from "@/components/admin/post-editor";
import { Notice } from "@/components/admin/ui";
import { getPostForEdit } from "@/lib/admin/queries";
import { canEditPost, requireUser } from "@/lib/auth";
import { site } from "@/lib/site";
import { editorOptions, toEditorPost } from "../editor-data";

export const metadata: Metadata = { title: "Edit post" };

export default async function EditPostPage({ params, searchParams }: PageProps<"/admin/posts/[id]">) {
  const user = await requireUser();
  const post = await getPostForEdit(Number((await params).id));
  if (!post) notFound();
  if (!canEditPost(user, post)) {
    return <Notice tone="error">This post belongs to another author. Ask an admin if you need to change it.</Notice>;
  }
  const options = await editorOptions();
  return (
    <PostEditor
      // Remount after saves that change identity so local state starts fresh.
      key={post.id}
      {...options}
      canChooseAuthor={user.role === "admin"}
      siteUrl={site.url}
      post={toEditorPost(post)}
      justCreated={(await searchParams).created === "1"}
    />
  );
}
