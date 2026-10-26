/**
 * Copies every WordPress-hosted image the database still points at (post bodies, covers,
 * author avatars) into UPLOAD_DIR, registers it in the media library and rewrites the URLs
 * to /uploads/... Safe to re-run: files already on disk are not downloaded again.
 *
 *   npm run wp:media
 */
import "dotenv/config";
import { mkdir, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import sharp from "sharp";
import * as schema from "../../lib/db/schema";

const { authors, media, posts } = schema;

const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR ?? path.join(process.cwd(), "storage", "uploads"));
const WP_UPLOAD_URL = /https?:\/\/(?:www\.)?travelersthoughts\.com\/wp-content\/uploads\/([^"'\s)<>?#]+)/g;
const CONCURRENCY = 6;

const MIME: Record<string, string> = { jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif", avif: "image/avif" };

const exists = (file: string) => stat(file).then(() => true, () => false);
const toUrl = (rel: string) => `/uploads/${rel.split("/").map(encodeURIComponent).join("/")}`;

async function download(url: string, rel: string) {
  const file = path.resolve(UPLOAD_DIR, rel);
  if (!file.startsWith(UPLOAD_DIR + path.sep)) throw new Error(`Refusing path ${rel}`);
  if (await exists(file)) return file;
  const res = await fetch(url, { headers: { "User-Agent": "travelersthoughts-next media migration" } });
  if (!res.ok) throw new Error(`${res.status}`);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, Buffer.from(await res.arrayBuffer()));
  return file;
}

async function pool<T>(items: T[], worker: (item: T) => Promise<void>) {
  let next = 0;
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (next < items.length) await worker(items[next++]);
    }),
  );
}

async function main() {
  const connection = mysql.createPool({ uri: process.env.DATABASE_URL!, connectionLimit: CONCURRENCY });
  const db = drizzle(connection, { schema, mode: "default" });

  try {
    // srcset/sizes point at WordPress's resized copies; the new site serves one file per image.
    const stripResponsive = (html: string) => html.replace(/\s(?:srcset|sizes)="[^"]*"/g, "");
    const allPosts = (await db.select({ id: posts.id, content: posts.content, coverImage: posts.coverImage }).from(posts)).map((p) => ({
      ...p,
      original: p.content,
      content: stripResponsive(p.content),
    }));

    // Relative upload path -> original URL
    const wanted = new Map<string, string>();
    for (const p of allPosts) {
      for (const text of [p.content, p.coverImage ?? ""]) {
        for (const m of text.matchAll(WP_UPLOAD_URL)) wanted.set(decodeURIComponent(m[1]), m[0]);
      }
    }
    console.log(`Found ${wanted.size} WordPress files referenced by ${allPosts.length} posts.`);

    const known = new Set((await db.select({ path: media.path }).from(media)).map((r) => r.path));
    const failed = new Map<string, string>();
    let done = 0;

    await pool([...wanted], async ([rel, url]) => {
      try {
        const file = await download(url, rel);
        if (!known.has(rel) && rel.length <= 191) {
          const meta = await sharp(file).metadata().catch(() => null);
          const info = await stat(file);
          await db
            .insert(media)
            .values({
              path: rel,
              mime: MIME[meta?.format ?? ""] ?? "application/octet-stream",
              size: info.size,
              width: meta?.width ?? null,
              height: meta?.height ?? null,
              alt: null,
              uploadedBy: null,
              createdAt: info.mtime,
            })
            .onDuplicateKeyUpdate({ set: { size: info.size } });
          known.add(rel);
        }
      } catch (err) {
        failed.set(rel, err instanceof Error ? err.message : String(err));
      }
      process.stdout.write(`  files ${++done}/${wanted.size}\r`);
    });
    process.stdout.write("\n");

    // Files WordPress itself no longer has are already broken on the live site; drop those images.
    const gone = [...failed].filter(([, why]) => why === "404").map(([rel]) => wanted.get(rel)!);
    const dropGone = (html: string) =>
      gone.reduce((out, url) => out.replace(new RegExp(`<img[^>]*src="${url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"[^>]*>`, "g"), ""), html);

    const rewrite = (text: string) =>
      text.replace(WP_UPLOAD_URL, (match, rel: string) => (failed.has(decodeURIComponent(rel)) ? match : toUrl(decodeURIComponent(rel))));

    let changed = 0;
    for (const p of allPosts) {
      const content = rewrite(dropGone(p.content));
      const coverImage = p.coverImage ? rewrite(p.coverImage) : null;
      if (content !== p.original || coverImage !== p.coverImage) {
        // updatedAt is left as is: the article didn't change, only where its images live.
        await db.update(posts).set({ content, coverImage }).where(eq(posts.id, p.id));
        changed++;
      }
    }
    console.log(`Rewrote image URLs in ${changed} posts.`);

    // Remove library entries for files no post uses (e.g. resized copies from an earlier run).
    const referenced = new Set<string>();
    for (const p of await db.select({ content: posts.content, coverImage: posts.coverImage }).from(posts)) {
      for (const m of `${p.content} ${p.coverImage ?? ""}`.matchAll(/\/uploads\/([^"'\s)<>?#]+)/g)) referenced.add(decodeURIComponent(m[1]));
    }
    const orphans = (await db.select({ id: media.id, path: media.path, uploadedBy: media.uploadedBy }).from(media)).filter(
      (m) => m.uploadedBy === null && !m.path.startsWith("avatars/") && !referenced.has(m.path),
    );
    for (const m of orphans) {
      await db.delete(media).where(eq(media.id, m.id));
      await unlink(path.resolve(UPLOAD_DIR, m.path)).catch(() => undefined);
    }
    if (orphans.length) console.log(`Removed ${orphans.length} unused migrated files.`);

    for (const a of await db.select().from(authors)) {
      if (!a.avatarUrl || a.avatarUrl.startsWith("/uploads/")) continue;
      const rel = `avatars/${a.slug}.jpg`;
      try {
        await download(a.avatarUrl.replace(/([?&])s=\d+/, "$1s=192"), rel);
        await db.update(authors).set({ avatarUrl: toUrl(rel) }).where(eq(authors.id, a.id));
      } catch (err) {
        failed.set(rel, err instanceof Error ? err.message : String(err));
      }
    }

    if (gone.length) console.log(`Removed ${gone.length} images that no longer exist on WordPress either.`);
    const stillRemote = [...failed].filter(([, why]) => why !== "404");
    if (stillRemote.length) {
      console.log(`\n${stillRemote.length} files could not be copied and still point at WordPress:`);
      for (const [rel, why] of stillRemote) console.log(`  ${rel} (${why})`);
      process.exitCode = 1;
    } else {
      console.log("All media is now served locally.");
    }
  } finally {
    await connection.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
