import type { Metadata } from "next";
import { CreateUserForm, UserRowActions } from "@/components/admin/user-forms";
import { adminDate, PageHeader } from "@/components/admin/ui";
import { listUsers } from "@/lib/admin/queries";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Users" };

export default async function UsersPage() {
  const me = await requireAdmin();
  const users = await listUsers();
  const now = new Date();
  return (
    <>
      <PageHeader title="Users" description="Authors write and publish their own posts. Admins can edit everything and manage users." />
      <div className="space-y-6">
        <CreateUserForm />
        <div className="overflow-hidden rounded-2xl border border-line bg-surface">
          <ul className="divide-y divide-line">
            {users.map((u) => {
              const locked = Boolean(u.lockedUntil && u.lockedUntil > now);
              return (
                <li key={u.id} className="grid gap-4 p-4 sm:grid-cols-[1fr_auto] sm:items-start">
                  <div className="text-sm">
                    <p className="font-medium">
                      {u.name} {u.id === me.id && <span className="text-xs text-muted">(you)</span>}
                    </p>
                    <p className="text-muted">{u.email}</p>
                    <p className="mt-1 text-xs text-muted">
                      {u.active ? "Active" : "Deactivated"}
                      {locked && " · Locked after failed logins"} · Last sign-in {adminDate(u.lastLoginAt)}
                    </p>
                  </div>
                  <UserRowActions id={u.id} role={u.role} active={u.active} locked={locked} isSelf={u.id === me.id} />
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </>
  );
}
