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
