import { randomUUID } from "node:crypto";
import {
  authorize,
  limitedBody,
  json,
  failure,
  HttpError,
} from "@/lib/admin-http";
import { registrationDb } from "@/db/registrations";
export async function POST(request: Request) {
  try {
    await authorize(request);
    const data = await limitedBody(request, 1024 * 1024);
    let mime = "";
    if (
      data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    )
      mime = "image/png";
    else if (data[0] === 255 && data[1] === 216 && data[2] === 255)
      mime = "image/jpeg";
    else if (
      data.toString("ascii", 0, 4) === "RIFF" &&
      data.toString("ascii", 8, 12) === "WEBP"
    )
      mime = "image/webp";
    if (!mime)
      throw new HttpError(400, "Upload a PNG, JPEG, or WebP image under 1 MB.");
    const id = randomUUID();
    await registrationDb().execute({
      sql: "INSERT INTO site_images (id,mime,data) VALUES (?,?,?)",
      args: [id, mime, new Uint8Array(data)],
    });
    return json({ url: "/api/images/" + id });
  } catch (e) {
    return failure(e);
  }
}
