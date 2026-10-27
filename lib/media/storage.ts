import "server-only";
import { mkdir, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import sharp, { type Metadata } from "sharp";
import { db } from "../db/client";
import { media } from "../db/schema";
import { slugify } from "../content/sanitize";

// The standalone server (`node .next/standalone/server.js`) chdirs into its own folder, so a
// cwd-relative default would point inside the build. Step back out to the project root.
function projectRoot() {
  const cwd = /*turbopackIgnore: true*/ process.cwd();
  return path.basename(cwd) === "standalone" && path.basename(path.dirname(cwd)) === ".next" ? path.resolve(cwd, "../..") : cwd;
}

/**
 * Where uploaded files live: UPLOAD_DIR, or storage/uploads in the project. Outside the build
 * output so uploads survive deploys; back this folder up. The ignore comment stops the bundler
 * tracing (and shipping) the folder with the server code.
 */
export const UPLOAD_DIR = path.resolve(/*turbopackIgnore: true*/ process.env.UPLOAD_DIR ?? path.join(projectRoot(), "storage", "uploads"));
export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
const MAX_WIDTH = 2400;

const FORMATS = {
  jpeg: { ext: "jpg", mime: "image/jpeg" },
  png: { ext: "png", mime: "image/png" },
  webp: { ext: "webp", mime: "image/webp" },
  avif: { ext: "avif", mime: "image/avif" },
  gif: { ext: "gif", mime: "image/gif" },
} as const;

export type MediaItem = {
  id: number;
  url: string;
  path: string;
  mime: string;
  size: number;
  width: number | null;
  height: number | null;
  alt: string | null;
  createdAt: string;
};

export const mediaUrl = (relPath: string) => `/uploads/${relPath.split("/").map(encodeURIComponent).join("/")}`;

export function toMediaItem(row: typeof media.$inferSelect): MediaItem {
  return {
    id: row.id,
    url: mediaUrl(row.path),
    path: row.path,
    mime: row.mime,
    size: row.size,
    width: row.width,
    height: row.height,
    alt: row.alt,
    createdAt: row.createdAt.toISOString(),
  };
}

/** Resolves a public relative path inside UPLOAD_DIR, refusing anything that escapes it. */
export function resolveUploadPath(relPath: string) {
  const full = path.resolve(UPLOAD_DIR, relPath);
  if (!full.startsWith(UPLOAD_DIR + path.sep)) throw new Error("Invalid upload path");
  return full;
}

async function exists(file: string) {
  return stat(file).then(
    () => true,
    () => false,
  );
}

/**
 * Validates an uploaded image by decoding it (the browser's MIME type is not trusted),
 * normalises orientation and size, and stores it under yyyy/mm/.
 */
export async function saveImage(input: { buffer: Buffer; filename: string; alt?: string | null; uploadedBy: number | null }) {
  if (input.buffer.byteLength > MAX_UPLOAD_BYTES) throw new Error("Images must be 15 MB or smaller.");

  let meta: Metadata;
  try {
    meta = await sharp(input.buffer).metadata();
  } catch {
    throw new Error("That file isn't an image we can read.");
  }
  const format = meta.format && meta.format in FORMATS ? FORMATS[meta.format as keyof typeof FORMATS] : null;
  if (!format) throw new Error("Upload a JPEG, PNG, WebP, AVIF or GIF image.");

  let output = input.buffer;
  let width = meta.width ?? null;
  let height = meta.height ?? null;
  if (meta.format !== "gif") {
    const pipeline = sharp(input.buffer).rotate().resize({ width: MAX_WIDTH, withoutEnlargement: true });
    const encoded =
      meta.format === "jpeg"
        ? pipeline.jpeg({ quality: 84, mozjpeg: true })
        : meta.format === "png"
          ? pipeline.png({ compressionLevel: 9 })
          : meta.format === "webp"
            ? pipeline.webp({ quality: 84 })
            : pipeline.avif({ quality: 60 });
    const { data, info } = await encoded.toBuffer({ resolveWithObject: true });
    output = data;
    width = info.width;
    height = info.height;
  }

  const now = new Date();
  const dir = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const base = slugify(input.filename.replace(/\.[^.]+$/, "")).slice(0, 80) || "image";
  let relPath = `${dir}/${base}.${format.ext}`;
  for (let n = 2; await exists(resolveUploadPath(relPath)); n++) relPath = `${dir}/${base}-${n}.${format.ext}`;

  const full = resolveUploadPath(relPath);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, output);

  const [{ id }] = await db
    .insert(media)
    .values({
      path: relPath,
      mime: format.mime,
      size: output.byteLength,
      width,
      height,
      alt: input.alt?.slice(0, 255) || null,
      uploadedBy: input.uploadedBy,
      createdAt: now,
    })
    .$returningId();
  const [row] = await db.select().from(media).where(eq(media.id, id));
  return toMediaItem(row);
}

export async function deleteMediaFile(relPath: string) {
  await unlink(resolveUploadPath(relPath)).catch(() => undefined);
}
