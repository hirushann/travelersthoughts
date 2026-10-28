import type { Metadata } from "next";
import Link from "@/components/admin/link";
import { notFound } from "next/navigation";
import { Article, StandalonePage } from "@/components/article";
import { getPostPreview } from "@/lib/admin/queries";
import { canEditPost, requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Preview" };

export default async function PreviewPage({ params }: PageProps<"/admin/posts/[id]/preview">) {
  const user = await requireUser();
  const post = await getPostPreview(Number((await params).id));
  if (!post || !canEditPost(user, post)) notFound();

  return (
    <div className="-mx-4 -my-8 bg-paper pb-20 sm:-mx-8 lg:-mx-10 lg:-my-10">
      <div className="sticky top-0 z-30 flex items-center justify-between gap-4 bg-ink px-4 py-2.5 text-sm text-paper sm:px-8">
        <span>
          Preview{post.status === "draft" ? " · draft, not visible to readers" : ""}
        </span>
        <Link href={`/admin/posts/${(await params).id}/`} className="font-semibold underline underline-offset-4">
          Back to editor
        </Link>
      </div>
      {post.type === "page" ? <StandalonePage page={post} /> : <Article post={post} />}
    </div>
  );
}
