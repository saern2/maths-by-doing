import "server-only";
import { ensureRegistrationSchema, registrationDb } from "./registrations";
import { contentSchema, defaultContent } from "@/lib/site-content";
let ready: Promise<void> | undefined;
export function ensureAdminSchema() {
  ready ??= (async () => {
    await ensureRegistrationSchema();
    await registrationDb().batch(
      [
        "CREATE TABLE IF NOT EXISTS site_content (id INTEGER PRIMARY KEY CHECK(id=1), data TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL)",
        "CREATE TABLE IF NOT EXISTS admin_sessions (token_hash TEXT PRIMARY KEY, expires_at INTEGER NOT NULL, credential_version TEXT NOT NULL)",
        "CREATE TABLE IF NOT EXISTS admin_login_limits (key TEXT PRIMARY KEY, attempts INTEGER NOT NULL, reset_at INTEGER NOT NULL)",
        "CREATE TABLE IF NOT EXISTS enquiry_notes (registration_id TEXT PRIMARY KEY, status TEXT NOT NULL DEFAULT 'new', notes TEXT NOT NULL DEFAULT '')",
        "CREATE TABLE IF NOT EXISTS site_images (id TEXT PRIMARY KEY, mime TEXT NOT NULL, data BLOB NOT NULL)",
        {
          sql: "INSERT OR IGNORE INTO site_content (id,data,revision,updated_at) VALUES (1,?,0,?)",
          args: [JSON.stringify(defaultContent), new Date().toISOString()],
        },
      ],
      "write",
    );
  })().catch((e) => {
    ready = undefined;
    throw e;
  });
  return ready;
}
export async function readContent() {
  await ensureAdminSchema();
  const { rows } = await registrationDb().execute(
    "SELECT data,revision,updated_at FROM site_content WHERE id=1",
  );
  return {
    content: contentSchema.parse(JSON.parse(String(rows[0].data))),
    revision: Number(rows[0].revision),
    updatedAt: String(rows[0].updated_at),
  };
}
export async function publicContent() {
  if (!process.env.TURSO_DATABASE_URL) return defaultContent;
  try {
    return (await readContent()).content;
  } catch {
    console.error("Site content unavailable; displaying bundled content.");
    return defaultContent;
  }
}
