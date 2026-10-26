"use client";

import { useActionState, useState } from "react";
import type { TermState } from "@/app/admin/(panel)/categories/actions";
import { buttonClass, inputClass } from "./ui";

type Term = { id: number; name: string; slug: string; posts: number; description?: string | null; sortOrder?: number };
type Action = (prev: TermState, fd: FormData) => Promise<TermState>;

type Props = {
  terms: Term[];
  save: Action;
  remove: Action;
  noun: string;
  urlPrefix?: string;
  withDescription?: boolean;
};

export function TermManager({ terms, save, remove, noun, urlPrefix, withDescription }: Props) {
  const [editing, setEditing] = useState<number | "new" | null>(null);
  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-2xl border border-line bg-surface">
        <ul className="divide-y divide-line">
          {terms.map((t) =>
            editing === t.id ? (
              <li key={t.id} className="p-4">
                <TermForm term={t} save={save} withDescription={withDescription} urlPrefix={urlPrefix} onDone={() => setEditing(null)} />
              </li>
            ) : (
              <li key={t.id} className="flex flex-wrap items-center gap-4 px-4 py-3 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{t.name}</p>
                  <p className="text-xs text-muted">
                    {urlPrefix ? `${urlPrefix}${t.slug}/` : t.slug} · {t.posts} post{t.posts === 1 ? "" : "s"}
                  </p>
                </div>
                <button type="button" className={buttonClass.secondary} onClick={() => setEditing(t.id)}>
                  Edit
                </button>
                <DeleteButton id={t.id} remove={remove} label={`Delete ${noun} “${t.name}”? Posts keep their other ${noun}s.`} />
              </li>
            ),
          )}
          {terms.length === 0 && <li className="p-8 text-center text-sm text-muted">No {noun}s yet.</li>}
        </ul>
      </div>
      {editing === "new" ? (
        <div className="rounded-2xl border border-line bg-surface p-4">
          <TermForm save={save} withDescription={withDescription} urlPrefix={urlPrefix} onDone={() => setEditing(null)} />
        </div>
      ) : (
        <button type="button" className={buttonClass.accent} onClick={() => setEditing("new")}>
          Add {noun}
        </button>
      )}
    </div>
  );
}

function TermForm({ term, save, withDescription, urlPrefix, onDone }: { term?: Term; save: Action; withDescription?: boolean; urlPrefix?: string; onDone: () => void }) {
  const [state, action, pending] = useActionState<TermState, FormData>(async (prev, fd) => {
    const result = await save(prev, fd);
    if (result.ok) onDone();
    return result;
  }, {});
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="id" value={term?.id ?? ""} />
      <label className="text-sm">
        <span className="text-xs font-medium">Name</span>
        <input name="name" required defaultValue={term?.name} className={`${inputClass} mt-1`} autoFocus />
      </label>
      <label className="text-sm">
        <span className="text-xs font-medium">URL slug {urlPrefix && <span className="text-muted">({urlPrefix}…/)</span>}</span>
        <input name="slug" defaultValue={term?.slug} placeholder="generated from the name" className={`${inputClass} mt-1`} />
      </label>
      {withDescription && (
        <>
          <label className="text-sm sm:col-span-2">
            <span className="text-xs font-medium">Description (shown on the category page and used as its meta description)</span>
            <textarea name="description" rows={3} defaultValue={term?.description ?? ""} className={`${inputClass} mt-1`} />
          </label>
          <label className="text-sm">
            <span className="text-xs font-medium">Menu order</span>
            <input name="sortOrder" type="number" defaultValue={term?.sortOrder ?? 0} className={`${inputClass} mt-1`} />
          </label>
        </>
      )}
      <div className="flex items-center gap-2 sm:col-span-2">
        <button className={buttonClass.primary} disabled={pending}>{pending ? "Saving…" : "Save"}</button>
        <button type="button" className={buttonClass.secondary} onClick={onDone}>Cancel</button>
        {state.error && <span className="text-sm text-accent">{state.error}</span>}
      </div>
    </form>
  );
}

function DeleteButton({ id, remove, label }: { id: number; remove: Action; label: string }) {
  const [state, action, pending] = useActionState<TermState, FormData>(remove, {});
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(label)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button className={buttonClass.danger} disabled={pending}>Delete</button>
      {state.error && <span className="text-xs text-accent">{state.error}</span>}
    </form>
  );
}
