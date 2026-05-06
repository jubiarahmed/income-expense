# Expense Tracker

Expense Tracker is a mobile-first Progressive Web App for personal expenses, shared expenses, informal loans, borrowed/lent items, and recurring bills. The app is built for Vercel hosting with a Postgres backend.

## Architecture

- React + TypeScript + Vite for the PWA frontend.
- Vercel `/api` serverless functions for backend endpoints.
- Postgres for accounts, sessions, admin controls, and finance data.
- Server-side email/password authentication with salted PBKDF2 hashes.
- HTTP-only session cookie.
- New regular accounts are seeded with editable demo finance data.
- Superadmin can manage accounts and view any user's data anonymized (read-only).
- Zustand stores call backend APIs and keep UI state.
- Tailwind CSS, React Router, Zod, date-fns, Recharts.

## Folder Structure

```text
api/
  _lib/              Postgres, auth, and HTTP helpers
  auth.ts            Sign up, sign in, sign out, session, registration state
  app.ts             Authenticated finance CRUD and snapshot API
  admin.ts           Superadmin account control + anonymized user data API
scripts/
  create-db.mjs      Creates local Postgres database if missing
  migrate.mjs        Creates/updates database schema
  seed-superadmin.mjs
src/
  components/        App shell and reusable UI
  domain/            Models, constants, validation schemas
  features/          Auth, dashboard, transactions, people, obligations, admin, settings
  lib/               Client API, date, money, calculations
  state/             Auth, finance, admin Zustand stores
public/
  icons/
  manifest.webmanifest
  offline.html
```

## Environment

`.env.local` is used for local development and is ignored by git.

Example:

```env
DATABASE_URL=postgres://postgres:your-local-password@localhost:5432/expense_tracker
AUTH_SECRET=replace-with-a-long-random-secret
SUPERADMIN_EMAIL=admin@expense.com
SUPERADMIN_PASSWORD=change-this-password
SUPERADMIN_NAME=Expense Tracker Superadmin
```

For Vercel, add equivalent environment variables in Project Settings.

Use a managed Postgres database for Vercel, such as Vercel Postgres, Neon, Supabase Postgres, or another hosted Postgres provider. A local Postgres database on your PC is only for development.

## Local Setup

Install dependencies:

```bash
npm install
```

Create DB, run schema, and seed the single superadmin:

```bash
npm run db:setup
```

Run the Vercel-compatible dev server:

```bash
npm run api:dev
```

Use the seeded superadmin:

```text
admin@expense.com
change-this-password
```

Change these values in `.env.local` before using real data.

## Build

```bash
npm run build
```

Lint:

```bash
npm run lint
```

## Deploy To Vercel

1. Push the repo to GitHub.
2. Create/provision a Postgres database.
3. Add these environment variables in Vercel:

   ```text
   DATABASE_URL
   AUTH_SECRET
   SUPERADMIN_EMAIL
   SUPERADMIN_PASSWORD
   SUPERADMIN_NAME
   POSTGRES_SSL=true
   ```

4. Run migrations and seed against the production database:

   ```bash
   npm run db:migrate
   npm run db:seed
   ```

5. Import the GitHub repository into Vercel and deploy.

## Superadmin

The superadmin is seeded from environment variables. Regular users cannot create or promote superadmins.

Superadmin can:

- permanently delete accounts and all owned data
- clear account-owned data while keeping the login
- put accounts on hold / release hold
- reset regular user passwords
- disable or enable new account creation globally
- view any user's finance data **anonymized** (read-only — no real names, emails, or contact identities are exposed)

Held accounts cannot sign in or load finance data. The seeded superadmin cannot hold, clear, delete, or reset its own account from the panel. Admin permissions are enforced in `api/admin.ts`, not only by frontend routing.

The superadmin experience is separated from the personal finance app. Superadmin sessions land on a platform dashboard with two tabs: account management and anonymized user data viewer.

## Current Limitations

- JSON import is not implemented in Postgres mode yet.
- Offline mode caches the app shell, but finance data requires the backend.
- Password recovery and email verification are not implemented.
- Full offline sync can be added later with IndexedDB as a cache and sync queue.
