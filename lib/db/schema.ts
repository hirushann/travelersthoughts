import {
  boolean,
  datetime,
  index,
  int,
  longtext,
  mysqlEnum,
  mysqlTable,
  primaryKey,
  text,
  varchar,
} from "drizzle-orm/mysql-core";

export const authors = mysqlTable("authors", {
  id: int("id").primaryKey().autoincrement(),
  slug: varchar("slug", { length: 191 }).notNull().unique(),
  name: varchar("name", { length: 191 }).notNull(),
  bio: text("bio"),
  avatarUrl: varchar("avatar_url", { length: 512 }),
});

export const categories = mysqlTable("categories", {
  id: int("id").primaryKey().autoincrement(),
  slug: varchar("slug", { length: 191 }).notNull().unique(),
  name: varchar("name", { length: 191 }).notNull(),
  description: text("description"),
  sortOrder: int("sort_order").notNull().default(0),
});

export const tags = mysqlTable("tags", {
  id: int("id").primaryKey().autoincrement(),
  slug: varchar("slug", { length: 191 }).notNull().unique(),
  name: varchar("name", { length: 191 }).notNull(),
});

export const posts = mysqlTable(
  "posts",
  {
    id: int("id").primaryKey().autoincrement(),
    // "page" covers standalone pages like /about/ that share the root URL space with posts.
    type: mysqlEnum("type", ["post", "page"]).notNull().default("post"),
    status: mysqlEnum("status", ["draft", "published"]).notNull().default("draft"),
    slug: varchar("slug", { length: 191 }).notNull().unique(),
    title: varchar("title", { length: 255 }).notNull(),
    excerpt: text("excerpt"),
    content: longtext("content").notNull(),
    coverImage: varchar("cover_image", { length: 512 }),
    coverAlt: varchar("cover_alt", { length: 255 }),
    seoTitle: varchar("seo_title", { length: 255 }),
    seoDescription: varchar("seo_description", { length: 320 }),
    featured: boolean("featured").notNull().default(false),
    readingMinutes: int("reading_minutes").notNull().default(1),
    authorId: int("author_id").references(() => authors.id),
    primaryCategoryId: int("primary_category_id").references(() => categories.id),
    publishedAt: datetime("published_at"),
    updatedAt: datetime("updated_at").notNull(),
    createdAt: datetime("created_at").notNull(),
  },
  (t) => [
    index("posts_status_published_idx").on(t.type, t.status, t.publishedAt),
    index("posts_category_idx").on(t.primaryCategoryId),
  ],
);

export const postCategories = mysqlTable(
  "post_categories",
  {
    postId: int("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    categoryId: int("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.postId, t.categoryId] })],
);

export const postTags = mysqlTable(
  "post_tags",
  {
    postId: int("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    tagId: int("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.postId, t.tagId] })],
);

export const users = mysqlTable("users", {
  id: int("id").primaryKey().autoincrement(),
  email: varchar("email", { length: 191 }).notNull().unique(),
  name: varchar("name", { length: 191 }).notNull(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  role: mysqlEnum("role", ["admin", "author"]).notNull().default("author"),
  // The public byline this login writes as.
  authorId: int("author_id").references(() => authors.id, { onDelete: "set null" }),
  active: boolean("active").notNull().default(true),
  failedLogins: int("failed_logins").notNull().default(0),
  lockedUntil: datetime("locked_until"),
  lastLoginAt: datetime("last_login_at"),
  createdAt: datetime("created_at").notNull(),
  updatedAt: datetime("updated_at").notNull(),
});

export const sessions = mysqlTable(
  "sessions",
  {
    // SHA-256 of the cookie token, so a leaked table can't be replayed.
    id: varchar("id", { length: 64 }).primaryKey(),
    userId: int("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: datetime("expires_at").notNull(),
    createdAt: datetime("created_at").notNull(),
    ip: varchar("ip", { length: 64 }),
    userAgent: varchar("user_agent", { length: 255 }),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const media = mysqlTable("media", {
  id: int("id").primaryKey().autoincrement(),
  // Relative to UPLOAD_DIR, e.g. 2025/11/great-ocean-road.jpg; served at /uploads/<path>.
  path: varchar("path", { length: 191 }).notNull().unique(),
  mime: varchar("mime", { length: 64 }).notNull(),
  size: int("size").notNull(),
  width: int("width"),
  height: int("height"),
  alt: varchar("alt", { length: 255 }),
  uploadedBy: int("uploaded_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: datetime("created_at").notNull(),
});

export const redirects = mysqlTable("redirects", {
  id: int("id").primaryKey().autoincrement(),
  fromPath: varchar("from_path", { length: 191 }).notNull().unique(),
  toPath: varchar("to_path", { length: 512 }).notNull(),
  createdAt: datetime("created_at").notNull(),
});
