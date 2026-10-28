export const site = {
  name: "Traveler's Thoughts",
  shortName: "Traveler's Thoughts",
  tagline: "Travel stories, itineraries and honest tips",
  description:
    "Destination guides, day-by-day itineraries and practical travel tips from Traveler's Thoughts, for exploring the world smarter, cheaper and more confidently.",
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "https://travelersthoughts.com").replace(/\/$/, ""),
  locale: "en_US",
  // The page that shows the contact form under its content.
  contactPageSlug: "contact-travel-blog",
  social: {
    facebook: "https://www.facebook.com/profile.php?id=61574573740285",
    instagram: "https://www.instagram.com/travelers_thoughts_/",
    tiktok: "https://www.tiktok.com/@travelers.thoughts",
    x: "https://x.com/travelerthghtsx",
  },
} as const;

/** Absolute URL with the trailing slash the site has always used. */
export function absoluteUrl(pathname = "/") {
  const withSlash = pathname.endsWith("/") ? pathname : `${pathname}/`;
  return `${site.url}${withSlash}`;
}

export const postPath = (slug: string) => `/${slug}/`;
export const categoryPath = (slug: string, page = 1) => (page > 1 ? `/category/${slug}/page/${page}/` : `/category/${slug}/`);

export function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(iso));
}
