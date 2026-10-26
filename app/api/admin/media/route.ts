import { listMedia } from "@/lib/admin/queries";
import { getSessionUser } from "@/lib/auth/session";
import { saveImage } from "@/lib/media/storage";

const unauthorized = () => Response.json({ error: "Not signed in" }, { status: 401 });

export async function GET(request: Request) {
  if (!(await getSessionUser())) return unauthorized();
  const url = new URL(request.url);
  const result = await listMedia({ page: Number(url.searchParams.get("page")) || 1, q: url.searchParams.get("q") ?? undefined });
  return Response.json(result);
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File) || file.size === 0) return Response.json({ error: "Choose an image to upload." }, { status: 400 });

  try {
    const item = await saveImage({
      buffer: Buffer.from(await file.arrayBuffer()),
      filename: file.name,
      alt: String(form?.get("alt") ?? "") || null,
      uploadedBy: user.id,
    });
    return Response.json(item, { status: 201 });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "Upload failed." }, { status: 400 });
  }
}
