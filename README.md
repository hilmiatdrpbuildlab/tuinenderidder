# Tuinen De Ridder — website, booking system & CMS

One SvelteKit application containing:

- **Public website** (`/`, English at `/en`): home, services, projects, about, contact, legal pages.
- **Booking wizard** (`/boeken`, `/en/book`): a 4-step booking flow with live availability, slot holds and confirmation emails.
- **CMS** (`/admin`): dashboard, bookings, calendar, quote requests, availability, content editors, media library, users and settings.

Built from `../development_plan.md`. All styling follows `../design_system.md`, implemented in `src/lib/styles/tokens.css`.

## Quick start

```bash
npm install
cp .env.example .env      # optional — sensible defaults are built in
npm run dev               # http://localhost:5173
```

The first boot creates a local Postgres database (PGlite) in `./data`, runs the migrations and seeds the demo content. Seeding takes about 30 seconds, mostly for the placeholder images.

**CMS login:** http://localhost:5173/admin. Login is email + password only. There is no OTP, magic link or email confirmation, because no mail or SMS service is connected yet.

| Role | Email | Password | Access |
| --- | --- | --- | --- |
| Admin | `admin@tuinen-deridder.be` | `DeRidder2026!` | Everything |
| Planner | `planning@tuinen-deridder.be` | `Planner2026!` | Bookings, calendar, requests, availability, messages, emails |
| Editor | `redactie@tuinen-deridder.be` | `Editor2026!` | Services, projects, testimonials, pages, media |

Change these passwords (CMS → Beheer → Gebruikers) before sharing the demo outside the team.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with HMR |
| `npm run build` / `npm start` | Production build (adapter-node) / run it |
| `npm run check` | `svelte-check` type check |
| `npm test` | Vitest unit tests (in-memory DB, never touches `./data`) |
| `npm run db:generate` | New SQL migration after changing `src/lib/server/db/schema.ts` |
| `npm run db:reset` | Delete the local database + uploads (stop the dev server first) |

## What is real and what is stubbed in this demo

| Area | Demo | To go live |
| --- | --- | --- |
| Database | PGlite (embedded Postgres) in `./data/pglite` | Set `DATABASE_URL` to a Neon EU connection string; the same migrations run on boot |
| Photos | Stored in `./data/uploads`, behind the same signed upload-URL flow as S3 | Swap the internals of `src/lib/server/storage.ts` for Neon Object Storage or S3 |
| Emails | Saved in an outbox, readable in CMS → Beheer → E-mails | Send through Brevo or Postmark in `src/lib/server/email.ts` |
| Spam | Honeypot field + rate limits | Add Cloudflare Turnstile |
| Reminders and cleanup | `GET /api/cron` with `Authorization: Bearer $CRON_SECRET` | Call it hourly from Vercel Cron or Inngest |
| Hosting | adapter-node | Switch to `@sveltejs/adapter-vercel` (region `fra1`) once the database and storage are external |
| Images and copy | Illustrated placeholders; service copy is based on the current site | Client supplies photos, texts and genuine reviews through the CMS (content deadline in the plan: 4 Dec) |

## Deviations from the development plan

- **Auth:** a small built-in module (scrypt + hashed session tokens) instead of Better Auth, so the demo has no extra services. The roles `admin`, `planner` and `editor` match the plan.
- **i18n:** typed dictionaries in `src/lib/i18n` with translated URL segments via SvelteKit `reroute`, instead of Paraglide. The URLs and the NL/EN scope are the same as the plan.
- **Forms:** zod with plain SvelteKit form actions instead of sveltekit-superforms. Forms still work without JavaScript.
- **Headless UI:** native `<dialog>` for dialogs and drawers instead of Bits UI.
- **Image placeholder:** a tiny blurred WebP data URL (`media.lqip`) instead of BlurHash.

See `docs/ARCHITECTURE.md` for the folder map and coding conventions.
