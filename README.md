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

- Framework preset: **Next.js**
- Set the same env vars as in `.env.example` in the Vercel project settings.

## Scripts

| Command        | Description          |
|----------------|----------------------|
| `npm run dev`  | Development server   |
| `npm run build`| Production build     |
| `npm run start`| Production server    |
