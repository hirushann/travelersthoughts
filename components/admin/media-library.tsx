"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useActionState, useRef, useState } from "react";
import { deleteMedia, updateAlt, type MediaActionState } from "@/app/admin/(panel)/media/actions";
import type { MediaItem } from "@/lib/media/storage";
import { uploadImage } from "./media-picker";
import { buttonClass, inputClass } from "./ui";

const kb = (n: number) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`);

export function MediaLibrary({ items }: { items: MediaItem[] }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState<MediaItem | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  async function upload(files: FileList | File[]) {
    setError(null);
    const list = Array.from(files);
    for (const [i, file] of list.entries()) {
      setUploading(`Uploading ${i + 1} of ${list.length}…`);
      try {
        await uploadImage(file);
      } catch (err) {
        setError(`${file.name}: ${err instanceof Error ? err.message : "upload failed"}`);
      }
    }
    setUploading(null);
    if (input.current) input.current.value = "";
    router.refresh();
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <div>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            upload(e.dataTransfer.files);
          }}
          className={`mb-6 flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-8 text-center text-sm ${
            dragging ? "border-accent bg-accent-soft" : "border-line bg-surface"
          }`}
        >
          <p className="font-medium">{uploading ?? "Drag images here"}</p>
          <p className="text-muted">JPEG, PNG, WebP, AVIF or GIF, up to 15 MB. Large photos are resized to 2400px wide.</p>
          <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => e.target.files && upload(e.target.files)} />
          <button type="button" className={`${buttonClass.accent} mt-2`} disabled={Boolean(uploading)} onClick={() => input.current?.click()}>
            Choose files
          </button>
          {error && <p className="mt-2 text-accent">{error}</p>}
        </div>

        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => setSelected(item)}
                className={`block w-full overflow-hidden rounded-xl border bg-sunken ${selected?.id === item.id ? "border-accent ring-2 ring-accent" : "border-line"}`}
              >
                <span className="relative block aspect-square">
                  <Image src={item.url} alt={item.alt ?? ""} fill sizes="(min-width: 1536px) 12vw, (min-width: 640px) 25vw, 50vw" className="object-cover" />
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <aside className="xl:sticky xl:top-6 xl:self-start">
        {selected ? <Details key={selected.id} item={selected} onDeleted={() => setSelected(null)} /> : (
          <p className="rounded-2xl border border-line bg-surface p-5 text-sm text-muted">Select an image to see its details, edit alt text or delete it.</p>
        )}
      </aside>
    </div>
  );
}

function Details({ item, onDeleted }: { item: MediaItem; onDeleted: () => void }) {
  const [altState, saveAlt, savingAlt] = useActionState<MediaActionState, FormData>(updateAlt, {});
  const [delState, remove, deleting] = useActionState<MediaActionState, FormData>(async (prev, fd) => {
    const result = await deleteMedia(prev, fd);
    if (result.ok) onDeleted();
    return result;
  }, {});
  const [copied, setCopied] = useState(false);

  return (
    <div className="space-y-4 rounded-2xl border border-line bg-surface p-5 text-sm">
      {item.width && item.height ? (
        <Image src={item.url} alt="" width={item.width} height={item.height} sizes="320px" className="w-full rounded-xl" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- dimensions unknown
        <img src={item.url} alt="" className="w-full rounded-xl" />
      )}
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
        <dt className="text-muted">File</dt>
        <dd className="truncate">{item.path}</dd>
        <dt className="text-muted">Size</dt>
        <dd>
          {item.width && item.height ? `${item.width}×${item.height} · ` : ""}
          {kb(item.size)}
        </dd>
        <dt className="text-muted">Added</dt>
        <dd>{new Date(item.createdAt).toLocaleDateString()}</dd>
      </dl>
      <form action={saveAlt} className="space-y-2">
        <input type="hidden" name="id" value={item.id} />
        <label className="block">
          <span className="text-xs font-medium">Alt text</span>
          <textarea name="alt" rows={2} defaultValue={item.alt ?? ""} className={`${inputClass} mt-1`} placeholder="What's in the picture?" />
        </label>
        <div className="flex items-center gap-3">
          <button className={buttonClass.primary} disabled={savingAlt}>{savingAlt ? "Saving…" : "Save"}</button>
          {altState.ok && <span className="text-xs text-sea">Saved</span>}
          {altState.error && <span className="text-xs text-accent">{altState.error}</span>}
        </div>
      </form>
      <div className="flex flex-wrap gap-2 border-t border-line pt-4">
        <button
          type="button"
          className={buttonClass.secondary}
          onClick={() => {
            navigator.clipboard.writeText(new URL(item.url, location.origin).href);
            setCopied(true);
          }}
        >
          {copied ? "Copied" : "Copy URL"}
        </button>
        <form
          action={remove}
          onSubmit={(e) => {
            if (!confirm("Delete this image permanently?")) e.preventDefault();
          }}
        >
          <input type="hidden" name="id" value={item.id} />
          <button className={buttonClass.danger} disabled={deleting}>{deleting ? "Deleting…" : "Delete"}</button>
        </form>
      </div>
      {delState.error && <p className="text-xs text-accent">{delState.error}</p>}
    </div>
  );
}
