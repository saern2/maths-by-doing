import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomBytes, scryptSync, randomUUID, createHash } from "node:crypto";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@libsql/client";
const port = Number(process.env.ADMIN_TEST_PORT || 3097),
  base = "http://127.0.0.1:" + port;
const email = "teacher@example.test",
  password = randomBytes(20).toString("hex"),
  salt = randomBytes(16).toString("hex");
const hash = salt + ":" + scryptSync(password, salt, 64).toString("hex");
mkdirSync("outputs", { recursive: true });
const database = path.resolve("outputs", "admin-test-" + randomUUID() + ".db");
const db = createClient({ url: "file:" + database.replaceAll("\\", "/") });
let log = "";
const server = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "start",
    "--hostname",
    "127.0.0.1",
    "--port",
    String(port),
  ],
  {
    env: {
      ...process.env,
      TURSO_DATABASE_URL: "file:" + database.replaceAll("\\", "/"),
      TURSO_AUTH_TOKEN: "",
      ADMIN_EMAIL: email,
      ADMIN_PASSWORD_HASH: hash,
    },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  },
);
server.stdout.on("data", (d) => (log += d));
server.stderr.on("data", (d) => (log += d));
let cookie = "",
  passed = 0;
async function request(
  route,
  { method = "GET", body, auth = true, origin = base, raw = false } = {},
) {
  const headers = {};
  if (auth && cookie) headers.Cookie = cookie;
  if (method !== "GET") headers.Origin = origin;
  if (body && !raw) headers["Content-Type"] = "application/json";
  return fetch(base + route, {
    method,
    headers,
    body: body ? (raw ? body : JSON.stringify(body)) : undefined,
    redirect: "manual",
  });
}
async function check(name, fn) {
  await fn();
  console.log("PASS " + name);
  passed++;
}
try {
  let ready = false;
  for (let i = 0; i < 120; i++) {
    if (server.exitCode !== null) throw new Error("Test server exited: " + log);
    try {
      const r = await fetch(base + "/admin");
      if (r.status === 200) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  assert(ready, "Server startup timed out: " + log);
  await check("anonymous visitors cannot access any admin API", async () => {
    for (const route of ["content", "enquiries"])
      assert.equal(
        (await request("/api/admin/" + route, { auth: false })).status,
        401,
      );
    assert.equal(
      (
        await request("/api/admin/images", {
          method: "POST",
          body: "not an image",
          raw: true,
          auth: false,
        })
      ).status,
      401,
    );
  });
  await check(
    "cross-site sign-in and incorrect credentials are rejected",
    async () => {
      assert.equal(
        (
          await request("/api/admin/login", {
            method: "POST",
            origin: "https://attacker.test",
            body: { email, password },
          })
        ).status,
        403,
      );
      assert.equal(
        (
          await request("/api/admin/login", {
            method: "POST",
            body: { email, password: "wrong-password" },
          })
        ).status,
        401,
      );
    },
  );
  await check(
    "valid sign-in creates a private, server-side session",
    async () => {
      const r = await request("/api/admin/login", {
        method: "POST",
        body: { email, password },
      });
      assert.equal(r.status, 200);
      const set = r.headers.get("set-cookie");
      assert.match(set, /HttpOnly/i);
      assert.match(set, /SameSite=strict/i);
      cookie = set.split(";")[0];
      const stored = await db.execute("SELECT token_hash FROM admin_sessions");
      assert.notEqual(stored.rows[0].token_hash, cookie.split("=")[1]);
    },
  );
  let snapshot;
  await check("existing website content is seeded and readable", async () => {
    const r = await request("/api/admin/content");
    assert.equal(r.status, 200);
    snapshot = await r.json();
    assert.equal(snapshot.content.text.brand, "Maths by Doing");
    assert(snapshot.content.lessons.length >= 24);
    const legacy = structuredClone(snapshot.content);
    delete legacy.registrationClasses;
    await db.execute({
      sql: "UPDATE site_content SET data=? WHERE id=1",
      args: [JSON.stringify(legacy)],
    });
    const compatible = await (await request("/api/admin/content")).json();
    assert.deepEqual(
      compatible.content.registrationClasses,
      snapshot.content.registrationClasses,
    );
    assert.deepEqual(compatible.content.text, legacy.text);
  });
  await check(
    "cross-site publishing, script URLs, duplicate lessons and large requests are rejected",
    async () => {
      assert.equal(
        (
          await request("/api/admin/content", {
            method: "PUT",
            origin: "https://attacker.test",
            body: snapshot,
          })
        ).status,
        403,
      );
      const invalid = structuredClone(snapshot);
      invalid.content.images.logo = "javascript:alert(1)";
      assert.equal(
        (await request("/api/admin/content", { method: "PUT", body: invalid }))
          .status,
        400,
      );
      invalid.content = snapshot.content;
      const dup = structuredClone(snapshot);
      dup.content.lessons.push(dup.content.lessons[0]);
      assert.equal(
        (await request("/api/admin/content", { method: "PUT", body: dup }))
          .status,
        400,
      );
      assert.equal(
        (
          await request("/api/admin/content", {
            method: "PUT",
            body: { data: "x".repeat(260000) },
          })
        ).status,
        413,
      );
    },
  );
  await check(
    "publishing persists content and public page renders it safely",
    async () => {
      snapshot.content.text.heroLine1 = "A clearer path to maths.";
      snapshot.content.text.about1 =
        '<script>alert("test")</script> Teaching maths.';
      const r = await request("/api/admin/content", {
        method: "PUT",
        body: snapshot,
      });
      assert.equal(r.status, 200);
      const saved = await r.json();
      assert.equal(saved.revision, snapshot.revision + 1);
      const home = await (await request("/")).text();
      assert(home.includes("A clearer path to maths."));
      assert(!home.includes('<script>alert("test")</script>'));
      assert.equal(
        (await request("/api/admin/content", { method: "PUT", body: snapshot }))
          .status,
        409,
      );
      snapshot = saved;
    },
  );
  await check(
    "registration options persist, accept additions and reject removed or duplicate options",
    async () => {
      const original = structuredClone(snapshot.content);
      for (const registrationClasses of [[], ["Class 6", "class 6"]]) {
        assert.equal(
          (
            await request("/api/admin/content", {
              method: "PUT",
              body: {
                ...snapshot,
                content: { ...snapshot.content, registrationClasses },
              },
            })
          ).status,
          400,
        );
      }
      snapshot.content.registrationClasses =
        snapshot.content.registrationClasses
          .filter((c) => c !== "Class 6")
          .concat("IB Mathematics");
      let response = await request("/api/admin/content", {
        method: "PUT",
        body: snapshot,
      });
      assert.equal(response.status, 200);
      snapshot = await response.json();
      const persisted = await (await request("/api/admin/content")).json();
      assert(persisted.content.registrationClasses.includes("IB Mathematics"));
      assert(!persisted.content.registrationClasses.includes("Class 6"));
      for (const [studentClass, expected] of [
        ["IB Mathematics", 200],
        ["Class 6", 400],
      ]) {
        assert.equal(
          (
            await request("/api/register", {
              method: "POST",
              auth: false,
              body: {
                id: randomUUID(),
                name: "Dropdown Test",
                email: "dropdown@example.test",
                studentClass,
              },
            })
          ).status,
          expected,
        );
      }
      response = await request("/api/admin/content", {
        method: "PUT",
        body: { ...snapshot, content: original },
      });
      assert.equal(response.status, 200);
      snapshot = await response.json();
    },
  );
  await check(
    "registration remains idempotent and admin can manage private enquiry notes",
    async () => {
      const id = randomUUID(),
        body = {
          id,
          name: "QA Student",
          email: "qa@example.test",
          studentClass: "Class 9",
          website: "",
        };
      for (let i = 0; i < 2; i++)
        assert.equal(
          (
            await request("/api/register", {
              method: "POST",
              auth: false,
              body,
            })
          ).status,
          200,
        );
      const d = await (await request("/api/admin/enquiries?q=QA")).json();
      assert.equal(d.total, 1);
      assert.equal(d.enquiries[0].status, "new");
      const edited = {
        id,
        status: "contacted",
        notes: "PRIVATE_QA_NOTE needs evening lessons",
      };
      assert.equal(
        (
          await request("/api/admin/enquiries", {
            method: "PATCH",
            body: edited,
          })
        ).status,
        200,
      );
      const filtered = await (
        await request("/api/admin/enquiries?status=contacted")
      ).json();
      assert.equal(filtered.enquiries[0].notes, edited.notes);
      assert(!(await (await request("/")).text()).includes("PRIVATE_QA_NOTE"));
      assert.equal(
        (
          await request("/api/admin/enquiries", {
            method: "PATCH",
            body: { ...edited, status: "invalid" },
          })
        ).status,
        400,
      );
    },
  );
  await check(
    "image uploads validate input and persist immutable public images",
    async () => {
      assert.equal(
        (
          await request("/api/admin/images", {
            method: "POST",
            body: '<svg onload="alert(1)"></svg>',
            raw: true,
          })
        ).status,
        400,
      );
      const png = readFileSync("public/maths-by-doing-logo.png");
      const response = await request("/api/admin/images", {
        method: "POST",
        body: png,
        raw: true,
      });
      assert.equal(response.status, 200);
      const { url } = await response.json();
      const image = await request(url, { auth: false });
      assert.equal(image.status, 200);
      assert.equal(image.headers.get("content-type"), "image/png");
      assert.match(image.headers.get("cache-control"), /immutable/);
      assert.deepEqual(Buffer.from(await image.arrayBuffer()), png);
    },
  );
  await check("expired sessions and logout revoke access", async () => {
    const token = cookie.split("=")[1];
    const digest = createHash("sha256").update(token).digest("hex");
    await db.execute({
      sql: "UPDATE admin_sessions SET expires_at=0 WHERE token_hash=?",
      args: [digest],
    });
    assert.equal((await request("/api/admin/content")).status, 401);
    const r = await request("/api/admin/login", {
      method: "POST",
      body: { email, password },
    });
    cookie = r.headers.get("set-cookie").split(";")[0];
    assert.equal(
      (await request("/api/admin/logout", { method: "POST" })).status,
      200,
    );
    assert.equal((await request("/api/admin/content")).status, 401);
  });
  await check(
    "persistent rate limits reject repeated login attempts",
    async () => {
      await db.execute("DELETE FROM admin_login_limits");
      for (let i = 0; i < 10; i++)
        assert.equal(
          (
            await request("/api/admin/login", {
              method: "POST",
              body: { email, password: "wrong" },
            })
          ).status,
          401,
        );
      assert.equal(
        (
          await request("/api/admin/login", {
            method: "POST",
            body: { email, password },
          })
        ).status,
        429,
      );
    },
  );
  if (process.env.ADMIN_BROWSER_TEST) {
    await db.execute("DELETE FROM admin_login_limits");
    const { chromium } = await import(
      process.env.PLAYWRIGHT_MODULE || "playwright"
    );
    const browser = await chromium.launch({
      headless: true,
      executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH,
    });
    try {
      const context = await browser.newContext({
        viewport: { width: 1440, height: 1100 },
      });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(base + "/admin");
      await page.screenshot({
        path: "outputs/admin-login-desktop.png",
        fullPage: true,
      });
      await page.getByLabel("Email address").fill(email);
      await page.getByLabel("Password", { exact: true }).fill(password);
      await page.getByRole("button", { name: "Enter your studio" }).click();
      await page
        .getByRole("heading", { name: "Overview", exact: true })
        .waitFor();
      await page.screenshot({
        path: "outputs/admin-overview-desktop.png",
        fullPage: true,
      });
      await page
        .getByRole("button", { name: "Website content", exact: true })
        .click();
      await page.getByLabel("Website name").fill("QA Maths Studio");
      await page.getByText("Registration dropdown", { exact: true }).click();
      await page.getByLabel("New registration class").fill("IB Mathematics");
      await page
        .getByRole("button", { name: "Add class", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Delete Class 6", exact: true })
        .click();
      page.on("dialog", (d) => d.accept());
      await page.getByRole("button", { name: "Publish changes" }).click();
      await page
        .getByRole("status")
        .filter({ hasText: "Published." })
        .waitFor();
      const publicPage = await context.newPage();
      await publicPage.goto(base);
      assert(
        await publicPage
          .locator(".brand")
          .first()
          .innerText()
          .then((t) => t.includes("QA Maths Studio")),
      );
      await publicPage.getByRole("combobox").click();
      await publicPage
        .getByRole("option", { name: "IB Mathematics", exact: true })
        .waitFor();
      assert.equal(
        await publicPage
          .getByRole("option", { name: "Class 6", exact: true })
          .count(),
        0,
      );
      await publicPage
        .getByRole("option", { name: "IB Mathematics", exact: true })
        .click();
      await publicPage.close();
      await page
        .getByRole("button", { name: /^Student enquiries/ })
        .click();
      await page
        .getByRole("button")
        .filter({ hasText: "QA Student" })
        .first()
        .click();
      await page.getByLabel("Private notes").fill("Updated in browser");
      await page.getByRole("button", { name: "Save enquiry" }).click();
      await page
        .getByRole("status")
        .filter({ hasText: "Enquiry updated" })
        .waitFor();
      await page.screenshot({
        path: "outputs/admin-enquiries-desktop.png",
        fullPage: true,
      });
      await page.setViewportSize({ width: 390, height: 844 });
      for (const title of [
        "Overview",
        "Website content",
        "Video lessons",
        "Images",
        "Student enquiries",
      ]) {
        await page.getByRole("button", { name: new RegExp("^" + title) }).click();
        if (title === "Website content") {
          await page
            .getByText("Registration dropdown", { exact: true })
            .click();
          await page
            .getByLabel("New registration class")
            .fill("Mobile test class");
          await page
            .getByRole("button", { name: "Add class", exact: true })
            .click();
          await page
            .getByRole("button", {
              name: "Delete Mobile test class",
              exact: true,
            })
            .click();
        }
        await page.waitForTimeout(200);
        assert(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
          ),
          "Horizontal overflow: " + title,
        );
        await page.screenshot({
          path:
            "outputs/admin-" +
            title.toLowerCase().replaceAll(" ", "-") +
            "-mobile.png",
          fullPage: true,
        });
      }
      assert.deepEqual(errors, [], "Browser runtime errors");
      console.log(
        "PASS desktop/mobile browser login, publish, notes, navigation and overflow checks",
      );
      passed++;
      await context.close();
    } finally {
      await browser.close();
    }
  }
  console.log("All " + passed + " verification groups passed.");
} catch (e) {
  console.error(e);
  console.error(log.slice(-5000));
  process.exitCode = 1;
} finally {
  server.kill();
  db.close();
  writeFileSync("outputs/admin-test-server.log", log);
}
