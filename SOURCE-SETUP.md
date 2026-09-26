# Maths by Doing — complete source

**Current deployment:** Vercel + Turso/libSQL. Use the “Hosting on Vercel” section below and [ADMIN-SETUP.md](ADMIN-SETUP.md). Cloudflare instructions describe the original export.

This archive contains the website frontend, registration backend, database schema and migration, logo, portrait, lesson list, components, pinned dependency lockfile and build configuration. It does not contain passwords, installed dependencies or student registrations.

## Run locally

Install Node.js 22.13 or newer and pnpm 11.25.0. In this folder:

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open the localhost address printed by the server. The included execution-profile helper defaults to portable mode outside the managed development environment.

## Registration database

Registration uses Cloudflare D1, with a binding named `DB`; it is not a static-only website. To prepare the local database:

```sh
pnpm build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_wide_vin_gonzales.sql
```

Apply this migration only once to a new database. The form saves enquiries; it does not send email notifications or automatically send WhatsApp messages. The visitor must send the prepared WhatsApp message themselves. A teacher admin dashboard is now available at /admin; see ADMIN-SETUP.md. Production enquiries are private database records, not included in the source archive.

## What to edit

- `app/page.tsx`: page content, class choices, WhatsApp number, continuous lesson row.
- `app/globals.css`: burgundy theme, layout, mobile styles and animations.
- `app/lessons.json`: 24 selected verified videos (not an automatically synced YouTube feed).
- `public/maths-by-doing-logo.png`: supplied original logo, preserved unchanged.
- `public/arslan-shaikh.jpg`: teacher portrait from his YouTube channel.
- `app/api/register/route.ts`: server-side validation and saving.
- `db/schema.ts` and `drizzle/`: database structure and migrations.

The video row uses two equal-width groups and translates exactly one group's width before repeating. Motion pauses on hover, keyboard focus, opening a lesson or using Pause motion. Reduced-motion preferences disable automatic movement and allow manual horizontal scrolling. Background math motion follows the same pause preference. Video thumbnails and players require access to YouTube.

## Hosting

This code is currently deployed through ChatGPT Sites, backed by a Cloudflare Worker and D1. `.openai/hosting.json` identifies the existing Site; do not reuse that project ID for a separate Site. GitHub can store the source, but GitHub Pages alone cannot run this registration backend. For separate hosting, configure a Cloudflare Worker-compatible deployment and a real D1 database binding, then apply the included migration. Never commit credentials or database exports.

## Content and verification

School role and Hyderabad location were supplied by the site owner. Portrait and video identities came from https://www.youtube.com/@mathsbydoing . The uploaded logo is low-resolution and used at modest display sizes. No qualifications, exam-result claims, fees or testimonials have been invented.

Design reference: https://mathigon.org/ (visual mathematics and geometry); no third-party layouts or assets were copied.

The floating “Designed by Agentixsquad” credit links to https://agentixsquad.com/ and opens in a new tab.

## Hosting on Vercel

`vercel.json` makes Vercel run `next build` (via `pnpm run build:vercel`) instead of the Cloudflare/vinext build, so the standard `.next` output and `routes-manifest.json` are produced. The registration API stores enquiries in a Turso (libSQL) database instead of Cloudflare D1; it uses the same `registrations` table and creates it automatically on first use.

Set these environment variables in Vercel (Settings > Environment Variables, all environments):

- `TURSO_DATABASE_URL`, for example `libsql://maths-by-doing-<org>.turso.io`
- `TURSO_AUTH_TOKEN`, a token for that database

Both values come from the Turso dashboard (https://turso.tech) or from the Turso integration on the Vercel Marketplace, which injects them automatically. Until they are set the site builds and loads, but the form returns "We could not save your enquiry". For local testing use `TURSO_DATABASE_URL=file:local.db` in `.env.local`. `.env.example` lists the variables.

The Cloudflare/vinext scripts (`pnpm dev`, `pnpm build`, `pnpm start`) remain for the ChatGPT Sites deployment but the database layer now targets libSQL only.
