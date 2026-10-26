import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { resolveUploadPath } from "@/lib/media/storage";

const TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
};

export async function GET(_request: Request, { params }: RouteContext<"/uploads/[...path]">) {
  const segments = (await params).path;
  let file: string;
  try {
    file = resolveUploadPath(segments.map((s) => decodeURIComponent(s)).join("/"));
  } catch {
    return new Response("Not found", { status: 404 });
  }

  const type = TYPES[path.extname(file).toLowerCase()];
  const info = await stat(file).catch(() => null);
  if (!type || !info?.isFile()) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(await readFile(file)), {
    headers: {
      "Content-Type": type,
      "Content-Length": String(info.size),
      // Filenames are never reused, so the bytes behind a URL never change.
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      // SVGs can carry script; never let one run as a page.
      ...(type === "image/svg+xml" ? { "Content-Security-Policy": "script-src 'none'; sandbox" } : {}),
    },
  });
}
