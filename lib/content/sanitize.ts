import sanitizeHtml from "sanitize-html";

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", hellip: "…",
  ndash: "–", mdash: "—", lsquo: "‘", rsquo: "’", ldquo: "“", rdquo: "”",
};

export function decodeEntities(input: string) {
  return input
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, name) => NAMED_ENTITIES[name.toLowerCase()] ?? m);
}

export function toPlainText(html: string) {
  return decodeEntities(html.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .trim();
}

export function readingMinutes(html: string) {
  return Math.max(1, Math.round(toPlainText(html).split(" ").length / 220));
}

export function truncate(text: string, max: number) {
  if (text.length <= max) return text;
  return text.slice(0, max - 1).replace(/\s+\S*$/, "") + "…";
}

export function openingParagraph(html: string) {
  return toPlainText(html.match(/<p[^>]*>([\s\S]*?)<\/p>/)?.[1] ?? "");
}

export function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

/**
 * The single allowlist for article HTML, applied to imported posts and to every save from the
 * admin editor. Anything outside it (scripts, styles, event handlers, classes) is dropped.
 */
export function cleanContent(html: string, rewriteHref: (href: string) => string = (h) => h) {
  return sanitizeHtml(html, {
    allowedTags: [
      "h2", "h3", "h4", "h5", "p", "a", "ul", "ol", "li", "blockquote", "strong", "b", "em", "i",
      "u", "s", "mark", "small", "sub", "sup", "br", "hr", "figure", "figcaption", "img",
      "table", "thead", "tbody", "tfoot", "tr", "th", "td", "caption", "pre", "code", "iframe",
    ],
    allowedAttributes: {
      a: ["href", "title", "target", "rel"],
      img: ["src", "alt", "width", "height"],
      iframe: ["src", "title", "allow", "allowfullscreen", "width", "height"],
      th: ["colspan", "rowspan", "scope"],
      td: ["colspan", "rowspan"],
    },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    allowedIframeHostnames: ["www.youtube.com", "www.youtube-nocookie.com", "player.vimeo.com", "www.google.com"],
    transformTags: {
      // h1 belongs to the page template; demote any in the body.
      h1: "h2",
      a: (tagName, attribs) => {
        const next: Record<string, string> = { ...attribs };
        if (next.href) next.href = rewriteHref(next.href);
        // Links opened in a new tab must not hand the opener to the other site.
        if (next.target === "_blank") next.rel = "noopener noreferrer";
        return { tagName, attribs: next };
      },
    },
    exclusiveFilter: (frame) =>
      ["p", "figure", "h2", "h3", "h4"].includes(frame.tag) && !frame.text.trim() && !frame.mediaChildren.length,
  })
    // Elementor pages carry heavy indentation between tags.
    .replace(/[\t ]{2,}/g, " ")
    .replace(/>\s*\n\s*</g, ">\n<")
    .trim();
}
