import type { BudgetCategory, Transaction, TransactionType } from '../../types/moneyTracker';

export interface TransactionFilterState {
  search: string;
  categoryId: string; // 'all' or a category id
  type: 'all' | TransactionType;
  from: string; // '' or YYYY-MM-DD
  to: string;
}

export const EMPTY_FILTERS: TransactionFilterState = { search: '', categoryId: 'all', type: 'all', from: '', to: '' };

export function hasActiveFilters(f: TransactionFilterState): boolean {
  return f.search.trim() !== '' || f.categoryId !== 'all' || f.type !== 'all' || f.from !== '' || f.to !== '';
}

/** All filters combine (AND). Search matches the description or the category name. */
export function filterTransactions(
  transactions: Transaction[],
  categories: BudgetCategory[],
  f: TransactionFilterState,
): Transaction[] {
  const names = new Map(categories.map((c) => [c.id, c.name.toLowerCase()]));
  const q = f.search.trim().toLowerCase();
  return transactions.filter((t) => {
    if (f.categoryId !== 'all' && t.category_id !== f.categoryId) return false;
    if (f.type !== 'all' && t.transaction_type !== f.type) return false;
    if (f.from && t.transaction_date < f.from) return false;
    if (f.to && t.transaction_date > f.to) return false;
    if (q) {
      const inDescription = (t.description ?? '').toLowerCase().includes(q);
      const inCategory = (names.get(t.category_id) ?? '').includes(q);
      if (!inDescription && !inCategory) return false;
    }
    return true;
  });
}
