import { parseMoneyInput } from '../../lib/format';
import { isDateInMonth } from '../../lib/dates';
import type { BudgetCategory, CategoryInput, MonthInput, MonthlyBudget, TransactionInput } from '../../types/moneyTracker';

export type FieldErrors<K extends string = string> = Partial<Record<K, string>>;

export interface ValidationResult<T, K extends string> {
  value?: T;
  errors: FieldErrors<K>;
}

/* ---------- month ---------- */

export function validateMonthForm(
  raw: { month: string; total: string },
  existing: MonthlyBudget[],
  editingId?: string,
): ValidationResult<MonthInput, 'month' | 'total'> {
  const errors: FieldErrors<'month' | 'total'> = {};
  if (!/^\d{4}-\d{2}-01$/.test(raw.month)) errors.month = 'Choose a month.';
  else if (existing.some((b) => b.month === raw.month && b.id !== editingId))
    errors.month = 'This month already exists.';

  const total = parseMoneyInput(raw.total);
  if (raw.total.trim() === '') errors.total = 'Enter your total money for this month.';
  else if (total === null) errors.total = 'Please enter a valid amount, like 500 or 500.00.';

  if (Object.keys(errors).length) return { errors };
  return { errors, value: { month: raw.month, total_amount: total as number } };
}

/* ---------- category ---------- */

export function validateCategoryForm(
  raw: { name: string; budget: string; type: string },
  existing: BudgetCategory[],
  editingId?: string,
): ValidationResult<CategoryInput, 'name' | 'budget' | 'type'> {
  const errors: FieldErrors<'name' | 'budget' | 'type'> = {};
  const name = raw.name.trim().replace(/\s+/g, ' ');
  if (!name) errors.name = 'Enter a category name.';
  else if (name.length > 60) errors.name = 'Use 60 characters or fewer.';
  else if (existing.some((c) => c.id !== editingId && c.name.trim().toLowerCase() === name.toLowerCase()))
    errors.name = 'A category with this name already exists this month.';

  const budget = raw.budget.trim() === '' ? 0 : parseMoneyInput(raw.budget);
  if (budget === null) errors.budget = 'Please enter a valid amount, like 100 or 100.00.';

  if (raw.type !== 'expense' && raw.type !== 'saving') errors.type = 'Choose expense or saving.';

  if (Object.keys(errors).length) return { errors };
  return { errors, value: { name, budget_amount: budget as number, type: raw.type as 'expense' | 'saving' } };
}

/* ---------- transaction ---------- */

export function validateTransactionForm(
  raw: {
    amount: string;
    categoryId: string;
    type: string;
    date: string;
    description: string;
    paymentMethod: string;
  },
  categories: BudgetCategory[],
  monthStart: string,
): ValidationResult<TransactionInput, 'amount' | 'categoryId' | 'type' | 'date' | 'description' | 'paymentMethod'> {
  const errors: FieldErrors<'amount' | 'categoryId' | 'type' | 'date' | 'description' | 'paymentMethod'> = {};

  const amount = parseMoneyInput(raw.amount);
  if (raw.amount.trim() === '') errors.amount = 'Enter an amount.';
  else if (amount === null || amount <= 0) errors.amount = 'Please enter a valid amount greater than $0.';

  if (!raw.categoryId) errors.categoryId = 'Choose a category.';
  else if (!categories.some((c) => c.id === raw.categoryId)) errors.categoryId = 'Choose a category from this month.';

  if (raw.type !== 'expense' && raw.type !== 'saving') errors.type = 'Choose expense or saving.';

  if (!raw.date) errors.date = 'Choose a date.';
  else if (!isDateInMonth(raw.date, monthStart)) errors.date = 'The date must be inside the selected month.';

  if (raw.description.length > 500) errors.description = 'Use 500 characters or fewer.';
  if (raw.paymentMethod.length > 60) errors.paymentMethod = 'Use 60 characters or fewer.';

  if (Object.keys(errors).length) return { errors };
  return {
    errors,
    value: {
      category_id: raw.categoryId,
      amount: amount as number,
      transaction_type: raw.type as 'expense' | 'saving',
      transaction_date: raw.date,
      description: raw.description.trim() || null,
      payment_method: raw.paymentMethod.trim() || null,
    },
  };
}
