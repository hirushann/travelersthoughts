export type TocItem = { id: string; text: string; level: 2 | 3 };

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&[a-z#0-9]+;/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

const stripTags = (html: string) => html.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").trim();

/**
 * Gives every h2/h3 a stable id (for jump links and Google's "Jump to" sitelinks),
 * lazy-loads body images and returns the table of contents.
 */
export function prepareArticleHtml(html: string): { html: string; toc: TocItem[] } {
  const toc: TocItem[] = [];
  const used = new Set<string>();

  const withIds = html.replace(/<h([23])([^>]*)>([\s\S]*?)<\/h\1>/g, (match, level: string, attrs: string, inner: string) => {
    if (/\sid=/.test(attrs)) return match;
    const text = stripTags(inner);
    if (!text) return match;
    let id = slugify(text) || "section";
    for (let n = 2; used.has(id); n++) id = `${slugify(text)}-${n}`;
    used.add(id);
    toc.push({ id, text, level: Number(level) as 2 | 3 });
    return `<h${level}${attrs} id="${id}">${inner}</h${level}>`;
  });

  const withLazyImages = withIds.replace(/<img(?![^>]*\sloading=)/g, '<img loading="lazy" decoding="async"');

  return { html: withLazyImages, toc };
}

/** True when the article opens with the excerpt text (WordPress auto-excerpts do), so the dek would repeat it. */
export function opensWith(html: string, text: string) {
  const firstParagraph = html.match(/<p[^>]*>([\s\S]*?)<\/p>/)?.[1];
  if (!firstParagraph) return false;
  const norm = (s: string) => stripTags(s).replace(/\s+/g, " ").replace(/…$/, "").trim().slice(0, 80);
  return norm(firstParagraph) === norm(text);
}
