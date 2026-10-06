# Architecture & conventions

One SvelteKit 2 + Svelte 5 app (TypeScript strict) with three route groups — public site, booking wizard,
CMS — on one Postgres schema. Design source of truth: `../design_system.md` (Wortel). Plan: `../development_plan.md`.

## Runtime services (demo mode)

| Concern | Demo implementation | Production swap |
| --- | --- | --- |
| Database | Embedded **PGlite** (real Postgres in WASM) in `./data/pglite`, migrations + seed on first boot | Set `DATABASE_URL` → Neon (same Drizzle code, `neon-serverless` driver) |
| Object storage | Local disk `./data/uploads` behind the same presigned-URL contract (`src/lib/server/storage.ts`) | Replace internals of `storage.ts` with Neon Object Storage / S3 presign |
| Email | Outbox table `emails`, readable in CMS → Beheer → E-mails (`src/lib/server/email.ts`) | Call Brevo/Postmark inside `sendEmail()` |
| CMS auth | Email + password (scrypt), hashed session tokens, **no OTP / magic link / email verification** | Unchanged (optionally add 2FA later) |
| Spam protection | Honeypot field + in-memory rate limits | Add Cloudflare Turnstile + shared rate limiter |
| Cron | `GET /api/cron` with `Authorization: Bearer $CRON_SECRET` | Vercel Cron / Inngest calling the same endpoint |

> **Never run two processes on the same PGlite directory** (dev server + another dev server / script). PGlite is single-process.

## Folder map

```text
src/
  hooks.ts                 reroute: English URLs (/en/services/…) → Dutch route tree
  hooks.server.ts          DB init, locale, CMS session, security headers
  params/lang.ts           [[lang=lang]] matcher (only "en"; Dutch has no prefix)
  lib/
    domain.ts              booking statuses, transitions, slot kinds, labels, postcodes (client-safe)
    media.ts               MediaRef + toMediaRef() for <Picture> (client-safe)
    content/pages.ts       typed JSON blocks per CMS page key
    i18n/                  translator(), localizePath(), formatters; messages/{common,site,booking}.ts
    styles/                tokens.css (design tokens), base.css (reset, type, utilities)
    components/
      ui/                  Button, Badge, StatusBadge, Alert, Picture, Icon, Dialog, Drawer, EmptyState, Skeleton, Spinner, Toaster(+toast store)
      form/                Field, TextField, Textarea, Select, Checkbox, Toggle, SegmentedControl
      marketing/           Logo, SiteHeader, SiteFooter, CtaBand, LanguageSwitcher, …
      booking/             wizard components
      admin/               AdminShell, nav, PageHeader, Panel, …
    server/
      db/                  schema.ts, index.ts (db, ensureDatabase), seed.ts, seed-data.ts
      auth.ts              password hashing + sessions
      permissions.ts       role matrix, requireRole(locals, area)
      availability.ts      slot generation, availability, holds, atomic reservation, references
      bookings.ts          createBooking() (transactional)
      booking-emails.ts    confirmation / alert / reminder / status emails + .ics
      email.ts             sendEmail() → outbox, emailLayout()
      media.ts             register/create media rows, getMediaRefs()
      images.ts            sharp: EXIF strip, WebP derivatives, LQIP
      storage.ts           object storage adapter + signed upload URLs
      settings.ts          company + booking settings (key/value table)
      site.ts              nav services for header/footer
      sanitize.ts          allow-list HTML sanitizer for rich text
  routes/
    [[lang=lang]]/(public)/   public site (header/footer layout)
    [[lang=lang]]/boeken/     booking wizard: dienst → details → datum → bevestigen → bedankt
    admin/login, admin/logout
    admin/(app)/              guarded CMS pages (AdminShell layout)
    api/                      media upload, cron, .ics
    media/[...key]            serves stored objects
```

## Conventions

- **Svelte 5 runes** only (`$props`, `$state`, `$derived`, snippets). Typed `Props` interfaces; spread `...rest`.
- **Styling:** scoped `<style>` using tokens from `tokens.css` — never raw hex in components. Variants via `data-*` attributes.
- **i18n (public + booking):** `const t = $derived(translator(data.locale))`; strings live in `src/lib/i18n/messages/*.ts` (nl + en with identical keys). Internal links: `localizePath('/diensten/aanleg', locale)` → `/en/services/aanleg`. Routes are always created under their Dutch path. The CMS UI is Dutch-only and uses literal strings.
- **Data loading** in `+page.server.ts`; **mutations** as form actions with `use:enhance` (works without JS). Validate with **zod**; on error `return fail(400, { values, errors })`.
- **CMS pages:** every load *and* action starts with `requireRole(locals, '<area>')`. Loads return `title` (and optional `crumbs: {href,label}[]`) for the top bar.
- **Images:** always `<Picture media={ref} sizes="…" ratio="4 / 3" />`; load refs server-side with `getMediaRefs(ids, locale)`.
- **Slot accounting:** `slots.booked_count` = number of non-cancelled bookings in that slot. Cancelling calls `releaseSlot`; rescheduling releases the old slot and `reserveSlot`/`forceReserveSlot`s the new one in one transaction; every status change or reschedule inserts a `booking_events` row.
- **Dates:** slot dates are `YYYY-MM-DD` strings in Europe/Brussels; use helpers in `availability.ts` and `formatDate()` in `$lib/i18n`.

## Demo accounts (seeded on first boot)

| Role | Email | Password |
| --- | --- | --- |
| Admin | admin@tuinen-deridder.be (or `ADMIN_EMAIL`) | DeRidder2026! (or `ADMIN_PASSWORD`) |
| Planner | planning@tuinen-deridder.be | Planner2026! |
| Editor | redactie@tuinen-deridder.be | Editor2026! |
