import type { Metadata } from "next";
import { TermManager } from "@/components/admin/term-manager";
import { PageHeader } from "@/components/admin/ui";
import { listTagsWithCounts } from "@/lib/admin/queries";
import { requireAdmin } from "@/lib/auth";
import { deleteTag, saveTag } from "../categories/actions";

export const metadata: Metadata = { title: "Tags" };

export default async function TagsPage() {
  await requireAdmin();
  const tags = await listTagsWithCounts();
  return (
    <>
      <PageHeader title="Tags" description="Tags are added from the post editor; tidy them up here." />
      <TermManager noun="tag" terms={tags.map((t) => ({ ...t, posts: Number(t.posts) }))} save={saveTag} remove={deleteTag} />
    </>
  );
}
