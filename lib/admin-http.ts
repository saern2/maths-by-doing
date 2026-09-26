import { sameOrigin } from "@/lib/same-origin";
import "server-only";
import { authenticated } from "./admin-auth";
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function authorize(request: Request) {
  if (request.method !== "GET" && !sameOrigin(request))
    throw new HttpError(403, "Please use the admin panel on this website.");
  if (!(await authenticated()))
    throw new HttpError(401, "Your session has ended. Please sign in again.");
}
export async function limitedBody(request: Request, max: number) {
  if (Number(request.headers.get("content-length") || 0) > max)
    throw new HttpError(413, "This file or form is too large.");
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, "Empty request.");
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.length;
    if (length > max) {
      await reader.cancel();
      throw new HttpError(413, "This file or form is too large.");
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}
export async function jsonBody(request: Request, max = 250000) {
  try {
    const data = JSON.parse((await limitedBody(request, max)).toString("utf8"));
    if (!data || typeof data !== "object" || Array.isArray(data)) throw new HttpError(400, "Please submit a valid form.");
    return data;
  } catch (e) {
    if (e instanceof HttpError) throw e;
    throw new HttpError(400, "Please submit a valid form.");
  }
}
export function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}
export function failure(e: unknown) {
  if (e instanceof HttpError) return json({ error: e.message }, e.status);
  console.error("Admin operation failed. Check database configuration.");
  return json(
    {
      error:
        "Unable to complete this request. Please try again. If it continues, ask the site owner to check the database connection.",
    },
    503,
  );
}
