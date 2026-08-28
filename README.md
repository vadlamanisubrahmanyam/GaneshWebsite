# Subrahmanyam — CMS Website (v1 backend scaffold)

Next.js 15 + NextAuth.js (Google wired up, Facebook/Microsoft ready to add) +
Prisma + Supabase Postgres.

## What's in here

```
src/
  app/
    page.tsx                       Home page (server component, reads real DB + session)
    layout.tsx / providers.tsx     Root layout + NextAuth session provider
    globals.css                    Same design tokens as the earlier HTML prototype
    api/auth/[...nextauth]/route.ts   Auth API route
  components/AuthButton.tsx        Sign in / sign out button
  lib/auth.ts                      NextAuth config — Google provider is active;
                                    Facebook/Microsoft are commented in, ready to
                                    uncomment once you have their credentials
  lib/prisma.ts                    Prisma client singleton
prisma/
  schema.prisma                    Full data model from the design doc
  seed.ts                          Demo data (same content as the earlier prototype)
```

## 1. Local setup

```bash
npm install
cp .env.example .env.local
```

Fill in `.env.local`:
- `DATABASE_URL` — from Supabase: Project Settings → Database → Connection string (URI)
- `NEXTAUTH_SECRET` — generate with `openssl rand -base64 32`
- `NEXTAUTH_URL` — `http://localhost:3000` for local dev
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — from your Google Cloud OAuth client

In the Google Cloud Console, make sure this redirect URI is on the OAuth client:
```
http://localhost:3000/api/auth/callback/google
```

Then push the schema to Supabase and seed demo data:

```bash
npx prisma db push
npx prisma db seed
npm run dev
```

Visit `http://localhost:3000` and click "Continue with Google."

## 2. Deploy to Vercel

1. Push this folder to your `GaneshWebsite` GitHub repo.
2. In Vercel: **Add New Project → Import** the repo.
3. In **Project → Settings → Environment Variables**, add the same variables from
   `.env.local` — but set `NEXTAUTH_URL` to your real Vercel URL
   (e.g. `https://ganeshwebsite.vercel.app`).
4. In Google Cloud Console, add a **second** redirect URI for production:
   ```
   https://ganeshwebsite.vercel.app/api/auth/callback/google
   ```
5. Deploy. Vercel runs `npm run build`, which runs `prisma generate` automatically.

## 3. Adding Facebook and Microsoft later

In `src/lib/auth.ts`, uncomment the `FacebookProvider` / `AzureADProvider` blocks
and their imports, then add the matching env vars (see `.env.example`). Add the
matching redirect URIs in each provider's developer console, following the same
pattern as Google's.

## 4. Pages in this build

All screens from the prototype are now real pages, backed by Prisma/Postgres
and Next.js Server Actions (mutations run server-side with role checks —
see `src/lib/guards.ts` and `src/lib/actions.ts`):

| Route | What it does |
|---|---|
| `/` | Home feed — trending topics, latest blogs |
| `/topics` | Full topic list |
| `/topics/[topicId]` | Topic thread — ask questions, post reviews, delete (Topic Owner/Admin) |
| `/blogs/[blogId]` | Blog article + comments — post/delete (Topic Owner/Admin) |
| `/submit` | Create a new Topic or Blog (signed-in users) |
| `/portfolio` | Public read-only view; owner (auto-Admin via `OWNER_EMAIL`) gets edit forms |
| `/admin` | Flagged content queue + ad manager — Admin only |

## 5. Owner access

Set `OWNER_EMAIL` in your environment to your own email address (the one you
sign in to Google with). On every sign-in, that account is automatically
promoted to `ADMIN` — no manual role-editing step. Everyone else who signs in
starts as a regular `USER` and can be promoted to `TOPIC_OWNER` or `ADMIN`
later (a small admin UI for changing other users' roles is a good next step).

## 6. File uploads (resume, project screenshots)

Portfolio documents (Resume/Cover Letter/Project Portfolio, PDF) and project
screenshots (laptop/mobile, JPEG) upload to **Supabase Storage** and are
publicly viewable — that's the point of this section, since it's meant to
be shown to visitors as a work reference, not locked behind login.

**One-time setup in Supabase:**
1. Supabase dashboard → **Storage** → **New bucket**.
2. Name it exactly `portfolio`.
3. Toggle **Public bucket** ON (so uploaded files are viewable by anyone
   with the link — required for showcasing your resume/projects publicly).
4. Click **Create bucket**.

**Env vars** (Project Settings → API):
```
SUPABASE_URL="https://YOUR-PROJECT.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="..."   # the "service_role" secret key — full access, server-only, never expose to the browser
```
Add both to `.env` locally and to Vercel's Environment Variables, then redeploy.

Once set, sign in as the owner (Admin), go to `/portfolio`, and the Upload
forms under Documents and Projects will actually save files to Supabase and
show them immediately — no code changes needed beyond this.

## 7. Still to wire up

- **Blog cover images** — the Submit form doesn't yet upload a cover image;
  it can reuse the same `uploadJpeg` helper in `src/lib/storage.ts`.
- **Advertisement creative images** — the Admin ad form still takes a plain
  target URL; the creative image upload can reuse the same storage helper.
- **Reporting UI** — the `Report` model and admin resolution actions exist;
  a "Report" button on comments/blogs/Q&A items to actually create reports
  isn't built yet.
- **Facebook / Microsoft login** — provider code is commented in
  `src/lib/auth.ts`, ready to enable.
