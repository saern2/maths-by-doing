import { createClient, type Client } from "@libsql/client";

// Turso / libSQL replaces the Cloudflare D1 binding used by the original
// ChatGPT Sites deployment. Set these in Vercel > Settings > Environment
// Variables (the Turso marketplace integration injects them automatically).
//   TURSO_DATABASE_URL  e.g. libsql://maths-by-doing-<org>.turso.io
//   TURSO_AUTH_TOKEN    database auth token
// For local development you can point at a file: TURSO_DATABASE_URL=file:local.db

let client: Client | undefined;
let schemaReady: Promise<void> | undefined;

export function registrationDb(): Client {
  const url = process.env.TURSO_DATABASE_URL;
  if (!url) throw new Error("Registration storage unavailable: TURSO_DATABASE_URL is not set");
  client ??= createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
  return client;
}

// Same table as drizzle/0000_wide_vin_gonzales.sql, created on first use so a
// fresh Turso database needs no manual migration step.
export function ensureRegistrationSchema(): Promise<void> {
  schemaReady ??= registrationDb()
    .execute(
      "CREATE TABLE IF NOT EXISTS registrations (id text PRIMARY KEY NOT NULL, name text NOT NULL, email text NOT NULL, student_class text NOT NULL, created_at text NOT NULL)",
    )
    .then(() => undefined)
    .catch((error) => {
      schemaReady = undefined;
      throw error;
    });
  return schemaReady;
}
