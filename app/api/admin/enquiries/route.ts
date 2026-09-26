import {
  authorize,
  jsonBody,
  json,
  failure,
  HttpError,
} from "@/lib/admin-http";
import { registrationDb } from "@/db/registrations";
export async function GET(request: Request) {
  try {
    await authorize(request);
    const url = new URL(request.url);
    const page = Math.max(
      1,
      Math.min(100000, Math.floor(Number(url.searchParams.get("page")) || 1)),
    );
    const search = (url.searchParams.get("q") || "").slice(0, 150);
    const filter = url.searchParams.get("status") || "all";
    const where =
      "WHERE (r.name LIKE ? OR r.email LIKE ? OR r.student_class LIKE ?) AND (?='all' OR COALESCE(n.status,'new')=?)";
    const args = [
      "%" + search + "%",
      "%" + search + "%",
      "%" + search + "%",
      filter,
      filter,
    ];
    const result = await registrationDb().batch(
      [
        {
          sql:
            "SELECT r.*,COALESCE(n.status,'new') AS status,COALESCE(n.notes,'') AS notes FROM registrations r LEFT JOIN enquiry_notes n ON n.registration_id=r.id " +
            where +
            " ORDER BY r.created_at DESC LIMIT 25 OFFSET ?",
          args: [...args, (page - 1) * 25],
        },
        {
          sql:
            "SELECT COUNT(*) AS total FROM registrations r LEFT JOIN enquiry_notes n ON n.registration_id=r.id " +
            where,
          args,
        },
        "SELECT COUNT(*) AS total, SUM(CASE WHEN COALESCE(n.status,'new')='new' THEN 1 ELSE 0 END) AS fresh FROM registrations r LEFT JOIN enquiry_notes n ON n.registration_id=r.id",
      ],
      "read",
    );
    return json({
      enquiries: result[0].rows,
      total: Number(result[1].rows[0].total),
      all: Number(result[2].rows[0].total),
      fresh: Number(result[2].rows[0].fresh),
      page,
    });
  } catch (e) {
    return failure(e);
  }
}
export async function PATCH(request: Request) {
  try {
    await authorize(request);
    const body = await jsonBody(request, 8000);
    if (
      typeof body.id !== "string" ||
      !/^[a-f0-9-]{36}$/i.test(body.id) ||
      !["new", "contacted", "enrolled", "archived"].includes(body.status) ||
      typeof body.notes !== "string" ||
      body.notes.length > 2000
    )
      throw new HttpError(
        400,
        "Please use a valid status and notes of up to 2,000 characters.",
      );
    const result = await registrationDb().execute({
      sql: "INSERT INTO enquiry_notes (registration_id,status,notes) SELECT id,?,? FROM registrations WHERE id=? ON CONFLICT(registration_id) DO UPDATE SET status=excluded.status,notes=excluded.notes",
      args: [body.status, body.notes, body.id],
    });
    if (!result.rowsAffected) throw new HttpError(404, "Enquiry not found.");
    return json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
