"use client";

import { useActionState, useState } from "react";
import { changePassword, createUser, updateProfile, updateUser, type UserState } from "@/app/admin/(panel)/users/actions";
import { MediaPicker } from "./media-picker";
import { buttonClass, inputClass } from "./ui";

function Result({ state }: { state: UserState }) {
  if (state.error) return <p role="alert" className="text-sm text-accent">{state.error}</p>;
  if (!state.message) return null;
  return (
    <div role="status" className="rounded-xl border border-sea/30 bg-sea/10 p-3 text-sm">
      <p>{state.message}</p>
      {state.tempPassword && (
        <p className="mt-2">
          Temporary password, shown once: <code className="rounded bg-surface px-2 py-0.5 font-mono font-semibold select-all">{state.tempPassword}</code>
          <span className="mt-1 block text-xs text-muted">Send it privately and ask them to change it from their profile.</span>
        </p>
      )}
    </div>
  );
}

export function CreateUserForm() {
  const [state, action, pending] = useActionState<UserState, FormData>(createUser, {});
  return (
    <form action={action} className="space-y-3 rounded-2xl border border-line bg-surface p-5">
      <h2 className="font-semibold">Add a writer</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        <input name="name" required placeholder="Name (their byline)" className={inputClass} />
        <input name="email" type="email" required placeholder="Email" className={inputClass} />
        <select name="role" defaultValue="author" className={inputClass}>
          <option value="author">Author: writes and publishes own posts</option>
          <option value="admin">Admin: manages everything</option>
        </select>
      </div>
      <button className={buttonClass.accent} disabled={pending}>{pending ? "Adding…" : "Add user"}</button>
      <Result state={state} />
    </form>
  );
}

export function UserRowActions({ id, role, active, locked, isSelf }: { id: number; role: "admin" | "author"; active: boolean; locked: boolean; isSelf: boolean }) {
  const [state, action, pending] = useActionState<UserState, FormData>(updateUser, {});
  return (
    <div className="space-y-2">
      <form action={action} className="flex flex-wrap items-center justify-end gap-2">
        <input type="hidden" name="id" value={id} />
        <select
          name="role"
          defaultValue={role}
          disabled={pending}
          onChange={(e) => e.currentTarget.form?.requestSubmit()}
          className={`${inputClass} w-auto py-1.5`}
          aria-label="Role"
        >
          <option value="author">Author</option>
          <option value="admin">Admin</option>
        </select>
        <input type="hidden" name="intent" value="role" />
      </form>
      <div className="flex flex-wrap justify-end gap-1">
        {locked && <IntentButton id={id} intent="unlock" label="Unlock" action={action} pending={pending} />}
        <IntentButton id={id} intent="reset-password" label="Reset password" action={action} pending={pending} confirmText="Generate a new password and sign them out?" />
        {!isSelf && (
          <IntentButton id={id} intent="toggle-active" label={active ? "Deactivate" : "Reactivate"} action={action} pending={pending} danger={active} />
        )}
      </div>
      <Result state={state} />
    </div>
  );
}

function IntentButton({ id, intent, label, action, pending, confirmText, danger }: { id: number; intent: string; label: string; action: (fd: FormData) => void; pending: boolean; confirmText?: string; danger?: boolean }) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (confirmText && !confirm(confirmText)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="intent" value={intent} />
      <button className={`${danger ? buttonClass.danger : buttonClass.secondary} py-1.5 text-xs`} disabled={pending}>
        {label}
      </button>
    </form>
  );
}

export function ProfileForm({ name, bio, avatarUrl }: { name: string; bio: string; avatarUrl: string }) {
  const [state, action, pending] = useActionState<UserState, FormData>(updateProfile, {});
  const [avatar, setAvatar] = useState(avatarUrl);
  const [picker, setPicker] = useState(false);
  return (
    <form action={action} className="space-y-4 rounded-2xl border border-line bg-surface p-5">
      <h2 className="font-semibold">Public profile</h2>
      <input type="hidden" name="avatarUrl" value={avatar} />
      <div className="flex items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element -- local avatar */}
        {avatar ? <img src={avatar} alt="" className="size-16 rounded-full object-cover" /> : <div className="size-16 rounded-full bg-sunken" />}
        <button type="button" className={buttonClass.secondary} onClick={() => setPicker(true)}>Change photo</button>
      </div>
      <label className="block text-sm">
        <span className="text-xs font-medium">Name (shown as your byline)</span>
        <input name="name" defaultValue={name} required className={`${inputClass} mt-1`} />
      </label>
      <label className="block text-sm">
        <span className="text-xs font-medium">Bio (shown in the author box under your posts)</span>
        <textarea name="bio" rows={4} defaultValue={bio} className={`${inputClass} mt-1`} />
      </label>
      <button className={buttonClass.primary} disabled={pending}>{pending ? "Saving…" : "Save profile"}</button>
      <Result state={state} />
      <MediaPicker open={picker} onClose={() => setPicker(false)} onSelect={(m) => { setAvatar(m.url); setPicker(false); }} />
    </form>
  );
}

export function PasswordForm() {
  const [state, action, pending] = useActionState<UserState, FormData>(changePassword, {});
  return (
    <form action={action} className="space-y-4 rounded-2xl border border-line bg-surface p-5">
      <h2 className="font-semibold">Change password</h2>
      <input name="current" type="password" autoComplete="current-password" required placeholder="Current password" className={inputClass} />
      <input name="next" type="password" autoComplete="new-password" required minLength={10} placeholder="New password (10+ characters)" className={inputClass} />
      <input name="confirm" type="password" autoComplete="new-password" required placeholder="Repeat new password" className={inputClass} />
      <button className={buttonClass.primary} disabled={pending}>{pending ? "Saving…" : "Change password"}</button>
      <Result state={state} />
    </form>
  );
}
