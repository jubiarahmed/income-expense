# Expense Tracker

A mobile-first Progressive Web App for managing personal **income, expenses, transfers, shared bills, loans, borrowed/lent items, and recurring subscriptions** — built on a modern serverless stack with a private Postgres backing store.

> Live: `https://expense-tracker-theta-sooty-18.vercel.app`

---

## Table of Contents

1. [What's inside](#whats-inside)
2. [Feature tour](#feature-tour)
3. [Tech stack](#tech-stack)
4. [Architecture](#architecture)
5. [Data model](#data-model)
6. [API surface](#api-surface)
7. [Project layout](#project-layout)
8. [Local development](#local-development)
9. [Database migration & seeding](#database-migration--seeding)
10. [Environment variables](#environment-variables)
11. [Deployment](#deployment)
12. [Design system](#design-system)
13. [Roadmap](#roadmap)

---

## What's inside

Expense Tracker is more than a transactions list — it is a **personal finance OS** that captures every direction money flows in your life:

- 💸 **Expenses** across 31 categories (Shopping, Food, Phone, Entertainment, Education, Beauty, Sports, Social, Transportation, Clothing, Car, Alcohol, Cigarettes, Electronics, Travel, Health, Pets, Repairs, Housing, Home, Gifts, Donations, Lottery, Snacks, Kids, Vegetables, Fruits, Bills, Medicine, Recharge, Other)
- 💰 **Income** with categories (Salary, Investments, Part-Time, Bonus, Gift, Refund, Others)
- 🔁 **Transfers** between Cash / bKash / Nagad / Card / Bank, with optional fees
- 👥 **Shared expenses** with equal or custom splits, settlement tracking, and per-person balances
- 🤝 **Loans & dues** in either direction, with partial-payment tracking
- 📦 **Borrow / lend items** with due dates and return tracking
- 🔁 **Recurring subscriptions** (weekly / monthly / yearly) with monthly and yearly aggregates
- ⏰ **Reminders** for upcoming dues and renewals
- 🔐 **Multi-account auth** with PBKDF2 password hashing and HTTP-only session cookies
- 🛡️ **Superadmin console** to hold/release accounts, reset passwords, toggle public sign-up, and view (read-only) every user's complete data
- 🎨 Modern, accessible UI with light + dark + auto theme
- 📱 Installable PWA, offline-capable shell, safe-area aware on iOS/Android, pull-to-refresh, swipe-to-delete with undo, receipt photo capture

---

## Feature tour

| Area | Highlights |
|------|-----------|
| **Home (Dashboard)** | Period selector (this/last month, all-time) · Net balance hero · Income / Expense / Owed cards · Quick-add bar · 6-month income-vs-expense bar chart · Spending pie · Upcoming dues · Recent activity |
| **Records (Transactions)** | 4 tabs (Expense / Income / Transfer / Shared) · Date and category filters · Day-grouped lists · Receipt thumbnails · Swipe-to-delete with undo · Inline edit |
| **Add sheet** | Tabbed Expense / Income / Transfer chooser · 4-column icon grid · pick category and form pre-fills · "More" panel for shared expenses, loans, items, subscriptions, contacts, groups |
| **People** | Per-contact net balance · loan and shared-expense aggregates · phone & notes |
| **Obligations** | Loans, items, and subscriptions in one view · payment history · mark returned / settle |
| **Settings** | Currency · reminder lead time · light / dark / auto theme · enable notifications · export full snapshot · sign out |
| **Superadmin** | Stats, account list with statuses, hold/release, reset password, delete account, toggle public sign-up · per-account "View Data" with full raw snapshot |

---

## Tech stack

- **Frontend**: React 19, TypeScript, Vite 7, Tailwind CSS v4, Zustand (state), React Router 6, Recharts (charts), Lucide React (icons), date-fns, Zod (shared validation)
- **PWA**: vite-plugin-pwa (Workbox), Web App Manifest, offline shell
- **Backend**: Vercel serverless functions (`/api/*.ts`) using `@vercel/node`
- **Database**: Postgres (Supabase pooler in production)
- **Driver**: `pg` with a single global pool (warm across invocations)
- **Auth**: PBKDF2-SHA256 (150k iterations) password hashing · HMAC-tied session cookie · server-side `sessions` table
- **Validation**: shared Zod schemas in `src/domain/validation.ts` used by both client and server
- **Hosting**: Vercel
- **Analytics**: `@vercel/analytics`

---

## Architecture

```
┌────────────────────────────┐        ┌──────────────────────────────┐
│  PWA (React + Vite)        │  HTTPS │  Vercel Serverless API       │
│  ─────────────────────     │ ─────► │  ─────────────────────────   │
│  Zustand stores            │        │  /api/auth                   │
│   • useAuthStore           │ cookie │  /api/app                    │
│   • useFinanceStore        │ ◄───── │  /api/admin                  │
│   • useAdminStore          │        │  ───────────                  │
│   • useUiStore             │        │  Zod validation              │
│   • useToastStore          │        │  PBKDF2 auth + sessions      │
│  ─────────────────────     │        │  Single pg Pool (warm)       │
│  Tailwind UI components    │        └─────────┬────────────────────┘
│  PullToRefresh / SwipeRow  │                  │
│  Toaster / BottomSheet     │                  ▼
│  Service worker / Manifest │       ┌──────────────────────────────┐
└────────────────────────────┘       │  Postgres (Supabase pooler)  │
                                     │  accounts, sessions,         │
                                     │  preferences, contacts,      │
                                     │  expenses, incomes,          │
                                     │  transfers, shared_*,        │
                                     │  loans, loan_payments,       │
                                     │  item_records, subscriptions,│
                                     │  reminders, activity_logs    │
                                     └──────────────────────────────┘
```

### Request flow

1. Browser hits a route — Vite serves the PWA shell
2. `useAuthStore.init()` calls `GET /api/auth?action=session` to recover the user from the HTTP-only cookie
3. If signed in, `useFinanceStore.init()` calls `GET /api/app?action=snapshot`, which returns **everything** for that account (preferences + all entities + last 120 activity logs)
4. Mutations are POSTs to `/api/app?action=<verb>` — the server validates with Zod, writes to Postgres, and the client `reload()`s the snapshot
5. Superadmin reads come from `/api/admin?action=overview` and `/api/admin?action=userSnapshot&accountId=...`

### Action-router pattern

`/api/auth.ts`, `/api/app.ts`, and `/api/admin.ts` each export a single handler that branches on the `?action=` query (or the `action` field in the POST body). This keeps the function count low (key for serverless cold starts) while still mapping cleanly to verb-style operations like `addExpense`, `updatePreferences`, `holdAccount`.

---

## Data model

### Auth & platform

- `accounts(id, name, email, role, status, password_hash, password_salt, hold_reason, created_at, updated_at)` — `role` ∈ `user|superadmin`, `status` ∈ `active|held`
- `sessions(id, account_id, token_hash, expires_at, ...)` — HMAC-hashed cookie token; deleted on sign-out, hold, password reset
- `platform_settings(id='global', account_creation_enabled, updated_by, updated_at)`

### Per-account finance

| Table | Purpose |
|-------|---------|
| `preferences` | Currency, theme, reminder lead-time, notification toggle (one per account) |
| `contacts` | People you transact with (name, phone, notes) |
| `expenses` | Single-payer outgoings — category, amount, date, payment method, tags, optional receipt image (data URL, compressed client-side) |
| `incomes` | Money received — category, source, amount, date, payment method |
| `transfers` | Movements between payment methods — from, to, amount, fee, date |
| `shared_groups` | Named groups with participant IDs for splits |
| `shared_expenses` | Splits — payer, participants, equal or custom shares, settlement state |
| `loans` | Money lent or borrowed — direction, amount, due date, status |
| `loan_payments` | Partial repayments against a loan |
| `item_records` | Borrowed / lent things — direction, due date, returned state |
| `subscriptions` | Recurring bills — weekly / monthly / yearly, auto-renew, status |
| `reminders` | Scheduled reminders for any of the above |
| `activity_logs` | Append-only audit feed shown in the dashboard |

All finance tables `references accounts(id) on delete cascade`, so deleting an account in the superadmin console cleanly wipes their data.

---

## API surface

### `POST /api/auth?action=…`

| Action | Purpose |
|--------|---------|
| `signUp` | Create an account (respects `account_creation_enabled`) |
| `signIn` | Email + password, sets session cookie |
| `signOut` | Drops cookie + DB session |

### `GET /api/auth?action=…`

| Action | Purpose |
|--------|---------|
| `session` | Resolve current user from cookie |
| `registration` | Returns `{ accountCreationEnabled, accountCount }` |

### `/api/app` (auth required, account scoped)

- `GET ?action=snapshot` — full snapshot bundle
- `POST ?action=…`:
  - **Contacts**: `addContact`, `updateContact`, `deleteContact`
  - **Expenses**: `addExpense`, `updateExpense`, `deleteExpense`, `duplicateExpense`
  - **Incomes**: `addIncome`, `updateIncome`, `deleteIncome`
  - **Transfers**: `addTransfer`, `updateTransfer`, `deleteTransfer`
  - **Shared**: `addSharedGroup`, `updateSharedGroup`, `deleteSharedGroup`, `addSharedExpense`, `updateSharedExpense`, `deleteSharedExpense`, `toggleSharedExpenseSettled`
  - **Loans**: `addLoan`, `updateLoan`, `deleteLoan`, `addLoanPayment`, `deleteLoanPayment`
  - **Items**: `addItem`, `updateItem`, `deleteItem`, `markItemReturned`
  - **Subscriptions**: `addSubscription`, `updateSubscription`, `deleteSubscription`
  - **Settings**: `updatePreferences`, `dismissReminder`

### `/api/admin` (superadmin only)

- `GET ?action=overview` — accounts list + counts + platform stats + settings
- `GET ?action=userSnapshot&accountId=...` — full raw user snapshot (no anonymization, intentionally — superadmins see everything)
- `POST ?action=…`:
  - `toggleRegistration` — enable/disable public sign-up
  - `holdAccount` / `releaseAccount`
  - `clearAccountData` — wipe finance data, keep account
  - `resetPassword`
  - `deleteAccount` — cascade delete

---

## Project layout

```text
api/
  _lib/
    auth.ts          Sessions, password hashing, role gates
    db.ts            Single global pg Pool + transaction helper
    http.ts          Response helpers (ok / fail / setNoStore / readAction)
  auth.ts            Sign in, sign up, sign out, session, registration state
  app.ts             Authenticated finance CRUD and snapshot
  admin.ts           Superadmin overview + user snapshot + management

scripts/
  create-db.mjs      Local Postgres bootstrapper
  migrate.mjs        Idempotent schema migration (creates tables + indexes)
  seed-superadmin.mjs Seeds the default superadmin

src/
  components/
    layout/
      AppShell.tsx          Header + bottom tab bar + add FAB
      GlobalAddSheet.tsx    Tabbed Expense / Income / Transfer chooser
    ui/
      Button, Card, Form, BottomSheet, SegmentedControl,
      Badge, EmptyState, PullToRefresh, SwipeRow, Toaster
  domain/
    constants.ts            Categories, payment methods, currencies
    models.ts               TypeScript interfaces for every entity
    validation.ts           Shared Zod schemas
    categoryIcons.tsx       Icon + color registry for every category
  features/
    auth/AuthPage.tsx
    dashboard/DashboardPage.tsx
    transactions/
      TransactionsPage.tsx  Expense / Income / Transfer / Shared tabs
      ExpenseForm, IncomeForm, TransferForm, SharedExpenseForm, SharedGroupForm
    obligations/ObligationsPage.tsx + LoanForm, ItemForm, SubscriptionForm
    people/PeoplePage.tsx + ContactForm
    settings/SettingsPage.tsx
    admin/AdminPage.tsx + UserSnapshotView.tsx
  lib/
    api.ts                  fetch wrapper with consistent error handling
    calculations.ts         Totals, balances, monthly trends
    date.ts                 Date helpers
    money.ts                Currency formatting + rounding
    compressImage.ts        Canvas-based image compression for receipts
    usePullToRefresh.ts
  state/
    useAuthStore, useFinanceStore, useAdminStore, useUiStore, useToastStore
  App.tsx
  main.tsx
  index.css                 Theme tokens, gradients, animations
```

---

## Local development

### Prerequisites

- Node 20+
- Postgres 14+ (or a Supabase project)
- A `.env.local` file (see [Environment variables](#environment-variables))

### Install + run

```bash
npm install
node --env-file=.env.local scripts/migrate.mjs        # apply schema
node --env-file=.env.local scripts/seed-superadmin.mjs # create the superadmin
npm run dev                                            # Vite dev server
```

The serverless API runs locally via `vercel dev` (recommended for full-stack local):

```bash
npx vercel dev
```

### Useful scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Vite dev server |
| `npm run build` | Type check + production bundle (also generates the service worker) |
| `npm run preview` | Preview the built bundle |
| `npm run lint` | ESLint |
| `node --env-file=.env.local scripts/migrate.mjs` | Apply schema |
| `node --env-file=.env.local scripts/seed-superadmin.mjs` | Seed superadmin |

---

## Database migration & seeding

`scripts/migrate.mjs` is idempotent — it `create table if not exists` + `alter table … add column if not exists` for every entity, and creates supporting indexes. It is safe to re-run after every schema change. The script also auto-creates the `platform_settings` row.

Superadmin credentials default from `.env.local`:

```
SUPERADMIN_EMAIL=admin@expense.com
SUPERADMIN_PASSWORD=ChangeMe-2026!
SUPERADMIN_NAME=Expense Tracker Superadmin
```

Re-running the seed updates name + password if the email already exists.

---

## Environment variables

```env
# Postgres (Supabase pooler in prod, local socket in dev)
DATABASE_URL=postgres://user:pass@host:port/postgres
POSTGRES_SSL=true                 # required for Supabase

# Auth
AUTH_SECRET=<long random string>  # HMAC key for session token hashing

# Superadmin seed
SUPERADMIN_EMAIL=admin@expense.com
SUPERADMIN_PASSWORD=ChangeMe-2026!
SUPERADMIN_NAME=Expense Tracker Superadmin
```

In Vercel, set the same set in **Project Settings → Environment Variables** (Production + Preview).

---

## Deployment

The project is deployed on Vercel. Recommended flow:

1. `npm run build` locally to confirm a clean build
2. Push to `main` of the connected GitHub repo (`jubiarahmed/income-expense`)
3. Vercel auto-deploys; the alias `expense-tracker-theta-sooty-18.vercel.app` always points to the latest production deployment
4. Re-run the migration if the schema changed: `node --env-file=.env.local scripts/migrate.mjs` (the script targets whatever `DATABASE_URL` you pass)

For ad-hoc deploys, `npx vercel --prod --yes` works too.

---

## Design system

Colors map to *meaning*, not just decoration:

| Tone | Use |
|------|-----|
| **Indigo** (`indigo-600`) | Brand, primary actions, focused inputs |
| **Emerald** (`emerald-500/600`) | Income, positive balances |
| **Rose** (`rose-500/600`) | Expenses, destructive actions |
| **Sky** (`sky-500/600`) | Transfers |
| **Amber** | Warnings, due-soon |
| **Zinc** | Neutral surfaces, text, borders |

A few opinionated choices baked into `index.css`:

- Inter typeface with `font-variant-numeric: tabular-nums` on every monetary value
- Subtle gradients on the brand mark and balance hero (via `.gradient-brand` / `.gradient-balance`)
- Soft elevation: `shadow-[0_1px_2px_rgba(9,9,11,0.04)]` on cards, deeper on the bottom sheet
- All interactive surfaces hit a **48 px minimum** for touch (Material + iOS dual minimum)
- Safe-area helpers (`safe-top` / `safe-bottom`) for iOS notch and Android gesture bar
- A `shake-x` animation triggers on auth errors so the field is impossible to miss

The `categoryIcons.tsx` registry maps every expense and income category to a Lucide icon + a paired light/dark background and foreground class, so adding a new category is a single registry entry.

---

## Roadmap

- [ ] Budget envelopes per category (alerts when threshold approaches)
- [ ] CSV / PDF export
- [ ] Multi-currency conversion view
- [ ] Recurring auto-post for predictable salaries / rents
- [ ] OCR on receipts to pre-fill amount and merchant
- [ ] Web Push reminders (currently relies on browser-level Notifications)
- [ ] Per-account 2FA
- [ ] Sharing and read-only shared dashboards (e.g. a household)

---

## License

Private project. All rights reserved.
