import "server-only";
import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { registrationDb } from "@/db/registrations";
import { ensureAdminSchema } from "@/db/admin";
const derive = promisify(scrypt);
export const cookieName = "maths_admin_session";
export const sessionAge = 8 * 60 * 60;
export const digest = (v: string) =>
  createHash("sha256").update(v).digest("hex");
export function authConfigured() {
  return (
    !!process.env.ADMIN_EMAIL &&
    /^[a-f0-9]{32}:[a-f0-9]{128}$/.test(process.env.ADMIN_PASSWORD_HASH || "")
  );
}
function credentialVersion() {
  return digest(
    process.env.ADMIN_EMAIL + "|" + process.env.ADMIN_PASSWORD_HASH,
  );
}
export async function verifyPassword(email: string, password: string) {
  if (!authConfigured()) return false;
  const [salt, hash] = process.env.ADMIN_PASSWORD_HASH!.split(":");
  const actual = (await derive(password, salt, 64)) as Buffer;
  return (
    timingSafeEqual(actual, Buffer.from(hash, "hex")) &&
    email.toLowerCase().trim() === process.env.ADMIN_EMAIL!.toLowerCase().trim()
  );
}
export async function authenticated() {
  if (!authConfigured()) return false;
  const token = (await cookies()).get(cookieName)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return false;
  await ensureAdminSchema();
  const { rows } = await registrationDb().execute({
    sql: "SELECT expires_at,credential_version FROM admin_sessions WHERE token_hash=?",
    args: [digest(token)],
  });
  return (
    !!rows[0] &&
    Number(rows[0].expires_at) > Date.now() &&
    rows[0].credential_version === credentialVersion()
  );
}
export async function createSession() {
  const token = randomBytes(32).toString("hex");
  await registrationDb().batch(
    [
      {
        sql: "DELETE FROM admin_sessions WHERE expires_at < ?",
        args: [Date.now()],
      },
      {
        sql: "INSERT INTO admin_sessions (token_hash,expires_at,credential_version) VALUES (?,?,?)",
        args: [
          digest(token),
          Date.now() + sessionAge * 1000,
          credentialVersion(),
        ],
      },
    ],
    "write",
  );
  return token;
}
export async function revokeSession() {
  const token = (await cookies()).get(cookieName)?.value;
  if (token)
    await registrationDb().execute({
      sql: "DELETE FROM admin_sessions WHERE token_hash=?",
      args: [digest(token)],
    });
}
export async function allowLogin(ip: string) {
  await ensureAdminSchema();
  const now = Date.now();
  const results = await registrationDb().batch(
    [digest(ip), "account"].map((key) => ({
      sql: "INSERT INTO admin_login_limits (key,attempts,reset_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN reset_at<=? THEN 1 ELSE attempts+1 END, reset_at=CASE WHEN reset_at<=? THEN excluded.reset_at ELSE reset_at END RETURNING attempts",
      args: [key, now + 15 * 60 * 1000, now, now],
    })),
    "write",
  );
  return (
    Number(results[0].rows[0].attempts) <= 10 &&
    Number(results[1].rows[0].attempts) <= 60
  );
}
