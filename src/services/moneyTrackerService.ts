import { supabase } from '../lib/supabase';
import { ServiceError, toServiceError } from '../lib/errors';
import { isDateInMonth } from '../lib/dates';
import {
  computeCategorySummaries,
  computeMonthlySummary,
  sortBudgetsNewestFirst,
  sortCategories,
  sortTransactions,
  summaryFromTotals,
  sumBy,
} from '../features/money-tracker/calculations';
import { DEFAULT_CATEGORIES } from '../features/money-tracker/constants';
import type {
  BudgetCategory,
  CategoryInput,
  CategorySummary,
  MonthInput,
  MonthlyBudget,
  MonthlySummary,
  Transaction,
  TransactionInput,
} from '../types/moneyTracker';

/**
 * Every Supabase call for the Money Tracker goes through this file.
 * Ownership is enforced by Row Level Security in the database, never by trusting ids from the UI.
 */

const PAGE = 1000; // Supabase returns at most 1000 rows per request

/* ---------- row normalisers (numeric columns may arrive as strings) ---------- */

type Row = Record<string, unknown>;

const toBudget = (r: Row): MonthlyBudget => ({ ...(r as unknown as MonthlyBudget), total_amount: Number(r.total_amount) });
const toCategory = (r: Row): BudgetCategory => ({ ...(r as unknown as BudgetCategory), budget_amount: Number(r.budget_amount) });
const toTransaction = (r: Row): Transaction => ({ ...(r as unknown as Transaction), amount: Number(r.amount) });

/* ---------- helpers ---------- */

async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new ServiceError('Your session has expired. Please sign in again.', 'auth');
  return data.user.id;
}

type PageResult = PromiseLike<{ data: unknown[] | null; error: unknown }>;

async function fetchAllRows(page: (from: number, to: number) => PageResult): Promise<Row[]> {
  const out: Row[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1);
    if (error) throw error;
    const rows = (data ?? []) as Row[];
    out.push(...rows);
    if (rows.length < PAGE) break;
  }
  return out;
}

async function countTransactions(filter: { monthlyBudgetId?: string; categoryId?: string }): Promise<number> {
  let q = supabase.from('transactions').select('id', { count: 'exact', head: true });
  if (filter.monthlyBudgetId) q = q.eq('monthly_budget_id', filter.monthlyBudgetId);
  if (filter.categoryId) q = q.eq('category_id', filter.categoryId);
  const { count, error } = await q;
  if (error) throw error;
  return count ?? 0;
}

const LOAD_FAIL = 'Unable to load your money data.';

/* =====================================================================
   Monthly budgets
   ===================================================================== */

export async function getMonthlyBudgets(): Promise<MonthlyBudget[]> {
  try {
    const rows = await fetchAllRows((from, to) =>
      supabase.from('monthly_budgets').select('*').order('month', { ascending: false }).range(from, to),
    );
    return sortBudgetsNewestFirst(rows.map(toBudget));
  } catch (err) {
    throw toServiceError(err, { fallback: LOAD_FAIL });
  }
}

export async function getMonthlyBudget(month: string): Promise<MonthlyBudget | null> {
  try {
    const { data, error } = await supabase.from('monthly_budgets').select('*').eq('month', month).maybeSingle();
    if (error) throw error;
    return data ? toBudget(data as Row) : null;
  } catch (err) {
    throw toServiceError(err, { fallback: LOAD_FAIL });
  }
}

/** Creates the month, then its default categories (all with a $0 budget). */
export async function createMonthlyBudget(
  input: MonthInput,
): Promise<{ budget: MonthlyBudget; categories: BudgetCategory[] }> {
  const friendly = { fallback: 'Unable to create the month.', duplicate: 'This month already exists.' };
  let createdId: string | null = null;
  try {
    const userId = await requireUserId();

    if (await getMonthlyBudget(input.month)) throw new ServiceError('This month already exists.', '23505');

    const { data, error } = await supabase
      .from('monthly_budgets')
      .insert({ user_id: userId, month: input.month, total_amount: input.total_amount })
      .select()
      .single();
    if (error) throw error;
    const budget = toBudget(data as Row);
    createdId = budget.id;

    const { data: cats, error: catError } = await supabase
      .from('budget_categories')
      .insert(
        DEFAULT_CATEGORIES.map((c) => ({
          monthly_budget_id: budget.id,
          name: c.name,
          type: c.type,
          budget_amount: 0,
        })),
      )
      .select();
    if (catError) throw catError;

    return { budget, categories: sortCategories(((cats ?? []) as Row[]).map(toCategory)) };
  } catch (err) {
    // Roll back a half-created month so the user can simply try again.
    if (createdId) await supabase.from('monthly_budgets').delete().eq('id', createdId);
    throw toServiceError(err, friendly);
  }
}

export async function updateMonthlyBudget(id: string, patch: Partial<MonthInput>): Promise<MonthlyBudget> {
  const friendly = { fallback: 'Unable to update the month.', duplicate: 'This month already exists.' };
  try {
    if (patch.month !== undefined) {
      const clash = await getMonthlyBudget(patch.month);
      if (clash && clash.id !== id) throw new ServiceError('This month already exists.', '23505');
      const current = await supabase.from('monthly_budgets').select('month').eq('id', id).maybeSingle();
      if (current.error) throw current.error;
      if (current.data && (current.data as Row).month !== patch.month && (await countTransactions({ monthlyBudgetId: id })) > 0) {
        throw new ServiceError('This month already has transactions, so its month cannot be changed.', 'month_has_transactions');
      }
    }
    const { data, error } = await supabase.from('monthly_budgets').update(patch).eq('id', id).select().single();
    if (error) throw error;
    return toBudget(data as Row);
  } catch (err) {
    throw toServiceError(err, friendly);
  }
}

/** Deletes the month; categories and transactions are removed by ON DELETE CASCADE. */
export async function deleteMonthlyBudget(id: string): Promise<void> {
  try {
    const { data, error } = await supabase.from('monthly_budgets').delete().eq('id', id).select('id');
    if (error) throw error;
    if (!data || data.length === 0) throw new ServiceError('Unable to delete the month.');
  } catch (err) {
    throw toServiceError(err, { fallback: 'Unable to delete the month.' });
  }
}

/* =====================================================================
   Categories
   ===================================================================== */

export async function getCategories(monthlyBudgetId: string): Promise<BudgetCategory[]> {
  try {
    const rows = await fetchAllRows((from, to) =>
      supabase.from('budget_categories').select('*').eq('monthly_budget_id', monthlyBudgetId).range(from, to),
    );
    return sortCategories(rows.map(toCategory));
  } catch (err) {
    throw toServiceError(err, { fallback: LOAD_FAIL });
  }
}

export async function createCategory(monthlyBudgetId: string, input: CategoryInput): Promise<BudgetCategory> {
  try {
    const { data, error } = await supabase
      .from('budget_categories')
      .insert({ monthly_budget_id: monthlyBudgetId, ...input })
      .select()
      .single();
    if (error) throw error;
    return toCategory(data as Row);
  } catch (err) {
    throw toServiceError(err, {
      fallback: 'Unable to save the category.',
      duplicate: 'A category with this name already exists this month.',
    });
  }
}

export async function updateCategory(id: string, patch: Partial<CategoryInput>): Promise<BudgetCategory> {
  try {
    if (patch.type !== undefined) {
      const { data, error } = await supabase.from('budget_categories').select('type').eq('id', id).maybeSingle();
      if (error) throw error;
      if (data && (data as Row).type !== patch.type && (await countTransactions({ categoryId: id })) > 0) {
        throw new ServiceError('This category already has transactions, so its type cannot be changed.');
      }
    }
    const { data, error } = await supabase.from('budget_categories').update(patch).eq('id', id).select().single();
    if (error) throw error;
    return toCategory(data as Row);
  } catch (err) {
    throw toServiceError(err, {
      fallback: 'Unable to save the category.',
      duplicate: 'A category with this name already exists this month.',
    });
  }
}

export async function deleteCategory(id: string): Promise<void> {
  try {
    if ((await countTransactions({ categoryId: id })) > 0) {
      throw new ServiceError('This category has transactions. Delete or move them first.', 'in_use');
    }
    const { data, error } = await supabase.from('budget_categories').delete().eq('id', id).select('id');
    if (error) throw error;
    if (!data || data.length === 0) throw new ServiceError('Unable to delete the category.');
  } catch (err) {
    throw toServiceError(err, {
      fallback: 'Unable to delete the category.',
      inUse: 'This category has transactions. Delete or move them first.',
    });
  }
}

/* =====================================================================
   Transactions
   ===================================================================== */

export async function getTransactions(monthlyBudgetId: string): Promise<Transaction[]> {
  try {
    const rows = await fetchAllRows((from, to) =>
      supabase
        .from('transactions')
        .select('*')
        .eq('monthly_budget_id', monthlyBudgetId)
        .order('transaction_date', { ascending: false })
        .order('created_at', { ascending: false })
        .range(from, to),
    );
    return sortTransactions(rows.map(toTransaction));
  } catch (err) {
    throw toServiceError(err, { fallback: LOAD_FAIL });
  }
}

/** Confirms the month exists (and is the user's, via RLS), the category belongs to it, and the date fits. */
async function assertMonthAndCategory(monthlyBudgetId: string, input: TransactionInput): Promise<void> {
  const [budget, category] = await Promise.all([
    supabase.from('monthly_budgets').select('month').eq('id', monthlyBudgetId).maybeSingle(),
    supabase
      .from('budget_categories')
      .select('id')
      .eq('id', input.category_id)
      .eq('monthly_budget_id', monthlyBudgetId)
      .maybeSingle(),
  ]);
  if (budget.error) throw budget.error;
  if (category.error) throw category.error;
  if (!budget.data) throw new ServiceError('This month could not be found.');
  if (!category.data) throw new ServiceError('Please choose a category from this month.');
  if (!isDateInMonth(input.transaction_date, (budget.data as Row).month as string)) {
    throw new ServiceError('The date must be inside the selected month.');
  }
}

export async function createTransaction(monthlyBudgetId: string, input: TransactionInput): Promise<Transaction> {
  try {
    const userId = await requireUserId();
    await assertMonthAndCategory(monthlyBudgetId, input);
    const { data, error } = await supabase
      .from('transactions')
      .insert({ user_id: userId, monthly_budget_id: monthlyBudgetId, ...input })
      .select()
      .single();
    if (error) throw error;
    return toTransaction(data as Row);
  } catch (err) {
    throw toServiceError(err, { fallback: 'Unable to save the transaction.' });
  }
}

export async function updateTransaction(
  id: string,
  monthlyBudgetId: string,
  input: TransactionInput,
): Promise<Transaction> {
  try {
    await assertMonthAndCategory(monthlyBudgetId, input);
    const { data, error } = await supabase.from('transactions').update(input).eq('id', id).select().single();
    if (error) throw error;
    return toTransaction(data as Row);
  } catch (err) {
    throw toServiceError(err, { fallback: 'Unable to update the transaction.' });
  }
}

export async function deleteTransaction(id: string): Promise<void> {
  try {
    const { data, error } = await supabase.from('transactions').delete().eq('id', id).select('id');
    if (error) throw error;
    if (!data || data.length === 0) throw new ServiceError('Unable to delete the transaction.');
  } catch (err) {
    throw toServiceError(err, { fallback: 'Unable to delete the transaction.' });
  }
}

/* =====================================================================
   Summaries (always computed from the real rows)
   ===================================================================== */

/** Summary for every month, newest first. Pass already-loaded budgets to skip one query. */
export async function getMonthlySummaries(budgets?: MonthlyBudget[]): Promise<MonthlySummary[]> {
  try {
    const list = budgets ?? (await getMonthlyBudgets());
    const rows = await fetchAllRows((from, to) =>
      supabase
        .from('transactions')
        .select('id, monthly_budget_id, transaction_type, amount')
        .order('id')
        .range(from, to),
    );
    const byBudget = new Map<string, { amount: number; transaction_type: 'expense' | 'saving' }[]>();
    for (const r of rows) {
      const key = r.monthly_budget_id as string;
      const bucket = byBudget.get(key) ?? [];
      bucket.push({ amount: Number(r.amount), transaction_type: r.transaction_type as 'expense' | 'saving' });
      byBudget.set(key, bucket);
    }
    return sortBudgetsNewestFirst(list).map((b) => {
      const txns = byBudget.get(b.id) ?? [];
      return summaryFromTotals(b, sumBy(txns, 'expense'), sumBy(txns, 'saving'));
    });
  } catch (err) {
    throw toServiceError(err, { fallback: LOAD_FAIL });
  }
}

export async function getMonthlySummary(monthlyBudgetId: string): Promise<MonthlySummary> {
  try {
    const { data, error } = await supabase.from('monthly_budgets').select('*').eq('id', monthlyBudgetId).single();
    if (error) throw error;
    const txns = await getTransactions(monthlyBudgetId);
    return computeMonthlySummary(toBudget(data as Row), txns);
  } catch (err) {
    throw toServiceError(err, { fallback: LOAD_FAIL });
  }
}

export async function getCategorySummary(monthlyBudgetId: string): Promise<CategorySummary[]> {
  const [categories, txns] = await Promise.all([getCategories(monthlyBudgetId), getTransactions(monthlyBudgetId)]);
  return computeCategorySummaries(categories, txns);
}
