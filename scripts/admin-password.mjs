import { randomBytes, scryptSync } from "node:crypto";
import { createInterface } from "node:readline";
import { Writable } from "node:stream";
let muted = false;
const output = new Writable({
  write(chunk, encoding, callback) {
    if (!muted) process.stdout.write(chunk, encoding);
    callback();
  },
});
const rl = createInterface({ input: process.stdin, output, terminal: true });
process.stdout.write(
  "Choose an admin password (at least 12 characters). Input is hidden.\nPassword: ",
);
muted = true;
rl.question("", (password) => {
  muted = false;
  rl.close();
  process.stdout.write("\n");
  if (password.length < 12 || password.length > 256) {
    console.error("Use between 12 and 256 characters.");
    process.exitCode = 1;
    return;
  }
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  console.log(
    "Add this value as ADMIN_PASSWORD_HASH in Vercel. Keep the password private.\n" +
      salt +
      ":" +
      hash,
  );
});
