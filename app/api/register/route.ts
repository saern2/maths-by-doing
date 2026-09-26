import { readContent } from "@/db/admin";
import { sameOrigin } from "@/lib/same-origin";
import { ensureRegistrationSchema, registrationDb } from "@/db/registrations";
import { z } from "zod";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const schema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254),
  studentClass: z.string().trim().min(1).max(80),
  website: z.string().max(0).optional(),
});
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && !sameOrigin(request))
    return Response.json(
      { error: "Please submit from this website." },
      { status: 403 },
    );
  if (Number(request.headers.get("content-length") || 0) > 4096)
    return Response.json({ error: "Form is too large." }, { status: 413 });
  let value;
  try {
    const body = await request.text();
    if (body.length > 4096)
      return Response.json({ error: "Form is too large." }, { status: 413 });
    value = schema.safeParse(JSON.parse(body));
  } catch {
    return Response.json(
      { error: "Please check your form and try again." },
      { status: 400 },
    );
  }
  if (!value.success)
    return Response.json(
      { error: "Please enter a valid name, email and class." },
      { status: 400 },
    );
  try {
    const d = value.data;
    const { content } = await readContent();
    if (!content.registrationClasses.includes(d.studentClass))
      return Response.json(
        {
          error:
            "This class is no longer available. Refresh the page and choose a current class.",
        },
        { status: 400 },
      );
    await ensureRegistrationSchema();
    await registrationDb().execute({
      sql: "INSERT INTO registrations (id,name,email,student_class,created_at) VALUES (?,?,?,?,?) ON CONFLICT(id) DO NOTHING",
      args: [d.id, d.name, d.email, d.studentClass, new Date().toISOString()],
    });
    return Response.json(
      { id: d.id, status: "saved" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error(
      "Registration could not be saved",
      error instanceof Error ? error.message : error,
    );
    return Response.json(
      {
        error:
          "We could not save your enquiry. Please try again or contact Arslan on WhatsApp.",
      },
      { status: 503 },
    );
  }
}
