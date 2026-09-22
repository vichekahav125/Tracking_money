# Money Tracker

A standalone Personal Monthly Money Tracker: React + TypeScript + Vite, Supabase (Postgres, Auth, RLS), Recharts.
Built as its own project so you can review or run it in isolation, then copy the pieces you want into your real app.

## 1. Database

Open the Supabase SQL Editor for your project and run the whole file:

```
supabase/migrations/001_money_tracker.sql
```

It is safe to re-run. It creates `monthly_budgets`, `budget_categories`, `transactions`, all constraints and
`ON DELETE CASCADE` relationships, and turns on Row Level Security with policies so a user can only ever read or
write their own data (checked by hand with a two-user attack test — see **Testing** below).

## 2. Environment

```bash
cp .env.example .env
```

`.env` already has your project's URL and publishable (anon) key filled in from what you gave me. The anon key is
safe in the browser — **never** put a `service_role` / secret key in this file or anywhere in frontend code.

## 3. Run it

```bash
npm install
npm run dev
```

Open the printed local URL. There's no existing login in this standalone project, so `/login` has a minimal
email + password form (Supabase Auth). Create an account there, then you land on `/money-tracker`.

Other commands:

```bash
npm run typecheck   # TypeScript, no emit
npm test            # Vitest — calculations, validation, filters, formatting, date math
npm run build        # production build to dist/
```

## What's implemented

- **Route:** `/money-tracker`, behind `ProtectedRoute` (redirects to `/login` when signed out).
- **Months:** create / edit / delete, duplicate-month prevention, month locked once it has transactions.
- **Default categories:** Food, Transport, Rental House, Water & Light, School Saving (saving), Skincare,
  Support Family, Other — all at a $0 budget, created automatically with every new month.
- **Categories:** add / edit / delete, duplicate names blocked per month, a category with transactions can't be
  deleted or have its type changed out from under those transactions.
- **Transactions:** add / edit / delete with validation (amount > 0, category must belong to the month, date must
  fall inside the month), search (description + category), filters (category / type / date range, all combine).
- **Calculations** (in `src/features/money-tracker/calculations.ts`, unit-tested): monthly summary, per-category
  used/remaining/percent (safe at a $0 budget), over-budget detection — all derived from real transaction rows,
  nothing hardcoded.
- **Charts:** spending-by-category donut, budget-vs-actual bar chart, monthly-overview comparison (once 2+ months
  exist) — Recharts, all from live data.
- **Monthly history:** every month, newest first, click to switch.
- **States:** loading spinners, friendly error banners (no raw DB errors reach the UI), empty states for "no month
  yet" and "no transactions yet", disabled buttons + "Saving…" text while a request is in flight.
- **Responsive:** down to 320px. Modals become bottom sheets on phones; the transaction table becomes stacked
  cards.

## Testing already done here

- `npm run typecheck` — clean.
- `npm test` — 21 tests pass, including the exact worked example from the spec: $500 total, $3.50 Food + $2
  Transport expenses, $20 School Saving → **expenses $5.50, savings $20, remaining $474.50**, with matching
  per-category used/remaining figures.
- `npm run build` — production build succeeds.
- The SQL migration was run against a real local Postgres (not Supabase's servers, which this environment can't
  reach) with a two-user simulation:
  - Alice's data is fully invisible to Bob (`SELECT`), and Bob's `UPDATE`/`DELETE`/`INSERT` attempts against
    Alice's rows are rejected — 0 rows affected or an error, and Alice's data was confirmed unchanged afterward.
  - Constraints verified live: duplicate month rejected, duplicate category name rejected (case-insensitive),
    negative budget rejected, invalid `type`/`transaction_type` rejected, `amount <= 0` rejected, a date outside
    the budget's month rejected, moving a month that already has transactions rejected.
  - Over-budget spending was confirmed to be **allowed** (the tracker reflects real spending, per Step 20).
  - Deleting a month was confirmed to cascade-delete its categories and transactions.

**Not tested here** (this sandbox can't reach `supabase.co`): actually signing up/in against your live Supabase
Auth, the browser UI end to end, and RLS through the real `anon`/`authenticated` JWTs Supabase issues (I used a
local stand-in for `auth.uid()` that behaves the same way, but the real thing is worth a quick click-through
yourself). Test at at least 320px, a tablet width, and desktop.

## Folder structure

```
src/
  lib/               supabase client, money/date formatting, friendly-error mapping
  types/              MonthlyBudget, BudgetCategory, Transaction, MonthlySummary, CategorySummary
  services/           moneyTrackerService.ts — every Supabase call for this feature lives here
  auth/               AuthContext, ProtectedRoute
  pages/              LoginPage (throwaway — see below)
  features/money-tracker/
    calculations.ts   pure functions: summaries, per-category math, sorting
    filters.ts         search + filter logic
    validation.ts       form validation (month, category, transaction)
    constants.ts        default categories, payment-method suggestions, chart colors
    hooks/useMoneyTracker.ts   Supabase → state → page (single source of truth)
    components/         MonthSelector, MonthlySummary, CategoryBudgetCard/List/Form,
                         TransactionForm/List/Filters, MonthlyHistory, charts, Modal,
                         DeleteConfirmation, loading/error/empty states
    MoneyTrackerPage.tsx
supabase/migrations/001_money_tracker.sql
```

## Merging into your real app

- `src/pages/LoginPage.tsx` and `src/auth/*` are only here so this project runs standalone — swap
  `ProtectedRoute`'s redirect target and `useAuth` for your real app's auth.
- Everything under `src/features/money-tracker/`, `src/services/moneyTrackerService.ts`,
  `src/types/moneyTracker.ts`, and `src/lib/{format,dates,errors}.ts` is meant to be copied over as-is.
- `src/lib/supabase.ts` — replace with your app's existing Supabase client.
- The CSS in `src/index.css` is plain, scoped by class name (`cat-card`, `txn-table`, …); reskin it to match your
  existing design system, or lift the class names into your existing stylesheet setup.
