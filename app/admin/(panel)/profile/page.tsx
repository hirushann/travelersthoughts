import type { Metadata } from "next";
import { PasswordForm, ProfileForm } from "@/components/admin/user-forms";
import { PageHeader } from "@/components/admin/ui";
import { getUserProfile } from "@/lib/admin/queries";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const user = await requireUser();
  const profile = await getUserProfile(user.id);
  return (
    <>
      <PageHeader title="Your profile" description={`Signed in as ${user.email}`} />
      <div className="grid max-w-4xl gap-6 lg:grid-cols-2">
        <ProfileForm name={profile?.name ?? user.name} bio={profile?.bio ?? ""} avatarUrl={profile?.avatarUrl ?? ""} />
        <PasswordForm />
      </div>
    </>
  );
}
