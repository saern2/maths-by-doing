import { NextResponse } from "next/server";
import { revokeSession, cookieName } from "@/lib/admin-auth";
import { authorize, failure } from "@/lib/admin-http";
export async function POST(request: Request) {
  try {
    await authorize(request);
    await revokeSession();
    const response = NextResponse.json({ ok: true });
    response.cookies.set(cookieName, "", {
      httpOnly: true,
      sameSite: "strict",
      secure:
        process.env.VERCEL === "1" ||
        request.headers.get("origin")?.startsWith("https://") === true,
      path: "/",
      maxAge: 0,
    });
    return response;
  } catch (e) {
    return failure(e);
  }
}
