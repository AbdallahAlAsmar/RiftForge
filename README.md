# RiftForge

Forge your team. Conquer the Rift.

Automated League of Legends tournament hosting MVP built with Next.js 15, Supabase, PostgreSQL, TailwindCSS, and shadcn-style UI primitives.

## What Is Included

- Riot OAuth entrypoint bridged into Supabase Auth sessions
- Discord OAuth sign-in through Supabase Auth
- Profile account connections for Discord-first and Riot-first users
- User profiles with Riot identity, rank, region, TSR, and preferred roles
- Tournament creation, publishing, browser, detail pages, and admin dashboard
- Team creation with Supabase Storage logo upload
- Solo/duo queue and balanced team generation using Tournament Skill Rating
- Bracket generation, live bracket display, result submission, admin confirmation, and winner advancement
- PostgreSQL schema with foreign keys, indexes, RLS policies, and storage bucket setup

## Project Structure

```txt
app/
  auth/riot              Riot OAuth redirect route
  auth/callback          Riot OAuth callback and Supabase session bridge
  auth/discord           Discord OAuth redirect route
  auth/supabase/callback Supabase OAuth callback for Discord/linking
  (app)/tournaments      Browser, details, admin, bracket pages
  (app)/teams            Team browser and management pages
  (app)/profile          User profile and tournament history
components/
  ui                     shadcn-style primitives
  layout                 App shell
  tournament             Tournament forms and queue UI
  team                   Team/profile forms
  bracket                Bracket tree
lib/
  actions                Server actions
  auth                   Riot and session helpers
  domain                 Bracket and balancing logic
  supabase               Browser, server, admin clients
types/
  database.ts            Database row/type definitions
supabase/
  migrations             PostgreSQL schema and RLS
```

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create a Supabase project and run the migration:

```bash
supabase db push
```

Or paste `supabase/migrations/0001_initial_schema.sql` into the Supabase SQL editor.

3. Copy environment variables:

```bash
cp .env.example .env.local
```

Fill in:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RIOT_CLIENT_ID`
- `RIOT_CLIENT_SECRET`
- `RIOT_REDIRECT_URI`
- `APP_AUTH_SECRET`

4. Configure Riot RSO callback URL to match `RIOT_REDIRECT_URI`.

5. Enable Discord in Supabase Auth Providers.

Add this URL to Supabase Auth redirect URLs:

```txt
http://localhost:3000/auth/supabase/callback
```

Add Supabase’s callback URL to the Discord Developer Portal:

```txt
https://<your-project-ref>.supabase.co/auth/v1/callback
```

For production, add your deployed app domain with `/auth/supabase/callback` to Supabase redirect URLs.

6. Start the app:

```bash
npm run dev
```

## Auth Notes

Supabase handles Discord OAuth directly. Riot RSO is bridged into Supabase Auth: the app uses Riot as the identity source, creates or finds a Supabase Auth user from the Riot PUUID, and signs that user into Supabase with a server-side deterministic bridge secret.

Use a strong `APP_AUTH_SECRET` in production and rotate it with care. If you later move to a native OIDC/custom-provider setup, the app database model can stay the same.

Discord-only accounts can sign in and edit their profile, but they must connect Riot Games from the profile page before joining tournament queues or registering for events. Riot-first users can optionally connect Discord from the profile page for future community and notification features.

### Local testing without Riot Production/RSO

If you only want to test app flows before Riot approves your production key, enable the built-in dev mock:

```dotenv
RIOT_DEV_MOCK=true
RIOT_DEV_MOCK_GAME_NAME=DevSummoner
RIOT_DEV_MOCK_TAG_LINE=EUW
```

Then click **Riot sign in**. In development, `/auth/riot` skips external OAuth and redirects to callback with a mock identity, so you can test profile/team/tournament functionality end-to-end.

Keep `RIOT_DEV_MOCK=false` in production.

## Tournament Skill Rating

TSR is intentionally simple:

```txt
Iron       100
Bronze     200
Silver     300
Gold       450
Platinum   650
Emerald    850
Diamond   1100
Master+   1500
```

The balancing algorithm groups solo and duo queue entries, sorts by combined TSR, assigns blocks greedily into teams of five, and adds a role-overlap penalty so generated teams are not just numerically balanced but playable.

## Verification

The current codebase passes:

```bash
npm run typecheck
npm run build
```

The production build was verified with placeholder environment variables. Real Supabase and Riot credentials are required for end-to-end auth and database flows.
