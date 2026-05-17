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
| `SUPABASE_SERVICE_ROLE_KEY` | Admin user create/list |

- Framework preset: **Next.js**
- Install command: `npm install`
- Build command: `npm run build`

## Scripts

| Command        | Description          |
|----------------|----------------------|
| `npm run dev`  | Development server   |
| `npm run build`| Production build     |
| `npm run start`| Production server    |
