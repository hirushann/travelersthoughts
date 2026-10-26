"use client";

import { useActionState } from "react";
import { login, type LoginState } from "./actions";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  return (
    <form action={action} className="mt-8 space-y-5">
      {state.error && (
        <p role="alert" className="rounded-xl border border-accent/30 bg-accent-soft px-4 py-3 text-sm text-ink">
          {state.error}
        </p>
      )}
      <label className="block">
        <span className="text-sm font-medium">Email</span>
        <input
          name="email"
          type="email"
          autoComplete="username"
          required
          defaultValue={state.email}
          className="mt-1.5 block w-full rounded-xl border border-line bg-surface px-4 py-3 outline-none focus:border-ink"
        />
      </label>
      <label className="block">
        <span className="text-sm font-medium">Password</span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="mt-1.5 block w-full rounded-xl border border-line bg-surface px-4 py-3 outline-none focus:border-ink"
        />
      </label>
      <button
        disabled={pending}
        className="w-full rounded-full bg-ink px-5 py-3 font-semibold text-paper transition hover:bg-accent disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
