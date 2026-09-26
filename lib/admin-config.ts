type AdminEnvironment = Record<string, string | undefined>;

function cleanValue(value: string | undefined, name: string) {
  let cleaned = (value || "").trim();
  // Tolerate pasting an entire NAME=value line into a dashboard value field.
  if (cleaned.startsWith(name + "="))
    cleaned = cleaned.slice(name.length + 1).trim();
  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  return cleaned;
}

/** Server-side configuration. Never send this object or its hash to the browser. */
export function readAdminConfig(environment: AdminEnvironment) {
  const email = cleanValue(
    environment.ADMIN_EMAIL,
    "ADMIN_EMAIL",
  ).toLowerCase();
  // The generated hexadecimal salt/hash has no meaningful whitespace.
  const passwordHash = cleanValue(
    environment.ADMIN_PASSWORD_HASH,
    "ADMIN_PASSWORD_HASH",
  ).replace(/\s/g, "");
  const issues: string[] = [];
  if (!email) issues.push("ADMIN_EMAIL is missing from this deployment.");
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    issues.push("ADMIN_EMAIL is not a valid email address.");
  if (!passwordHash)
    issues.push("ADMIN_PASSWORD_HASH is missing from this deployment.");
  else if (!/^[a-f0-9]{32}:[a-f0-9]{128}$/.test(passwordHash)) {
    issues.push(
      "ADMIN_PASSWORD_HASH has an invalid format. Use the generated salt:hash value, not the sign-in password.",
    );
  }
  return { email, passwordHash, issues, configured: issues.length === 0 };
}
