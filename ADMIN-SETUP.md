# Teacher studio

The admin panel is at **/admin**, for example https://mathsbydoing.vercel.app/admin.

## One-time setup by the site owner

1. Keep the existing TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in Vercel. The studio uses the same database as registrations; existing registrations are preserved.
2. Choose the teacher's email and a strong password (12 or more characters).
3. In this project run `node scripts/admin-password.mjs`. Enter the chosen password at the hidden prompt. The script prints a salted scrypt hash, not the password.
4. In Vercel → project → Settings → Environment Variables, add:
   - ADMIN_EMAIL: the teacher's sign-in email.
   - ADMIN_PASSWORD_HASH: the complete hash printed by the script (salt:hash).
5. Apply these to **Production** and redeploy the latest commit. Use separate credentials and a separate database for Preview deployments if you enable admin there.
6. Open /admin and sign in with the email and original password. Send the credentials to your teacher through a private channel.

There is no default password, public signup, or open setup endpoint. Do not commit passwords, tokens, hashes, or local databases. Login is disabled until configured. Adding or changing Vercel environment variables requires redeployment.

The tables for content, sessions, images, notes and login limits are created automatically with CREATE TABLE IF NOT EXISTS. The existing registrations table is not dropped or recreated. Back up your database before any production release as normal.

## What the teacher can do

- **Overview:** see total enquiries, new enquiries and lesson count.
- **Website content:** edit the teacher identity, headings, biography, descriptions, class cards and contact links.
- **Video lessons:** add a YouTube URL or video ID, edit title/category/thumbnail, reorder or remove lessons. Keep at least one lesson.
- **Images:** upload a logo or portrait, or supply an HTTPS image URL. Uploads are resized in the browser and saved in Turso; no extra image-storage account is required. Images are public website assets, not private documents.
- **Student enquiries:** search by name, email or class, filter by status, and record private notes. Mark enquiries New, Contacted, Enrolled or Archived. Archive preserves records; there is deliberately no delete action.

Website edits remain unpublished in the current browser tab until **Publish changes** is pressed and confirmed. The public page reads the saved content when loaded; visitors see changes on refresh. The editor warns about unsaved changes and refuses to overwrite a newer revision from another tab. Reload to resolve a conflict. Unpublished work is not stored across closing the tab.

Enquiry updates use **Save enquiry** and take effect immediately. They are never included in public page content. Contacting a student uses your email application; the admin does not send email automatically.

Class choices remain the supported programmes in the registration form. Adding an entirely new programme requires a code update. Content edits do not change the public site's layout, decorative maths, interface labels or browser-tab metadata.

## Security and maintenance

Passwords use salted scrypt hashes. Sessions use random 256-bit tokens, stored as hashes in the database, with HttpOnly/SameSite=Strict cookies (Secure on HTTPS) and an eight-hour expiry. Logout revokes the session in the database. Changing the admin email or password hash and redeploying invalidates existing sessions.

Every admin read and write endpoint checks the session. Write endpoints also require a matching Origin. Sign-in attempts are limited persistently per IP (10 per 15 minutes) and per account (60 per 15 minutes), so limits work across serverless instances. Image uploads accept only PNG/JPEG/WebP signatures, with a 1 MB server limit; the browser resizes source images of up to 10 MB. Uploaded assets have random immutable URLs. Unpublished/old uploads are retained so previously published content is not broken.

If sign-in shows a setup message, check ADMIN_EMAIL and ADMIN_PASSWORD_HASH. If data cannot load, check the Turso URL/token. Failed public content reads fall back to the original bundled website content; the admin displays an error rather than claiming a save succeeded.

## Local development and verification

Use an isolated database and test credentials in .env.local:

```dotenv
TURSO_DATABASE_URL=file:local-admin.db
ADMIN_EMAIL=teacher@example.com
ADMIN_PASSWORD_HASH=the-hash-from-the-script
```

Run `pnpm dev:vercel`. The legacy Vinext scripts are left in place; Vercel still uses `pnpm build:vercel`.

```sh
pnpm build:vercel
node tests/admin.integration.mjs
```

The integration suite creates a unique local database under ignored outputs/, starts the production Next.js server on a loopback port, and tests auth, CSRF, validation, persistence, image access and enquiries. It never connects to the production database.
