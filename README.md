# E3 Summer Splash — Access Control

Standalone Next.js app for **E3 Summer Splash** event registration, QR passes, and staff portals (admin, POS, scanner, dashboard).

## Stack

- **Next.js 15** (App Router)
- **Supabase** (auth, database, RLS)
- **Tailwind CSS 4** + shadcn/ui

## Setup

1. Copy environment variables:

   ```bash
   cp .env.example .env
   ```

2. Fill in Supabase keys from your [Supabase project](https://supabase.com/dashboard) → Settings → API.

3. Apply database migrations (if not already done):

   ```bash
   npx supabase login
   npx supabase link --project-ref YOUR_PROJECT_REF
   npx supabase db push
   ```

4. Install and run:

   ```bash
   npm install
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

   **Alternatively**, sign in as admin and open **Admin → Settings** to save Supabase URL and keys (writes `.env.local`). Restart `npm run dev` after saving.

### Passkeys (WebAuthn)

Staff portals (admin, dashboard, POS, scanner) support **Sign in with passkey** on each login page, plus optional enrollment after a password sign-in. Manage passkeys under **Admin → Settings → Passkeys** (shows whether passkeys are enabled for the linked project).

**Supabase dashboard (required):**

If passkeys are off in the project, GoTrue may return `passkey_disabled` (**"Passkeys are disabled"**) or **404** on `/auth/v1/passkeys/*` (routes not registered until enabled). The app probes once, caches “unavailable,” hides passkey sign-in, and skips the post-login enroll dialog until you enable them. To skip probing entirely in local dev, set `NEXT_PUBLIC_SUPABASE_PASSKEYS_ENABLED=false` in `.env.local`.

1. Sign in at [supabase.com/dashboard](https://supabase.com/dashboard) and open the project used by this app (same URL as `NEXT_PUBLIC_SUPABASE_URL`, e.g. `https://abcdefgh.supabase.co` → project ref `abcdefgh`).
2. Go to **Authentication** → **Passkeys** (Beta). If you do not see Passkeys, your org/project may need the passkeys beta; check Supabase changelog or support.
3. Turn **passkeys** on (`PASSKEY_ENABLED`).
4. Under **Authentication** → **URL configuration**, set **Site URL** to the exact origin where staff use the app:
   - Local: `http://localhost:3000` (or your dev port)
   - Production: `https://your-domain.com` (HTTPS required)
5. Add the same URL(s) under **Redirect URLs** if staff sign-in redirects fail.
6. **Relying party ID** and **allowed origins** are usually derived from Site URL; production must use your real HTTPS domain (not `localhost` in prod).

After saving, wait a few seconds and reload the staff login page. **Admin → Settings → Passkeys** should show “Passkeys are enabled for this project.”

Beyond the usual Supabase keys, only an optional `NEXT_PUBLIC_SUPABASE_PASSKEYS_ENABLED` override is supported (see `.env.example`). The browser client must set `auth.experimental.passkey: true` (see `src/integrations/supabase/client.ts`); `@supabase/supabase-js` v2.105+ with `@supabase/auth-js` passkey APIs is required.

### Mailgun (guest digital pass email)

When a guest registers with an email (public site or POS), the app can send a transactional email with their pass link and **My Passes** PWA URL via [Mailgun](https://www.mailgun.com/).

1. Create a Mailgun domain and API key.
2. Configure in **Admin → Settings → Integrations → Email (Mailgun)** (stored in `app_settings`), or set server env vars from `.env.example`:
   - `MAILGUN_API_KEY`, `MAILGUN_DOMAIN`, `MAILGUN_FROM_EMAIL`, `MAILGUN_ENABLED=true`
3. Apply migration `supabase/migrations/20260524120000_mailgun_app_settings.sql` (`npx supabase db push`).
4. Set `NEXT_PUBLIC_SITE_URL` in production so pass/QR links in emails use your public HTTPS origin.

Emails are sent asynchronously after registration and do not block QR/pass creation. The API key is never exposed to the browser.

## Deploy (Vercel)

1. Vercel → your project → **Settings** → **Environment Variables**
2. Add **all** variables from `.env.example` for **Production**, **Preview**, and **Development**
3. **Redeploy** after saving (required — `NEXT_PUBLIC_*` values are baked in at build time)

| Variable | Required for |
|----------|----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Browser + build |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser + build |
| `SUPABASE_URL` | Server actions |
| `SUPABASE_PUBLISHABLE_KEY` | Server actions |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin user create/update/delete (auth admin API) |

- Framework preset: **Next.js**
- Install command: `npm install`
- Build command: `npm run build`

## Push to GitHub & open a PR

Requires [GitHub CLI](https://cli.github.com/) (`gh auth login`).

### npm script (recommended)

```bash
npm run push:pr
```

From `main`, this creates a branch (`update/YYYYMMDD-HHmm`), commits all changes, pushes, and opens a PR against `main`.

Custom commit message:

```bash
npm run push:pr -- -m "Fix admin user list"
```

Push only (no PR):

```bash
npm run push:pr -- --no-pr
```

### One line (push + create PR)

**PowerShell** (run from the project root):

```powershell
git switch -c "update/$(Get-Date -Format 'yyyyMMdd-HHmm')"; git add -A; git commit -m "Update"; git push -u origin HEAD; gh pr create --base main --fill
```

Creates a branch, commits all changes, pushes, and opens a PR against `main`.

If you are already on a feature branch with commits:

```powershell
git push -u origin HEAD; gh pr create --base main --fill
```

### Push only, then Cursor agent creates the PR

```powershell
git add -A; git commit -m "Update"; git push -u origin HEAD
```

Then in Cursor chat: **Create a pull request** — the agent will inspect the branch and run `gh pr create`.

| Situation | What to do |
|-----------|------------|
| Already on a feature branch with commits | `git push -u origin HEAD`, then ask the agent to create the PR |
| Working on `main` | Use the one-liner above (creates a branch first) |
| Nothing to commit | Skip `git add` / `git commit`, or only push existing commits |

## Scripts

| Command           | Description                              |
|-------------------|------------------------------------------|
| `npm run dev`     | Development server                       |
| `npm run build`   | Production build                         |
| `npm run start`   | Production server                        |
| `npm run push:pr` | Branch, commit, push, and open a PR      |

## Zebra label printing

Entry pass labels can print to a **Zebra** printer from the public registration success screen and from **POS → Reprint**.

### Setup

1. Apply the `label_print_templates` migration (`npx supabase db push`).
2. In **Admin → Settings → Label printer**, enable printing, set label size (e.g. 4×2 in, 203 DPI), and pick or customize a template.
3. Install **[Zebra Browser Print](https://www.zebra.com/us/en/support-downloads/software/printer-software/browser-print.html)** on the kiosk PC (USB or local network printers). Keep the Browser Print service running.
4. Optional **network** printing: set printer IP and port `9100`; the Next.js server sends ZPL over TCP (works from POS/admin; registration kiosks should use Browser Print).

### Test print

1. Admin → Settings → Label printer → **Test print** (with a printer connected).
2. Complete a test booking on `/register` → **Entry pass** (prints or downloads `entry-pass.zpl` if Browser Print is missing).

### Files

- `src/lib/zebra/zpl-builder.ts` — ZPL from preset layout or custom template
- `src/lib/zebra/print-entry-pass.ts` — Browser Print, network proxy, `.zpl` download fallback
- `src/lib/label-print.functions.ts` — server actions (settings, templates, network send)
- `src/components/admin/admin-label-printer-panel.tsx` — admin UI

## Brand & assets

Design tokens live in `app/globals.css` (`--brand-teal`, `--brand-coral`, `--brand-cream`, etc.). Brand imagery lives in `public/brand/` (`summer-splash-logo.png`, `summer-splash-background.jpg` — use ≥1920px wide for a sharp hero) and is referenced from `src/lib/public-assets.ts` via `SummerSplashLogo` and `BrandBackground`.
