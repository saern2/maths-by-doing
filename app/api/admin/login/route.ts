import { sameOrigin } from "@/lib/same-origin";
import { NextResponse } from "next/server";
import {
  allowLogin,
  authConfigured,
  verifyPassword,
  createSession,
  cookieName,
  sessionAge,
} from "@/lib/admin-auth";
import { jsonBody, json, failure, HttpError } from "@/lib/admin-http";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    if (!sameOrigin(request))
      throw new HttpError(403, "Please sign in from this website.");
    if (!authConfigured())
      return json(
        {
          error:
            "Admin sign-in has not been configured. Ask the site owner to follow ADMIN-SETUP.md.",
        },
        503,
      );
    const body = await jsonBody(request, 4096);
    if (
      typeof body.email !== "string" ||
      typeof body.password !== "string" ||
      body.email.length > 254 ||
      body.password.length > 256
    )
      throw new HttpError(400, "Please enter your email and password.");
    const ip =
      request.headers.get("x-vercel-forwarded-for") ||
      request.headers.get("x-forwarded-for")?.split(",")[0] ||
      "unknown";
    if (!(await allowLogin(ip)))
      return json(
        {
          error:
            "Too many sign-in attempts. Please wait 15 minutes and try again.",
        },
        429,
      );
    if (!(await verifyPassword(body.email, body.password)))
      return json({ error: "Email or password is incorrect." }, 401);
    const token = await createSession();
    const response = NextResponse.json(
      { ok: true },
      { headers: { "Cache-Control": "no-store" } },
    );
    response.cookies.set(cookieName, token, {
      httpOnly: true,
      secure:
        process.env.VERCEL === "1" ||
        request.headers.get("origin")?.startsWith("https://") === true,
      sameSite: "strict",
      path: "/",
      maxAge: sessionAge,
    });
    return response;
  } catch (e) {
    return failure(e);
  }
}
