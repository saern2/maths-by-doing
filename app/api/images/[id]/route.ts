import { registrationDb } from "@/db/registrations";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!/^[a-f0-9-]{36}$/i.test(id)) return new Response(null, { status: 404 });
  try {
    const { rows } = await registrationDb().execute({
      sql: "SELECT mime,data FROM site_images WHERE id=?",
      args: [id],
    });
    const row = rows[0];
    if (!row) return new Response(null, { status: 404 });
    return new Response(new Uint8Array(row.data as ArrayBuffer), {
      headers: {
        "Content-Type": String(row.mime),
        "Cache-Control": "public,max-age=31536000,immutable",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'",
      },
    });
  } catch {
    return new Response(null, { status: 503 });
  }
}
