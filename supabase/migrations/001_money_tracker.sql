-- =====================================================================
-- Money Tracker: monthly_budgets -> budget_categories -> transactions
-- Safe to run more than once. Run it in the Supabase SQL Editor.
-- =====================================================================

-- ---------- shared helper: keep updated_at fresh ----------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------- 1. monthly_budgets ----------
create table if not exists public.monthly_budgets (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid()
                  references auth.users (id) on delete cascade,
  month         date not null,
  total_amount  numeric(12,2) not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint monthly_budgets_total_amount_check check (total_amount >= 0),
  constraint monthly_budgets_month_first_day_check check (extract(day from month) = 1),
  constraint monthly_budgets_user_month_key unique (user_id, month)
);

-- ---------- 2. budget_categories ----------
create table if not exists public.budget_categories (
  id                 uuid primary key default gen_random_uuid(),
  monthly_budget_id  uuid not null
                       references public.monthly_budgets (id) on delete cascade,
  name               text not null,
  budget_amount      numeric(12,2) not null default 0,
  type               text not null default 'expense',
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint budget_categories_name_check check (char_length(btrim(name)) between 1 and 60),
  constraint budget_categories_budget_amount_check check (budget_amount >= 0),
  constraint budget_categories_type_check check (type in ('expense', 'saving')),
  -- lets transactions prove "this category belongs to this budget" at the FK level
  constraint budget_categories_id_budget_key unique (id, monthly_budget_id)
);

-- no duplicate category names inside the same month (case-insensitive)
create unique index if not exists budget_categories_budget_name_key
  on public.budget_categories (monthly_budget_id, lower(btrim(name)));

-- ---------- 3. transactions ----------
create table if not exists public.transactions (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null default auth.uid()
                       references auth.users (id) on delete cascade,
  monthly_budget_id  uuid not null
                       references public.monthly_budgets (id) on delete cascade,
  category_id        uuid not null,
  amount             numeric(12,2) not null,
  transaction_type   text not null,
  transaction_date   date not null,
  description        text,
  payment_method     text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint transactions_amount_check check (amount > 0),
  constraint transactions_type_check check (transaction_type in ('expense', 'saving')),
  constraint transactions_description_check check (description is null or char_length(description) <= 500),
  constraint transactions_payment_method_check check (payment_method is null or char_length(payment_method) <= 60),
  -- category_id -> budget_categories.id, AND the category must belong to the same budget.
  -- (NO ACTION on delete: a category that still has transactions cannot be removed by
  --  mistake, while deleting a whole month still cascades cleanly.)
  constraint transactions_category_budget_fkey
    foreign key (category_id, monthly_budget_id)
    references public.budget_categories (id, monthly_budget_id)
);

create index if not exists monthly_budgets_user_month_idx on public.monthly_budgets (user_id, month desc);
create index if not exists budget_categories_budget_idx   on public.budget_categories (monthly_budget_id);
create index if not exists transactions_budget_date_idx   on public.transactions (monthly_budget_id, transaction_date desc);
create index if not exists transactions_category_idx      on public.transactions (category_id);
create index if not exists transactions_user_idx          on public.transactions (user_id);

-- ---------- triggers ----------
drop trigger if exists set_updated_at on public.monthly_budgets;
create trigger set_updated_at before update on public.monthly_budgets
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.budget_categories;
create trigger set_updated_at before update on public.budget_categories
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.transactions;
create trigger set_updated_at before update on public.transactions
  for each row execute function public.set_updated_at();

-- A transaction date must fall inside its budget's month.
create or replace function public.transactions_validate_date()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  b_month date;
begin
  select month into b_month from public.monthly_budgets where id = new.monthly_budget_id;
  if b_month is null then
    raise exception 'budget_not_found' using errcode = '23503';
  end if;
  if new.transaction_date < b_month
     or new.transaction_date >= (b_month + interval '1 month')::date then
    raise exception 'date_outside_month' using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists transactions_validate_date on public.transactions;
create trigger transactions_validate_date
  before insert or update on public.transactions
  for each row execute function public.transactions_validate_date();

-- A month that already has transactions cannot be moved to another month.
create or replace function public.monthly_budgets_guard_month_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.month is distinct from old.month
     and exists (select 1 from public.transactions t where t.monthly_budget_id = old.id) then
    raise exception 'month_has_transactions' using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists monthly_budgets_guard_month_change on public.monthly_budgets;
create trigger monthly_budgets_guard_month_change
  before update of month on public.monthly_budgets
  for each row execute function public.monthly_budgets_guard_month_change();

-- ---------- privileges: signed-in users only ----------
revoke all on public.monthly_budgets, public.budget_categories, public.transactions from anon;
grant select, insert, update, delete
  on public.monthly_budgets, public.budget_categories, public.transactions to authenticated;

-- ---------- Row Level Security (mandatory) ----------
alter table public.monthly_budgets   enable row level security;
alter table public.budget_categories enable row level security;
alter table public.transactions      enable row level security;

-- monthly_budgets: own rows only
drop policy if exists "monthly_budgets_select_own" on public.monthly_budgets;
drop policy if exists "monthly_budgets_insert_own" on public.monthly_budgets;
drop policy if exists "monthly_budgets_update_own" on public.monthly_budgets;
drop policy if exists "monthly_budgets_delete_own" on public.monthly_budgets;

create policy "monthly_budgets_select_own" on public.monthly_budgets
  for select to authenticated using (user_id = (select auth.uid()));
create policy "monthly_budgets_insert_own" on public.monthly_budgets
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "monthly_budgets_update_own" on public.monthly_budgets
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "monthly_budgets_delete_own" on public.monthly_budgets
  for delete to authenticated using (user_id = (select auth.uid()));

-- budget_categories: only categories whose parent budget belongs to the user
drop policy if exists "budget_categories_select_own" on public.budget_categories;
drop policy if exists "budget_categories_insert_own" on public.budget_categories;
drop policy if exists "budget_categories_update_own" on public.budget_categories;
drop policy if exists "budget_categories_delete_own" on public.budget_categories;

create policy "budget_categories_select_own" on public.budget_categories
  for select to authenticated using (
    exists (select 1 from public.monthly_budgets b
            where b.id = budget_categories.monthly_budget_id
              and b.user_id = (select auth.uid())));
create policy "budget_categories_insert_own" on public.budget_categories
  for insert to authenticated with check (
    exists (select 1 from public.monthly_budgets b
            where b.id = budget_categories.monthly_budget_id
              and b.user_id = (select auth.uid())));
create policy "budget_categories_update_own" on public.budget_categories
  for update to authenticated
  using (
    exists (select 1 from public.monthly_budgets b
            where b.id = budget_categories.monthly_budget_id
              and b.user_id = (select auth.uid())))
  with check (
    exists (select 1 from public.monthly_budgets b
            where b.id = budget_categories.monthly_budget_id
              and b.user_id = (select auth.uid())));
create policy "budget_categories_delete_own" on public.budget_categories
  for delete to authenticated using (
    exists (select 1 from public.monthly_budgets b
            where b.id = budget_categories.monthly_budget_id
              and b.user_id = (select auth.uid())));

-- transactions: own rows, in an own budget, in a category of that same budget
drop policy if exists "transactions_select_own" on public.transactions;
drop policy if exists "transactions_insert_own" on public.transactions;
drop policy if exists "transactions_update_own" on public.transactions;
drop policy if exists "transactions_delete_own" on public.transactions;

create policy "transactions_select_own" on public.transactions
  for select to authenticated using (user_id = (select auth.uid()));

create policy "transactions_insert_own" on public.transactions
  for insert to authenticated with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.monthly_budgets b
                where b.id = transactions.monthly_budget_id
                  and b.user_id = (select auth.uid()))
    and exists (select 1 from public.budget_categories c
                where c.id = transactions.category_id
                  and c.monthly_budget_id = transactions.monthly_budget_id));

create policy "transactions_update_own" on public.transactions
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.monthly_budgets b
                where b.id = transactions.monthly_budget_id
                  and b.user_id = (select auth.uid()))
    and exists (select 1 from public.budget_categories c
                where c.id = transactions.category_id
                  and c.monthly_budget_id = transactions.monthly_budget_id));

create policy "transactions_delete_own" on public.transactions
  for delete to authenticated using (user_id = (select auth.uid()));
