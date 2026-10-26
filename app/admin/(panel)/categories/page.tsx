import type { Metadata } from "next";
import { TermManager } from "@/components/admin/term-manager";
import { PageHeader } from "@/components/admin/ui";
import { listCategoriesWithCounts } from "@/lib/admin/queries";
import { requireAdmin } from "@/lib/auth";
import { deleteCategory, saveCategory } from "./actions";

export const metadata: Metadata = { title: "Categories" };

export default async function CategoriesPage() {
  await requireAdmin();
  const categories = await listCategoriesWithCounts();
  return (
    <>
      <PageHeader
        title="Categories"
        description="Categories appear in the site menu, ordered by menu order. Renaming a URL redirects the old one."
      />
      <TermManager
        noun="category"
        urlPrefix="/category/"
        withDescription
        terms={categories.map((c) => ({ ...c, posts: Number(c.posts) }))}
        save={saveCategory}
        remove={deleteCategory}
      />
    </>
  );
}
