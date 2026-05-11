# Expense Tracker

A mobile-first Progressive Web App that's a complete **personal money manager** — not just a transaction log. Track expenses, income, transfers, and shared splits; maintain real wallet balances; enforce category budgets; chase savings goals; analyze trends and merchants; manage debts with interest and statements; and let Splitwise-style settlement simplify who-owes-whom.

> **Live**: `https://expense-tracker-theta-sooty-18.vercel.app`

---

## Table of Contents

1. [Feature overview](#feature-overview)
2. [Tech stack](#tech-stack)
3. [Architecture](#architecture)
4. [Data model](#data-model)
5. [API surface](#api-surface)
6. [Project layout](#project-layout)
7. [Local development](#local-development)
8. [Database migration & seeding](#database-migration--seeding)
9. [Environment variables](#environment-variables)
10. [Deployment](#deployment)
11. [Testing](#testing)
12. [Observability](#observability)
13. [Design system](#design-system)
14. [Roadmap](#roadmap)

---

## Feature overview

### Money in / out
- **31 expense categories** with icons (Shopping, Food, Phone, Entertainment, Education, Beauty, Sports, Social, Transportation, Clothing, Car, Alcohol, Cigarettes, Electronics, Travel, Health, Pets, Repairs, Housing, Home, Gifts, Donations, Lottery, Snacks, Kids, Vegetables, Fruits, Bills, Medicine, Recharge, Other)
- **7 income categories** (Salary, Investments, Part-Time, Bonus, Gift, Refund, Others)
- **Transfers** between Cash / bKash / Nagad / Card / Bank with optional fees
- **Custom categories** anywhere — predefined ones stay, custom names are remembered across forms
- **Receipt photos** captured/uploaded and compressed client-side to ≤1280px at 70% JPEG
- **Merchant / payee** field with autocomplete from your history

### Manage every direction of money
- **Wallets** — Cash, bKash, Nagad, Card, Bank, Other each carry a real balance. Opening balance + income − expense + transfers in − transfers out − fees, computed live.
- **Budgets** — monthly per-category limits with custom warn-at threshold (50/70/80/90/100%). Animated progress bars: green → amber → red.
- **Goals** — savings targets with progress bars, optional deadline → daily-target hint, optional linked wallet, contribution log; auto-marked Completed when fully saved.
- **Shared expenses** (Splitwise-style) — groups, equal or custom splits, per-person settlement balances, **debt-simplification algorithm** suggests the minimum set of payments to settle everyone (at most N−1 transfers for N people), one-tap "Mark this payment settled" plus "Share summary" via Web Share API.
- **Loans / Due** — direction (lent / borrowed), due date, **interest** (none / flat % / APR % accruing daily), planned **installments count**, partial repayments. Outstanding adds accrued interest. Per-loan **Statement** and **Reminder** generators (SMS / WhatsApp friendly). Per-contact **Ledger** with summary block.
- **Borrowed / lent items** — direction, due date, one-tap returned
- **Subscriptions** — weekly / monthly / yearly with auto-renew advance, monthly + yearly aggregates

### Plan, analyze, predict
- **Dashboard** with period selector (this / last month / all time + month picker), gradient **balance hero** with wallets total, summary cards, **6-tile launchpad** (Wallets / Budgets / Goals / Reports / Calendar / Tags / Templates / Activity), **Smart insights**, spending pie, income-vs-expense 6-month bar chart, upcoming items, recent activity with relative timestamps.
- **Reports** — MoM deltas, savings rate, daily average, top notes/merchants, highest spending days, payment-method usage pie, month-over-month net.
- **Smart insights** (auto-detected from your data):
  - "You're spending faster than last month" (projected month-end)
  - Income drop alerts, savings-rate banners
  - Category spike detection (≥30% vs last month)
  - Possible duplicate expense detection
  - Approaching / over budget warnings
  - **Projected month-end balance** based on current daily average
- **Reminders** page (bell icon → red badge with count): overdue items, dues in the next 30 days, **recurring expense predictions** combining median-gap analysis for multi-occurrence series with single-occurrence cycle inference (monthly / bi-monthly / quarterly / annual). Each prediction has a confidence badge.
- **Calendar view** — month grid with per-day expense / income totals + dot indicators for due items and transfers. Tap a day for the full breakdown.

### Speed of use
- **Quick add** natural language ("120 lunch cash", "salary 50000 bank", "transfer 5000 bank to bkash") — detects intent, amount, payment method, category from a 100+ keyword dictionary including Bengali-context terms (uber, pathao, cng, kfc, daraz, bkash, nagad). Live preview pills + Add / Edit details actions.
- **Transaction templates** — save common entries (lunch, monthly recharge), apply with one tap. Tracks usage count and last-used date. Add sheet shows the most-recent templates as chips at the top.
- **Bulk actions** in Records — select mode, multi-select rows, then bulk delete / change category / change payment method / add tag / export as JSON.
- **Global + advanced search** — searches notes, category, source, payment methods, amount, and tags across expenses + incomes + transfers in one unified result list. Filter panel adds amount range, multi-category, multi-method, tag, merchant, receipt-attached, date range. **Saved filters** as chips at the top.
- **Pull to refresh** on every paginated screen.
- **Swipe-to-delete with undo** on Records rows.

### Organize
- **People** — per-contact net balance, money lent, money borrowed, shared balance, active items, overdue items. Per-contact ledger sharing.
- **Tag manager** — every unique tag with usage count, total spent, distinct categories. Inline rename (merges into existing tags), one-tap delete.
- **Activity log** — full audit trail with rich filters (entity type, action, date range, free-text search) and **paginated loading** beyond the 120-row snapshot.

### Settings & preferences
- Currency (BDT / USD / EUR / INR / GBP)
- **Light / Dark / Auto** theme (Auto follows OS `prefers-color-scheme`)
- **Notification preferences** — multi-select chips for remind-before-due (1d/3d/7d/14d), toggle switches for remind-on-due-date / remind-after-overdue / daily summary / weekly summary / budget warning / subscription renewal
- Export full snapshot as JSON
- PWA install detection

### Multi-tenant + superadmin
- PBKDF2-SHA256 password hashing (150k iterations), HMAC-tied session cookie, server-side sessions table
- Configurable public sign-up toggle
- **Superadmin console**: stats, account list with per-entity counts, hold / release / reset password / delete account, **View Data** read-only snapshot of any user's complete data (no anonymization)

---

## Tech stack

- **Frontend**: React 19, TypeScript, Vite 7, Tailwind CSS v4, Zustand (state), React Router 6 (lazy-loaded routes), Recharts (charts), Lucide React (icons), date-fns, Zod (shared validation)
- **PWA**: vite-plugin-pwa (Workbox), Web App Manifest, offline shell, 34-entry precache
- **Backend**: Vercel serverless functions (`/api/*.ts`) using `@vercel/node`, action-router pattern
- **Database**: Postgres (Supabase pooler in production)
- **Driver**: `pg` with a single global warm Pool
- **Auth**: PBKDF2-SHA256 (150k) password hashing · HMAC-tied session cookie · server-side `sessions` table
- **Observability**: Sentry (opt-in via `VITE_SENTRY_DSN`), `@vercel/analytics`
- **Validation**: shared Zod schemas in `src/domain/validation.ts` (client + server)
- **Hosting**: Vercel
- **Testing**: Playwright smoke tests against production

---

## Architecture

```
┌────────────────────────────┐        ┌──────────────────────────────┐
│  PWA (React + Vite)        │  HTTPS │  Vercel Serverless API       │
│  ─────────────────────     │ ─────► │  ─────────────────────────   │
│  Zustand stores            │        │  /api/auth                   │
│   • useAuthStore           │ cookie │  /api/app  (action router)   │
│   • useFinanceStore        │ ◄───── │  /api/admin                  │
│   • useAdminStore          │        │  ───────────                  │
│   • useUiStore             │        │  Zod validation              │
│   • useToastStore          │        │  PBKDF2 auth + sessions      │
│  ─────────────────────     │        │  Single pg Pool (warm)       │
│  Tailwind + lazy routes    │        └─────────┬────────────────────┘
│  Quick Add NLP parser      │                  │
│  Settlement algorithm      │                  ▼
│  Sentry error reporting    │       ┌──────────────────────────────┐
│  Service worker / Manifest │       │  Postgres (Supabase pooler)  │
└────────────────────────────┘       │  18 tables                   │
                                     └──────────────────────────────┘
```

### Request flow
1. Browser hits a route → Vite serves the PWA shell. Dashboard, Records, and Auth live in the initial bundle. Every secondary page is a separate chunk fetched on demand.
2. `useAuthStore.init()` calls `GET /api/auth?action=session` to recover the user from the HTTP-only cookie.
3. If signed in, `useFinanceStore.init()` calls `GET /api/app?action=snapshot`, which returns **everything** for that account (preferences + all entities + last 120 activity rows).
4. Mutations are POSTs to `/api/app?action=<verb>` — Zod validate, write to Postgres, then the client `reload()`s the snapshot.
5. Activity log viewer separately calls `GET /api/app?action=activities&before=<cursor>&limit=60` for pagination beyond the snapshot cap.

### Action-router pattern
`/api/auth.ts`, `/api/app.ts`, and `/api/admin.ts` each export a single handler that branches on the `?action=` query (or the `action` field in the POST body). Keeps the serverless function count low (cold-start friendly) while supporting verb-style operations (`addExpense`, `bulkUpdateExpenses`, `contributeToGoal`, `renameTag`, `holdAccount`...).

---

## Data model

**18 tables.** All entities cascade-delete from `accounts`.

### Auth & platform
- `accounts(id, name, email, role, status, password_hash, password_salt, hold_reason, created_at, updated_at)` — `role` ∈ `user|superadmin`, `status` ∈ `active|held`
- `sessions(id, account_id, token_hash, expires_at, …)` — HMAC-hashed cookie token; deleted on sign-out, hold, password reset
- `platform_settings(id='global', account_creation_enabled, updated_by, updated_at)`

### Per-account finance
| Table | Purpose |
|-------|---------|
| `preferences` | Currency, theme, reminder lead-time, notifications toggle, **notification_prefs jsonb** (per-event toggles) |
| `contacts` | People you transact with (name, phone, notes) |
| `expenses` | Outgoings — category, amount, date, payment method, tags, **merchant**, optional receipt image (data URL, compressed client-side) |
| `incomes` | Money received — category, source, amount, date, payment method |
| `transfers` | Movements between methods — from, to, amount, fee, date |
| `shared_groups` | Named groups with participant IDs |
| `shared_expenses` | Splits — payer, participants, equal or custom shares, settlement state |
| `loans` | Lent or borrowed money — direction, amount, due date, status, **interest_rate, interest_type ('none'/'flat'/'apr'), installments_count** |
| `loan_payments` | Partial repayments |
| `item_records` | Borrowed / lent things — direction, due date, returned state |
| `subscriptions` | Recurring bills — weekly / monthly / yearly, auto-renew, status |
| `reminders` | Scheduled reminders for any of the above |
| `activity_logs` | Append-only audit feed |
| `budgets` | One row per (account, category) with monthly_limit and notify_at threshold |
| `wallets` | One row per (account, payment method) with opening_balance + display name |
| `goals` | Savings targets — target_amount, saved_amount, optional wallet/deadline, status |
| `goal_contributions` | Log of contributions driving `goals.saved_amount` |
| `saved_filters` | Bookmarked record search filters (scope + jsonb query) |
| `transaction_templates` | Reusable transaction presets — name, kind, data jsonb, uses_count, last_used_at |

---

## API surface

### `POST /api/auth?action=…`
`signUp` (honors `account_creation_enabled`) · `signIn` (sets session cookie) · `signOut`

### `GET /api/auth?action=…`
`session` · `registration` (`{ accountCreationEnabled, accountCount }`)

### `/api/app` (auth required, account scoped)

**GET**
- `?action=snapshot` — full bundle (preferences, all entities, latest 120 activity rows)
- `?action=activities&before=<iso>&limit=60` — paginated activity log beyond the snapshot

**POST** (`?action=…`):

| Group | Actions |
|-------|---------|
| Contacts | `addContact`, `updateContact`, `deleteContact` |
| Expenses | `addExpense`, `updateExpense`, `deleteExpense`, `duplicateExpense`, **`bulkDeleteExpenses`**, **`bulkUpdateExpenses`** |
| Incomes | `addIncome`, `updateIncome`, `deleteIncome` |
| Transfers | `addTransfer`, `updateTransfer`, `deleteTransfer` |
| Shared | `addSharedGroup`, `updateSharedGroup`, `deleteSharedGroup`, `addSharedExpense`, `updateSharedExpense`, `deleteSharedExpense`, `toggleSharedExpenseSettled` |
| Loans | `addLoan`, `updateLoan`, `deleteLoan`, `addLoanPayment`, `deleteLoanPayment` |
| Items | `addItem`, `updateItem`, `deleteItem`, `markItemReturned` |
| Subscriptions | `addSubscription`, `updateSubscription`, `deleteSubscription` |
| Settings | `updatePreferences`, `dismissReminder` |
| Budgets | `addBudget`, `updateBudget`, `deleteBudget` |
| Wallets | `upsertWallet`, `deleteWallet` |
| Goals | `addGoal`, `updateGoal`, `deleteGoal`, `contributeToGoal`, `deleteGoalContribution` |
| Saved filters | `addSavedFilter`, `updateSavedFilter`, `deleteSavedFilter` |
| Tags | `renameTag` (merges if target exists), `deleteTag` |
| Templates | `addTemplate`, `updateTemplate`, `deleteTemplate`, `recordTemplateUse` |

### `/api/admin` (superadmin only)
- `GET ?action=overview` — accounts list + counts + platform stats + settings
- `GET ?action=userSnapshot&accountId=…` — full raw user snapshot
- POST: `toggleRegistration`, `holdAccount`, `releaseAccount`, `clearAccountData`, `resetPassword`, `deleteAccount`

---

## Project layout

```text
api/
  _lib/
    auth.ts          Sessions, password hashing, role gates
    db.ts            Single global pg Pool + transaction helper
    http.ts          Response helpers (ok / fail / setNoStore / readAction)
  auth.ts            Sign in / up / out / session / registration state
  app.ts             Authenticated CRUD + bulk + activity pagination
  admin.ts           Superadmin overview + user snapshot + management

scripts/
  create-db.mjs      Local Postgres bootstrapper
  migrate.mjs        Idempotent schema migration (18 tables, indexes, alter-column-if-not-exists)
  seed-superadmin.mjs Seeds the default superadmin

e2e/
  smoke.spec.ts      Playwright smoke tests (run against production)

src/
  app/ErrorBoundary.tsx  Crash screen + Sentry forwarding
  components/
    layout/
      AppShell.tsx          Header + bell icon + bottom tab bar + add FAB
      GlobalAddSheet.tsx    Tabbed Expense / Income / Transfer chooser + Quick add + templates
    ui/
      Button, Card, Form (incl. ChipButton), BottomSheet, SegmentedControl,
      Badge, EmptyState, PullToRefresh, SwipeRow, Toaster, QuickAddBar
  domain/
    constants.ts            Categories, payment methods, currencies
    models.ts               TypeScript interfaces for every entity
    validation.ts           Shared Zod schemas
    categoryIcons.tsx       Icon + color registry; hash-based fallback for custom names
    customCategories.ts     Merge predefined + history-derived categories
  features/
    auth/AuthPage.tsx
    dashboard/DashboardPage.tsx
    transactions/
      TransactionsPage.tsx      Expense / Income / Transfer / Shared tabs + global search + bulk actions
      ExpenseForm, IncomeForm, TransferForm, SharedExpenseForm, SharedGroupForm
      AdvancedSearchPanel       Filters + saved filters
      SettlementView            Splitwise-style settlement modal
    obligations/ObligationsPage.tsx + LoanForm (interest fields), ItemForm, SubscriptionForm
    people/PeoplePage.tsx + ContactForm  (with ledger share)
    reminders/RemindersPage.tsx
    budgets/BudgetsPage.tsx
    wallets/WalletsPage.tsx
    goals/GoalsPage.tsx
    reports/ReportsPage.tsx
    calendar/CalendarPage.tsx
    tags/TagsPage.tsx
    templates/TemplatesPage.tsx
    activity/ActivityPage.tsx     Paginated audit log viewer
    settings/SettingsPage.tsx
    admin/AdminPage.tsx + UserSnapshotView.tsx
  lib/
    api.ts                  fetch wrapper (forwards 5xx errors to Sentry)
    sentry.ts               Opt-in Sentry init (no-op without DSN)
    calculations.ts         Expense / income totals, loan interest, balances, monthly trends
    moneyAnalytics.ts       Wallets, budgets, goals, smart insights, reports queries
    reminders.ts            Upcoming reminders + recurring expense predictions
    settlement.ts           Net balances + debt-simplification algorithm
    debtStatements.ts       Loan statement / reminder / ledger text generators
    quickAdd.ts             Natural-language parser for quick-add bar
    date.ts                 Date helpers (formatRelativeDateTime, getMonthRange, …)
    money.ts                Currency formatting + rounding
    compressImage.ts        Canvas-based receipt compression (≤1280px, 0.7 JPEG)
    usePullToRefresh.ts
  state/
    useAuthStore, useFinanceStore, useAdminStore, useUiStore, useToastStore
  App.tsx                   Routes (lazy-loaded secondaries with Suspense)
  main.tsx
  index.css                 Theme tokens, gradients, animations
```

---

## Local development

### Prerequisites
- Node 20+
- Postgres 14+ (or a Supabase project)
- `.env.local` populated (see [Environment variables](#environment-variables))

### Install + run
```bash
npm install
npm run db:migrate          # apply schema (idempotent)
npm run db:seed             # create the superadmin
npm run dev                  # Vite dev server (frontend only)
# OR for full-stack local with serverless functions:
npx vercel dev
```

### Useful scripts
| Command | Purpose |
|---------|---------|
| `npm run dev` | Vite dev server |
| `npm run build` | Type check + production bundle + service worker |
| `npm run preview` | Preview the built bundle |
| `npm run lint` | ESLint |
| `npm run db:migrate` | Apply schema (safe to re-run) |
| `npm run db:seed` | Seed/refresh superadmin |
| `npm run test:e2e` | Playwright smoke tests against `E2E_BASE_URL` (default = production) |
| `npm run test:e2e:report` | Open last Playwright HTML report |

---

## Database migration & seeding

`scripts/migrate.mjs` is idempotent — `create table if not exists` for every entity + `alter table … add column if not exists` for new columns + indexes. Safe to re-run after every schema change. Always creates the `platform_settings` row.

Superadmin defaults from `.env.local`:
```
SUPERADMIN_EMAIL=admin@expense.com
SUPERADMIN_PASSWORD=ChangeMe-2026!
SUPERADMIN_NAME=Expense Tracker Superadmin
```

Re-running the seed updates the password if the email already exists.

---

## Environment variables

```env
# Postgres
DATABASE_URL=postgres://user:pass@host:port/postgres
POSTGRES_SSL=true                 # required for Supabase

# Auth
AUTH_SECRET=<long random string>  # HMAC key for session token hashing

# Superadmin seed
SUPERADMIN_EMAIL=admin@expense.com
SUPERADMIN_PASSWORD=ChangeMe-2026!
SUPERADMIN_NAME=Expense Tracker Superadmin

# Observability (optional)
VITE_SENTRY_DSN=https://...@sentry.io/...   # absent = Sentry stays disabled

# Playwright (optional)
E2E_BASE_URL=http://localhost:5173          # defaults to the live production URL
```

In Vercel, set the same set in **Project Settings → Environment Variables** (Production + Preview). `VITE_*` vars need to be set for the **Build** step (they're inlined at build time).

---

## Deployment

Vercel-hosted. Recommended flow:

1. `npm run build` locally to confirm a clean build
2. Push to `main` of `jubiarahmed/income-expense` — Vercel auto-deploys
3. The alias `expense-tracker-theta-sooty-18.vercel.app` always points to the latest production deployment
4. Re-run the migration if the schema changed: `npm run db:migrate`

For ad-hoc deploys, `npx vercel --prod --yes`.

---

## Testing

Playwright smoke tests (`e2e/smoke.spec.ts`) run against the live production build by default — no fixtures required:

- App boots and shows the auth screen for signed-out users
- Switching to Create reveals the name and confirm-password fields
- Sign-in form rejects an invalid email (native HTML5 validation)
- PWA manifest is served
- Service worker registration script is present
- A wrong sign-in returns a visible error alert

```bash
# Against live prod (default)
npm run test:e2e

# Against local dev
E2E_BASE_URL=http://localhost:5173 npm run test:e2e
```

Chromium only by default. Trace-on-first-retry; screenshot on failure.

---

## Observability

**Sentry** is wired but opt-in via `VITE_SENTRY_DSN`:
- Without a DSN: the SDK is initialized in no-op mode. Zero runtime cost.
- With a DSN: captures uncaught exceptions, the ErrorBoundary forwards crashes, and `apiFetch` forwards 5xx responses (4xx are user-visible validation, not reported).
- `tracesSampleRate: 0.1` (10%) by default. `replaysOnErrorSampleRate: 1.0` so any captured exception comes with a session replay.

To enable in production: set `VITE_SENTRY_DSN` in Vercel env, redeploy. The SDK is bundled either way (it's small after tree-shaking).

**Vercel Analytics** ships page-view metrics. No PII.

---

## Design system

Colors map to **meaning**, not just decoration:

| Tone | Use |
|------|-----|
| **Indigo** (`indigo-600`) | Brand, primary actions, focused inputs |
| **Emerald** (`emerald-500/600`) | Income, positive balances |
| **Rose** (`rose-500/600`) | Expenses, destructive actions |
| **Sky** (`sky-500/600`) | Transfers |
| **Pink** | Goals |
| **Violet** | Reports, Templates |
| **Amber** | Warnings, due-soon, Calendar |
| **Fuchsia** | Tags |
| **Zinc** | Neutral surfaces, text, borders |

A few opinionated choices baked into `index.css`:
- Inter typeface with `font-variant-numeric: tabular-nums` on every monetary value
- Gradient brand mark + balance hero (`.gradient-brand` / `.gradient-balance`)
- Soft elevation: `shadow-[0_1px_2px_rgba(9,9,11,0.04)]` on cards, deeper on the bottom sheet
- 48px minimum tap target on every interactive element (Material + iOS dual minimum)
- `safe-top` / `safe-bottom` for iOS notch and Android gesture bar
- `shake-x` animation on the auth error alert

The `categoryIcons.tsx` registry maps every predefined category to a Lucide icon + paired light/dark colors. Unknown / custom names get a **deterministic** color + Tag icon via a hash — so "Insurance" always looks the same.

---

## Roadmap

- [ ] Real Web Push notifications (VAPID + Vercel Cron) for scheduled reminders
- [ ] CSV / PDF export from Reports
- [ ] Multi-currency conversion view (daily FX cache)
- [ ] OCR on receipts to pre-fill amount and merchant
- [ ] First-run onboarding (wallets opening balances, default budgets)
- [ ] Per-account 2FA
- [ ] Read-only shared dashboards (household view)
- [ ] Accent color picker

---

## License

Private project. All rights reserved.
