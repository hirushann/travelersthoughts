export type Author = {
  slug: string;
  name: string;
  bio: string | null;
  avatarUrl: string | null;
};

export type Category = {
  slug: string;
  name: string;
  description: string | null;
  sortOrder: number;
};

export type Tag = {
  slug: string;
  name: string;
};

/** What listings and cards need. Dates are ISO strings so they survive caching. */
export type PostSummary = {
  slug: string;
  title: string;
  excerpt: string | null;
  coverImage: string | null;
  coverAlt: string | null;
  readingMinutes: number;
  publishedAt: string;
  updatedAt: string;
  category: Category | null;
  author: Author | null;
};

export type Post = PostSummary & {
  type: "post" | "page";
  content: string;
  seoTitle: string | null;
  seoDescription: string | null;
  categories: Category[];
  tags: Tag[];
};

/** Shape of data/wp-export.json, also the input to the MySQL seeder. */
export type SnapshotPost = {
  type: "post" | "page";
  status: "draft" | "published";
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  coverImage: string | null;
  coverAlt: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  featured: boolean;
  readingMinutes: number;
  authorSlug: string | null;
  categorySlugs: string[];
  tagSlugs: string[];
  publishedAt: string;
  updatedAt: string;
};

export type Snapshot = {
  generatedAt: string;
  source: string;
  authors: Author[];
  categories: Category[];
  tags: Tag[];
  posts: SnapshotPost[];
};
