import type {
  BudgetCategory,
  CategorySummary,
  MonthlyBudget,
  MonthlySummary,
  Transaction,
} from '../../types/moneyTracker';
import { DEFAULT_CATEGORIES } from './constants';

const toCents = (n: number) => Math.round(n * 100);
const fromCents = (c: number) => c / 100;

type AmountRow = Pick<Transaction, 'amount' | 'transaction_type'>;

export function sumBy(rows: AmountRow[], type: 'expense' | 'saving'): number {
  let cents = 0;
  for (const r of rows) if (r.transaction_type === type) cents += toCents(r.amount);
  return fromCents(cents);
}

export function summaryFromTotals(
  budget: Pick<MonthlyBudget, 'id' | 'month' | 'total_amount'>,
  totalExpenses: number,
  totalSavings: number,
): MonthlySummary {
  const remaining = fromCents(toCents(budget.total_amount) - toCents(totalExpenses) - toCents(totalSavings));
  return {
    monthlyBudgetId: budget.id,
    month: budget.month,
    totalMoney: budget.total_amount,
    totalExpenses,
    totalSavings,
    remaining,
  };
}

/** Remaining = Total money - expenses - savings. Everything is derived from real transactions. */
export function computeMonthlySummary(
  budget: Pick<MonthlyBudget, 'id' | 'month' | 'total_amount'>,
  transactions: AmountRow[],
): MonthlySummary {
  return summaryFromTotals(budget, sumBy(transactions, 'expense'), sumBy(transactions, 'saving'));
}

export function computeCategorySummaries(
  categories: BudgetCategory[],
  transactions: Pick<Transaction, 'amount' | 'category_id'>[],
): CategorySummary[] {
  return categories.map((c) => {
    let usedCents = 0;
    let count = 0;
    for (const t of transactions) {
      if (t.category_id === c.id) {
        usedCents += toCents(t.amount);
        count += 1;
      }
    }
    const used = fromCents(usedCents);
    const budget = c.budget_amount;
    const hasBudget = budget > 0;
    const isOver = hasBudget && usedCents > toCents(budget);
    return {
      categoryId: c.id,
      name: c.name,
      type: c.type,
      budget,
      used,
      remaining: fromCents(toCents(budget) - usedCents),
      percentUsed: hasBudget ? (usedCents / toCents(budget)) * 100 : 0, // never divides by zero
      hasBudget,
      isOver,
      overBy: isOver ? fromCents(usedCents - toCents(budget)) : 0,
      transactionCount: count,
    };
  });
}

/** Default categories first (in their usual order), then custom ones by creation time. */
export function sortCategories(categories: BudgetCategory[]): BudgetCategory[] {
  const order = new Map(DEFAULT_CATEGORIES.map((c, i) => [c.name.toLowerCase(), i]));
  return [...categories].sort((a, b) => {
    const ai = order.get(a.name.toLowerCase());
    const bi = order.get(b.name.toLowerCase());
    if (ai !== undefined && bi !== undefined) return ai - bi;
    if (ai !== undefined) return -1;
    if (bi !== undefined) return 1;
    return a.created_at.localeCompare(b.created_at) || a.name.localeCompare(b.name);
  });
}

export function sortTransactions(rows: Transaction[]): Transaction[] {
  return [...rows].sort(
    (a, b) => b.transaction_date.localeCompare(a.transaction_date) || b.created_at.localeCompare(a.created_at),
  );
}

export function sortBudgetsNewestFirst(rows: MonthlyBudget[]): MonthlyBudget[] {
  return [...rows].sort((a, b) => b.month.localeCompare(a.month));
}
