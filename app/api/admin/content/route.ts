import {
  authorize,
  jsonBody,
  json,
  failure,
  HttpError,
} from "@/lib/admin-http";
import { readContent } from "@/db/admin";
import { registrationDb } from "@/db/registrations";
import { contentSchema } from "@/lib/site-content";
export async function GET(request: Request) {
  try {
    await authorize(request);
    return json(await readContent());
  } catch (e) {
    return failure(e);
  }
}
export async function PUT(request: Request) {
  try {
    await authorize(request);
    const body = await jsonBody(request);
    const parsed = contentSchema.safeParse(body.content);
    if (!parsed.success)
      throw new HttpError(
        400,
        parsed.error.issues
          .map((i) => i.path.join(".") + ": " + i.message)
          .slice(0, 3)
          .join(" · "),
      );
    if (!Number.isSafeInteger(body.revision) || body.revision < 0)
      throw new HttpError(400, "Reload the editor before publishing.");
    const updatedAt = new Date().toISOString();
    const result = await registrationDb().execute({
      sql: "UPDATE site_content SET data=?,revision=revision+1,updated_at=? WHERE id=1 AND revision=?",
      args: [JSON.stringify(parsed.data), updatedAt, body.revision],
    });
    if (!result.rowsAffected)
      throw new HttpError(
        409,
        "The website was updated in another tab. Reload before editing to avoid overwriting those changes.",
      );
    return json({
      content: parsed.data,
      revision: body.revision + 1,
      updatedAt,
    });
  } catch (e) {
    return failure(e);
  }
}
