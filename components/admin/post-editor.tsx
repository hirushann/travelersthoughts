"use client";

import Link from "@/components/admin/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { deletePost, savePost, type SaveState } from "@/app/admin/(panel)/posts/actions";
import type { MediaItem } from "@/lib/media/storage";
import { MediaPicker } from "./media-picker";
import { RichTextEditor } from "./rich-text-editor";
import { buttonClass, inputClass, StatusBadge } from "./ui";

export type EditorPost = {
  id: number | null;
  type: "post" | "page";
  status: "draft" | "published";
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  coverImage: string;
  coverAlt: string;
  seoTitle: string;
  seoDescription: string;
  featured: boolean;
  authorId: number | null;
  categoryIds: number[];
  primaryCategoryId: number | null;
  tags: string;
  publishedAt: string; // yyyy-MM-ddTHH:mm in UTC, or ""
  updatedAt: string | null;
};

type Props = {
  post: EditorPost;
  categories: { id: number; name: string }[];
  authors: { id: number; name: string }[];
  tagSuggestions: string[];
  canChooseAuthor: boolean;
  siteUrl: string;
  justCreated?: boolean;
};

const slugify = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);

const plain = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

export function PostEditor({ post, categories, authors, tagSuggestions, canChooseAuthor, siteUrl, justCreated }: Props) {
  const router = useRouter();
  const [dirty, setDirty] = useState(false);
  const [state, action, pending] = useActionState<SaveState, FormData>(async (prev, fd) => {
    const result = await savePost(prev, fd);
    if (result.ok) setDirty(false);
    if (result.createdId) router.replace(`/admin/posts/${result.createdId}/?created=1`);
    return result;
  }, {});
  const [title, setTitle] = useState(post.title);
  const [slug, setSlug] = useState(post.slug);
  const [slugTouched, setSlugTouched] = useState(Boolean(post.slug));
  const [content, setContent] = useState(post.content);
  const [cover, setCover] = useState({ url: post.coverImage, alt: post.coverAlt });
  const [pickerOpen, setPickerOpen] = useState(false);
  const [checked, setChecked] = useState<number[]>(post.categoryIds);
  const [primary, setPrimary] = useState<number | null>(post.primaryCategoryId);
  const [seoTitle, setSeoTitle] = useState(post.seoTitle);
  const [seoDescription, setSeoDescription] = useState(post.seoDescription);
  const [excerpt, setExcerpt] = useState(post.excerpt);
  const form = useRef<HTMLFormElement>(null);

  const status = state.status ?? post.status;
  const liveSlug = state.slug ?? post.slug;
  const isPage = post.type === "page";
  const noun = isPage ? "page" : "post";

  // Warn before leaving with unsaved edits.
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  // Cmd/Ctrl+S saves without changing the publish state.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        const submitter = form.current?.querySelector<HTMLButtonElement>('button[value="save"]');
        form.current?.requestSubmit(submitter ?? undefined);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const effectiveTitle = seoTitle || title || "Post title";
  const effectiveDescription = seoDescription || excerpt || plain(content).slice(0, 160) || "Your meta description shows here.";
  const fe = state.fieldErrors ?? {};

  function onCover(item: MediaItem) {
    setCover({ url: item.url, alt: item.alt || cover.alt || title });
    setPickerOpen(false);
    setDirty(true);
  }

  return (
    <form ref={form} action={action} onChange={() => setDirty(true)} className="pb-24">
      <input type="hidden" name="id" value={post.id ?? ""} />
      <input type="hidden" name="type" value={post.type} />
      <input type="hidden" name="content" value={content} />
      <input type="hidden" name="coverImage" value={cover.url} />

      <div className="sticky top-0 z-20 -mx-4 mb-6 flex min-h-16 flex-wrap items-center gap-3 border-b border-line bg-paper/90 px-4 py-2 backdrop-blur sm:-mx-8 sm:px-8 lg:-mx-10 lg:px-10">
        <Link href={isPage ? "/admin/posts/?type=page" : "/admin/posts/"} className="text-sm text-muted hover:text-ink">
          ← All {noun}s
        </Link>
        <StatusBadge status={status} />
        <span className="text-xs text-muted" aria-live="polite">
          {pending
            ? "Saving…"
            : state.ok
              ? `Saved ${new Date(state.savedAt!).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
              : justCreated && !dirty
                ? "Draft created"
                : dirty
                  ? "Unsaved changes"
                  : ""}
        </span>
        <div className="ml-auto flex flex-wrap gap-2">
          {post.id && (
            <a href={`/admin/posts/${post.id}/preview/`} target="_blank" className={buttonClass.secondary}>
              Preview
            </a>
          )}
          {status === "published" && post.id && (
            <a href={`/${liveSlug}/`} target="_blank" className={buttonClass.secondary}>
              View live ↗
            </a>
          )}
          {status === "published" ? (
            <button name="intent" value="save" disabled={pending} className={buttonClass.accent}>
              Update
            </button>
          ) : (
            <>
              <button name="intent" value="save" disabled={pending} className={buttonClass.secondary}>
                Save draft
              </button>
              <button name="intent" value="publish" disabled={pending} className={buttonClass.accent}>
                Publish
              </button>
            </>
          )}
        </div>
      </div>

      {state.error && (
        <p role="alert" className="mb-6 rounded-xl border border-accent/30 bg-accent-soft px-4 py-3 text-sm">
          {state.error}
        </p>
      )}

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-5">
          <div>
            <label htmlFor="title" className="sr-only">Title</label>
            <textarea
              id="title"
              name="title"
              rows={1}
              value={title}
              placeholder={`${isPage ? "Page" : "Post"} title`}
              aria-invalid={Boolean(fe.title)}
              onChange={(e) => {
                setTitle(e.target.value);
                if (!slugTouched) setSlug(slugify(e.target.value));
              }}
              className="field-sizing-content block w-full resize-none bg-transparent font-display text-4xl leading-tight font-semibold tracking-tight outline-none placeholder:text-muted/50"
            />
            {fe.title && <p className="mt-1 text-sm text-accent">{fe.title}</p>}
            <div className="mt-2 flex items-center gap-1 text-sm text-muted">
              <span className="shrink-0">{siteUrl.replace(/^https?:\/\//, "")}/</span>
              <input
                name="slug"
                value={slug}
                aria-label="URL slug"
                aria-invalid={Boolean(fe.slug)}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(e.target.value);
                }}
                className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1 py-0.5 text-ink outline-none hover:border-line focus:border-ink aria-[invalid=true]:border-accent"
              />
              <span>/</span>
            </div>
            {fe.slug && <p className="mt-1 text-sm text-accent">{fe.slug}</p>}
            {status === "published" && slug !== liveSlug && slug && (
              <p className="mt-1 text-xs text-muted">The old URL /{liveSlug}/ will redirect to the new one, so links and rankings carry over.</p>
            )}
          </div>

          <RichTextEditor
            initialHtml={post.content}
            invalid={Boolean(fe.content)}
            onChange={(html) => {
              setContent(html);
              setDirty(true);
            }}
          />
          {fe.content && <p className="text-sm text-accent">{fe.content}</p>}

          <section className="rounded-2xl border border-line bg-surface p-5">
            <h2 className="font-semibold">Search appearance</h2>
            <p className="mt-1 text-xs text-muted">How this {noun} can look on Google. Leave blank to use the title and excerpt.</p>
            <div className="mt-4 rounded-xl border border-line bg-paper p-4">
              <p className="truncate text-xs text-muted">
                {siteUrl.replace(/^https?:\/\//, "")} › {slug || "url"}
              </p>
              <p className="mt-1 line-clamp-1 text-lg text-[#1a0dab] dark:text-[#8ab4f8]">
                {effectiveTitle}
                {!seoTitle && " | Traveler's Thoughts"}
              </p>
              <p className="mt-1 line-clamp-2 text-sm text-muted">{effectiveDescription}</p>
            </div>
            <div className="mt-4 grid gap-4">
              <Field label="SEO title" count={seoTitle.length} limit={60}>
                <input name="seoTitle" value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} className={inputClass} placeholder={title} />
              </Field>
              <Field label="Meta description" count={seoDescription.length} limit={160}>
                <textarea
                  name="seoDescription"
                  rows={3}
                  value={seoDescription}
                  onChange={(e) => setSeoDescription(e.target.value)}
                  className={inputClass}
                  placeholder="One or two sentences that make someone want to click."
                />
              </Field>
              <Field label="Excerpt" hint="Shown on cards and as the intro under the title.">
                <textarea name="excerpt" rows={3} value={excerpt} onChange={(e) => setExcerpt(e.target.value)} className={inputClass} />
              </Field>
            </div>
          </section>
        </div>

        <aside className="space-y-5">
          <Panel title="Cover image">
            {cover.url ? (
              <div className="space-y-3">
                {/* eslint-disable-next-line @next/next/no-img-element -- local upload preview */}
                <img src={cover.url} alt="" className="aspect-[16/10] w-full rounded-xl object-cover" />
                <input
                  name="coverAlt"
                  value={cover.alt}
                  onChange={(e) => setCover({ ...cover, alt: e.target.value })}
                  placeholder="Describe the image (alt text)"
                  className={inputClass}
                />
                <div className="flex gap-2">
                  <button type="button" className={buttonClass.secondary} onClick={() => setPickerOpen(true)}>Replace</button>
                  <button type="button" className={buttonClass.danger} onClick={() => { setCover({ url: "", alt: "" }); setDirty(true); }}>Remove</button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="flex aspect-[16/10] w-full items-center justify-center rounded-xl border border-dashed border-line text-sm text-muted hover:border-ink hover:text-ink"
              >
                Choose or upload an image
              </button>
            )}
            {fe.coverImage && <p className="mt-2 text-sm text-accent">{fe.coverImage}</p>}
          </Panel>

          {!isPage && (
            <Panel title="Categories">
              <ul className="space-y-1.5">
                {categories.map((c) => {
                  const on = checked.includes(c.id);
                  const isPrimary = primary === c.id || (primary === null && checked[0] === c.id);
                  return (
                    <li key={c.id} className="flex items-center justify-between gap-2 text-sm">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          name="categoryIds"
                          value={c.id}
                          checked={on}
                          onChange={(e) => {
                            const next = e.target.checked ? [...checked, c.id] : checked.filter((id) => id !== c.id);
                            setChecked(next);
                            if (!next.includes(primary ?? -1)) setPrimary(next[0] ?? null);
                          }}
                          className="accent-[var(--accent)]"
                        />
                        {c.name}
                      </label>
                      {on && (
                        <button
                          type="button"
                          onClick={() => setPrimary(c.id)}
                          className={`text-[11px] ${isPrimary ? "font-semibold text-accent" : "text-muted hover:text-ink"}`}
                        >
                          {isPrimary ? "Primary" : "Make primary"}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
              <input type="hidden" name="primaryCategoryId" value={primary ?? ""} />
              <p className="mt-3 text-xs text-muted">The primary category appears on cards and in breadcrumbs.</p>
            </Panel>
          )}

          {!isPage && (
            <Panel title="Tags">
              <input name="tags" defaultValue={post.tags} list="tag-suggestions" placeholder="Japan, itinerary, budget" className={inputClass} />
              <datalist id="tag-suggestions">
                {tagSuggestions.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
              <p className="mt-2 text-xs text-muted">Separate with commas. New tags are created automatically.</p>
            </Panel>
          )}

          <Panel title="Publishing">
            <div className="space-y-4 text-sm">
              {canChooseAuthor && (
                <label className="block">
                  <span className="text-xs text-muted">Author</span>
                  <select name="authorId" defaultValue={post.authorId ?? ""} className={`${inputClass} mt-1`}>
                    {authors.map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </label>
              )}
              <label className="block">
                <span className="text-xs text-muted">Publish date (UTC)</span>
                <input type="datetime-local" name="publishedAt" defaultValue={post.publishedAt} className={`${inputClass} mt-1`} />
                <span className="mt-1 block text-xs text-muted">Leave empty to use the moment you publish.</span>
              </label>
              {!isPage && (
                <label className="flex items-center gap-2">
                  <input type="checkbox" name="featured" defaultChecked={post.featured} className="accent-[var(--accent)]" />
                  Featured post
                </label>
              )}
              {post.updatedAt && (
                // Formatted in the reader's locale and timezone, which the server can't know.
                <p className="text-xs text-muted" suppressHydrationWarning>
                  Last saved {new Date(post.updatedAt).toLocaleString()}
                </p>
              )}
              {status === "published" && (
                <button name="intent" value="unpublish" disabled={pending} className={`${buttonClass.secondary} w-full`}>
                  Unpublish (back to draft)
                </button>
              )}
            </div>
          </Panel>

          {post.id && (
            <Panel title="Danger zone">
              <button
                type="submit"
                formAction={deletePost}
                formNoValidate
                onClick={(e) => {
                  if (!confirm(`Delete “${title || "this " + noun}” permanently? This can't be undone.`)) e.preventDefault();
                }}
                className={`${buttonClass.danger} -ml-4`}
              >
                Delete {noun}
              </button>
            </Panel>
          )}
        </aside>
      </div>

      <MediaPicker open={pickerOpen} onClose={() => setPickerOpen(false)} onSelect={onCover} />
    </form>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-5">
      <h2 className="mb-3 text-sm font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Field({ label, hint, count, limit, children }: { label: string; hint?: string; count?: number; limit?: number; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="flex items-center justify-between text-xs">
        <span className="font-medium">{label}</span>
        {limit !== undefined && (
          <span className={count! > limit ? "text-accent" : "text-muted"}>
            {count}/{limit}
          </span>
        )}
      </span>
      <span className="mt-1.5 block">{children}</span>
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}
