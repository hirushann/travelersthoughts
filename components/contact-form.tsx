"use client";

import { useActionState } from "react";
import { sendContactMessage, type ContactState } from "@/app/(site)/contact-actions";
import { CONTACT_TOPICS } from "@/lib/contact";

const inputClass =
  "mt-1.5 block w-full rounded-xl border border-line bg-surface px-4 py-3 text-base outline-none transition focus:border-ink aria-[invalid=true]:border-accent";

export function ContactForm() {
  const [state, action, pending] = useActionState<ContactState, FormData>(sendContactMessage, {});
  const fe = state.fieldErrors ?? {};
  const v = state.values;

  if (state.ok) {
    return (
      <div role="status" className="not-prose mt-10 rounded-3xl border border-line bg-surface p-8 text-center">
        <p className="font-display text-2xl font-semibold">Thanks, your message is on its way.</p>
        <p className="mt-2 text-muted">We read everything and usually reply within a few days.</p>
      </div>
    );
  }

  return (
    <form
      action={action}
      className="not-prose mt-10 space-y-5 rounded-3xl border border-line bg-surface p-6 sm:p-8"
      noValidate
    >
      <h2 className="font-display text-2xl font-semibold tracking-tight">Send us a message</h2>
      {state.error && (
        <p role="alert" className="rounded-xl border border-accent/30 bg-accent-soft px-4 py-3 text-sm">
          {state.error}
        </p>
      )}

      {/* Stamped when the form appears in the browser, so instant bot submissions can be told
          apart. Set on the DOM node rather than as a prop to keep server and client HTML identical. */}
      <input
        type="hidden"
        name="startedAt"
        ref={(el) => {
          if (el && !el.value) el.value = String(Date.now());
        }}
      />
      {/* Honeypot: hidden from people and screen readers, tempting to bots. */}
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium">Your name</span>
          <input name="name" autoComplete="name" required defaultValue={v?.name} aria-invalid={Boolean(fe.name)} className={inputClass} />
          {fe.name && <span className="mt-1 block text-sm text-accent">{fe.name}</span>}
        </label>
        <label className="block">
          <span className="text-sm font-medium">Email</span>
          <input name="email" type="email" autoComplete="email" required defaultValue={v?.email} aria-invalid={Boolean(fe.email)} className={inputClass} />
          {fe.email && <span className="mt-1 block text-sm text-accent">{fe.email}</span>}
        </label>
      </div>

      <label className="block">
        <span className="text-sm font-medium">What&rsquo;s it about?</span>
        <select name="topic" required defaultValue={v?.topic ?? ""} aria-invalid={Boolean(fe.topic)} className={inputClass}>
          <option value="" disabled>
            Choose a topic
          </option>
          {CONTACT_TOPICS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        {fe.topic && <span className="mt-1 block text-sm text-accent">{fe.topic}</span>}
      </label>

      <label className="block">
        <span className="text-sm font-medium">Message</span>
        <textarea name="message" rows={6} required defaultValue={v?.message} aria-invalid={Boolean(fe.message)} className={inputClass} />
        {fe.message && <span className="mt-1 block text-sm text-accent">{fe.message}</span>}
      </label>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-xs text-muted">We only use your details to reply to you.</p>
        <button disabled={pending} className="rounded-full bg-ink px-6 py-3 font-semibold text-paper transition hover:bg-accent disabled:opacity-60">
          {pending ? "Sending…" : "Send message"}
        </button>
      </div>
    </form>
  );
}
