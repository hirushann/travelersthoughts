"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { MediaItem } from "@/lib/media/storage";
import { buttonClass, inputClass } from "./ui";

type ListResponse = { items: MediaItem[]; total: number; totalPages: number };

export async function uploadImage(file: File, alt = ""): Promise<MediaItem> {
  const body = new FormData();
  body.set("file", file);
  body.set("alt", alt);
  const res = await fetch("/api/admin/media/", { method: "POST", body });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Upload failed.");
  return json as MediaItem;
}

/** Modal library: browse, search or upload, then pick one image. */
export function MediaPicker({ open, onClose, onSelect }: { open: boolean; onClose: () => void; onSelect: (item: MediaItem) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [data, setData] = useState<ListResponse | null>(null);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) dialog.current?.showModal();
    else dialog.current?.close();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    fetch(`/api/admin/media/?page=${page}&q=${encodeURIComponent(q)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json: ListResponse | null) => {
        if (json && !cancelled) setData(json);
      });
    return () => {
      cancelled = true;
    };
  }, [open, page, q]);

  async function onUpload(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setError(null);
    try {
      const item = await uploadImage(files[0]);
      onSelect(item);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      onClick={(e) => e.target === dialog.current && onClose()}
      className="m-auto w-[min(960px,calc(100vw-2rem))] rounded-3xl border border-line bg-paper p-0 text-ink shadow-2xl backdrop:bg-black/50"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-5">
        <h2 className="font-display text-xl font-semibold">Media library</h2>
        <div className="flex flex-wrap gap-2">
          <input
            type="search"
            placeholder="Search…"
            className={`${inputClass} w-48`}
            onChange={(e) => {
              setPage(1);
              setQ(e.target.value);
            }}
          />
          <input ref={fileInput} type="file" accept="image/*" hidden onChange={(e) => onUpload(e.target.files)} />
          <button type="button" className={buttonClass.accent} disabled={busy} onClick={() => fileInput.current?.click()}>
            {busy ? "Uploading…" : "Upload new"}
          </button>
          <button type="button" className={buttonClass.secondary} onClick={onClose}>
            Close
          </button>
        </div>
      </div>
      {error && <p className="mx-5 mt-4 rounded-xl bg-accent-soft px-4 py-2 text-sm">{error}</p>}
      <div className="max-h-[65vh] overflow-y-auto p-5">
        {!data ? (
          <p className="py-16 text-center text-sm text-muted">Loading…</p>
        ) : data.items.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted">No images yet. Upload one to get started.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {data.items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onSelect(item)}
                  className="group block w-full overflow-hidden rounded-xl border border-line bg-sunken text-left focus:border-accent"
                >
                  <span className="relative block aspect-square">
                    <Image src={item.url} alt={item.alt ?? ""} fill sizes="160px" className="object-cover transition group-hover:opacity-80" />
                  </span>
                  <span className="block truncate px-2 py-1.5 text-[11px] text-muted">{item.path.split("/").pop()}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-line px-5 py-3 text-sm">
          <span className="text-muted">
            Page {page} of {data.totalPages}
          </span>
          <div className="flex gap-2">
            <button type="button" className={buttonClass.secondary} disabled={page <= 1} onClick={() => setPage(page - 1)}>
              Previous
            </button>
            <button type="button" className={buttonClass.secondary} disabled={page >= data.totalPages} onClick={() => setPage(page + 1)}>
              Next
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
}
