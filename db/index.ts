import { drizzle } from "drizzle-orm/libsql";
import { registrationDb } from "./registrations";
import * as schema from "./schema";

export function getDb() {
  return drizzle(registrationDb(), { schema });
}
