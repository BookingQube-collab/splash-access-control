
# SummerSplash MVP — Build Plan

## 1. Backend (Lovable Cloud)

Enable Lovable Cloud and create the schema.

**Tables**
- `profiles` — `id (uuid → auth.users)`, `full_name`, `created_at`
- `app_role` enum — `admin | dashboard | pos | scanner`
- `user_roles` — `id`, `user_id`, `role` (separate table, queried via `has_role()` security-definer fn — required to avoid RLS recursion)
- `events` — `id`, `name` (default "SummerSplash"), `event_date`, `is_active`
- `slots` — `id`, `event_id`, `name`, `starts_at`, `ends_at`, `capacity`
- `registrations` — `id (uuid)`, `slot_id`, `customer_name`, `mobile`, `email`, `guest_count`, `qr_token (uuid, unique)`, `status (active|entered|exited|expired|invalid)`, `created_at`
- `scan_events` — `id`, `registration_id (nullable)`, `slot_id`, `mode (entry|exit|auto_exit)`, `result (valid|invalid)`, `scanned_at`, `scanner_user_id`
- `app_settings` (singleton) — `scandit_api_key`, `scandit_enabled`

**RLS rules**
- `has_role(uid, role)` security-definer function
- Admin: full CRUD everywhere
- Dashboard: read-only on slots, registrations (counts), scan_events
- POS: insert into registrations, read slots, update own registrations (reprint)
- Scanner: insert into scan_events, read+update registrations by qr_token
- Public registration uses a server function with `supabaseAdmin` (no anon policies on registrations) — validates slot capacity server-side, returns `{ qr_token, registration_id }`
- `app_settings.scandit_api_key` readable only by admin; scanner reads via server fn that returns only `{ enabled, key }` to authenticated scanner users

## 2. Routes (file-based, TanStack Start)

```
src/routes/
  __root.tsx                       — providers + auth listener + role-aware redirect helper
  index.tsx                        — landing → links to public register + login
  login.admin.tsx                  — admin login
  login.dashboard.tsx              — dashboard login
  login.pos.tsx                    — POS login
  login.scanner.tsx                — scanner login
  register.tsx                     — PUBLIC registration (no auth)
  pass.$token.tsx                  — PUBLIC QR digital pass page
  _admin.tsx                       — guard: requires admin role; layout w/ sidebar
  _admin/index.tsx                 — admin home
  _admin/events.tsx                — event setup
  _admin/slots.tsx                 — slot setup + capacity
  _admin/registrations.tsx         — registration module (list/search/export)
  _admin/users.tsx                 — user/role management
  _admin/settings.tsx              — Scandit API key + enable toggle
  _admin/dashboard.tsx             — admin's view of live dashboard
  _admin/reports.tsx               — reports
  _dashboard.tsx                   — guard: dashboard role (admin also allowed)
  _dashboard/index.tsx             — live occupancy dashboard
  _pos.tsx                         — guard: pos role
  _pos/index.tsx                   — POS register + slot select + reprint + search
  _scanner.tsx                     — guard: scanner role
  _scanner/index.tsx               — scanner page (entry/exit, camera + HW input, valid/invalid screens)
```

Each `_role.tsx` layout uses `beforeLoad` to check session + `has_role`; redirect to its login on fail. Admin role passes all guards.

After login, redirect by role:
- admin → `/_admin`
- dashboard → `/_dashboard`
- pos → `/_pos`
- scanner → `/_scanner`

## 3. Server Functions (`src/lib/*.functions.ts`)

- `publicRegister({ slot_id, name, mobile, email, guest_count })` — admin client; checks remaining capacity; inserts; returns `qr_token`
- `getPass(qr_token)` — public; returns registration + slot + live status (active / expired / exited)
- `getDashboardCounts()` — auth (dashboard/admin); per-slot active, entered, exited, auto_exit, invalid, remaining
- `scanQR({ qr_token, mode })` — auth (scanner/admin); validates slot window, marks entered/exited, logs invalid; returns `{ valid: bool, reason }`
- `posRegister(...)` / `searchByMobile(mobile)` / `reprintPass(registration_id)` — auth (pos/admin)
- `getScanditConfig()` — returns `{ enabled, key }` to scanner/admin only
- `saveSettings(...)`, `assignRole(user_id, role)`, slot/event CRUD — admin only
- Auto-expiry: scheduled via `pg_cron` (or computed on read) — when `now() > slot.ends_at` and registration still `entered`, mark `auto_exited`

## 4. Public registration + QR pass UX

- `/register` — shows event name, today's date, lists slots with `remaining = capacity - active`, form (name, mobile, email, guests), submit → navigate to `/pass/$token`
- `/pass/$token` — shows registration ID, name, date, slot, QR code (using `qrcode.react`), live status badge ("Active" / "Entered" / "Exited" / "Expired — slot ended"). Polls `getPass` every 10s.

## 5. Scanner UX

- Mode toggle (Entry / Exit)
- Camera scan via `html5-qrcode` (always available as fallback)
- Hardware scanner: hidden text input that auto-submits on Enter
- If `scandit_enabled` and key present → load Scandit later (placeholder hook now); otherwise browser camera
- Full-screen GREEN on valid, RED on invalid (with reason); auto-dismiss after 1.5s

## 6. Dashboard UX

Cards per slot: name, capacity, active, entered, exited, auto-exited, invalid scans, remaining. Auto-refresh every 5s.

## 7. Admin UX

Sidebar nav across all admin sub-pages. Forms use `react-hook-form + zod`. Tables for slots/registrations/users with inline edit. Settings page stores Scandit key (write-only display — masked) and toggle.

## 8. Design

Summer/aquatic palette (Ocean Deep + Sky accents), Sora/Manrope typography, rounded cards, generous spacing. Tokens defined in `src/styles.css` using `oklch`. All components use semantic tokens.

## 9. Dependencies to add

- `qrcode.react` — QR rendering
- `html5-qrcode` — browser camera scanning
- `react-hook-form`, `zod`, `@hookform/resolvers` (likely already present via shadcn)
- `date-fns`

## 10. Out of scope (this pass)

- Real Scandit SDK wiring (settings + toggle only; browser camera is the active scanner)
- Email/SMS delivery of QR pass (pass is shown on screen + shareable link)
- Payments

---

After you approve, I'll: enable Cloud → run schema migration → install deps → build routes/components/server fns → seed an admin user for you to log in with.
