import { test } from "node:test";
import assert from "node:assert/strict";
import { scryptSync, timingSafeEqual } from "node:crypto";
import { readAdminConfig } from "../lib/admin-config.ts";
const salt = "0123456789abcdef0123456789abcdef";
const password = "isolated-config-test-password";
const hash = salt + ":" + scryptSync(password, salt, 64).toString("hex");
test("clean generated configuration is accepted", () => {
  const c = readAdminConfig({
    ADMIN_EMAIL: "mathsbydoing@gmail.com",
    ADMIN_PASSWORD_HASH: hash,
  });
  assert(c.configured);
  assert.deepEqual(c.issues, []);
});
test("dashboard whitespace, quotes and pasted assignments are normalized", () => {
  for (const value of [
    hash + "\n",
    "  " + hash + "\r\n",
    '"' + hash + '"',
    "'" + hash + "'",
    "ADMIN_PASSWORD_HASH=" + hash,
    'ADMIN_PASSWORD_HASH="' + hash + '"',
    hash.slice(0, 60) + "\n" + hash.slice(60),
  ]) {
    const c = readAdminConfig({
      ADMIN_EMAIL: ' ADMIN_EMAIL="MathsByDoing@gmail.com"\r\n',
      ADMIN_PASSWORD_HASH: value,
    });
    assert(c.configured);
    assert.equal(c.email, "mathsbydoing@gmail.com");
    assert.equal(c.passwordHash, hash);
    const [s, h] = c.passwordHash.split(":");
    assert(timingSafeEqual(scryptSync(password, s, 64), Buffer.from(h, "hex")));
  }
});
test("missing variables are named without leaking values", () => {
  assert.deepEqual(readAdminConfig({}).issues, [
    "ADMIN_EMAIL is missing from this deployment.",
    "ADMIN_PASSWORD_HASH is missing from this deployment.",
  ]);
  const c = readAdminConfig({ ADMIN_EMAIL: "teacher@example.com" });
  assert.equal(c.issues.length, 1);
  assert.match(c.issues[0], /ADMIN_PASSWORD_HASH is missing/);
});
test("plain passwords and invalid emails never enable login", () => {
  const secret = "do-not-expose-this-value";
  const c = readAdminConfig({
    ADMIN_EMAIL: "invalid",
    ADMIN_PASSWORD_HASH: secret,
  });
  assert(!c.configured);
  assert.equal(c.issues.length, 2);
  assert(!c.issues.join().includes(secret));
});
test("there are no default credentials or alternate plaintext password fallbacks", () => {
  assert(!readAdminConfig({ ADMIN_PASSWORD: password }).configured);
  assert(
    !readAdminConfig({
      ADMIN_EMAIL: "teacher@example.com",
      ADMIN_PASSWORD_HASH: "a".repeat(161),
    }).configured,
  );
});
