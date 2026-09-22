import { describe, expect, it } from 'vitest';
import { computeCategorySummaries, computeMonthlySummary, sortCategories } from './calculations';
import { EMPTY_FILTERS, filterTransactions } from './filters';
import { validateCategoryForm, validateMonthForm, validateTransactionForm } from './validation';
import { formatMoney, parseMoneyInput } from '../../lib/format';
import { defaultDateForMonth, isDateInMonth, monthEnd } from '../../lib/dates';
import type { BudgetCategory, MonthlyBudget, Transaction } from '../../types/moneyTracker';

const now = '2026-09-01T00:00:00Z';
const budget: MonthlyBudget = { id: 'b1', user_id: 'u1', month: '2026-09-01', total_amount: 500, created_at: now, updated_at: now };

const cat = (id: string, name: string, amount: number, type: 'expense' | 'saving' = 'expense'): BudgetCategory => ({
  id, monthly_budget_id: 'b1', name, budget_amount: amount, type, created_at: now, updated_at: now,
});

const categories = [
  cat('food', 'Food', 100),
  cat('transport', 'Transport', 50),
  cat('rent', 'Rental House', 120),
  cat('water', 'Water & Light', 30),
  cat('school', 'School Saving', 80, 'saving'),
  cat('skin', 'Skincare', 30),
  cat('family', 'Support Family', 50),
  cat('other', 'Other', 40),
];

const txn = (id: string, category_id: string, amount: number, type: 'expense' | 'saving', date: string, description: string): Transaction => ({
  id, user_id: 'u1', monthly_budget_id: 'b1', category_id, amount, transaction_type: type,
  transaction_date: date, description, payment_method: null, created_at: now, updated_at: now,
});

// The real example from the spec (Step 46)
const example = [
  txn('t1', 'food', 3.5, 'expense', '2026-09-21', 'Lunch'),
  txn('t2', 'transport', 2, 'expense', '2026-09-21', 'Taxi'),
  txn('t3', 'school', 20, 'saving', '2026-09-21', 'School savings'),
];

describe('monthly summary (spec Step 46)', () => {
  it('calculates totals and remaining money', () => {
    const s = computeMonthlySummary(budget, example);
    expect(s.totalMoney).toBe(500);
    expect(s.totalExpenses).toBe(5.5);
    expect(s.totalSavings).toBe(20);
    expect(s.remaining).toBe(474.5);
  });

  it('calculates per-category used / remaining / percent', () => {
    const by = Object.fromEntries(computeCategorySummaries(categories, example).map((c) => [c.categoryId, c]));
    expect(by.food).toMatchObject({ budget: 100, used: 3.5, remaining: 96.5, isOver: false });
    expect(by.transport).toMatchObject({ budget: 50, used: 2, remaining: 48 });
    expect(by.school).toMatchObject({ budget: 80, used: 20, remaining: 60 });
    expect(by.food.percentUsed).toBeCloseTo(3.5);
  });

  it('is exact with awkward decimals (0.1 + 0.2)', () => {
    const rows = [txn('a', 'food', 0.1, 'expense', '2026-09-01', ''), txn('b', 'food', 0.2, 'expense', '2026-09-02', '')];
    expect(computeMonthlySummary(budget, rows).totalExpenses).toBe(0.3);
  });

  it('shows a negative remaining when spending exceeds total money', () => {
    const rows = [txn('a', 'rent', 600, 'expense', '2026-09-02', '')];
    expect(computeMonthlySummary(budget, rows).remaining).toBe(-100);
  });

  it('is empty-safe', () => {
    const s = computeMonthlySummary(budget, []);
    expect(s).toMatchObject({ totalExpenses: 0, totalSavings: 0, remaining: 500 });
  });
});

describe('over budget and zero budget', () => {
  it('flags over budget and reports the overage', () => {
    const c = computeCategorySummaries([cat('food', 'Food', 100)], [txn('a', 'food', 120, 'expense', '2026-09-03', '')])[0];
    expect(c.isOver).toBe(true);
    expect(c.overBy).toBe(20);
    expect(c.remaining).toBe(-20);
  });

  it('never divides by zero when the budget is $0', () => {
    const c = computeCategorySummaries([cat('food', 'Food', 0)], [txn('a', 'food', 10, 'expense', '2026-09-03', '')])[0];
    expect(c.percentUsed).toBe(0);
    expect(Number.isFinite(c.percentUsed)).toBe(true);
    expect(c.hasBudget).toBe(false);
    expect(c.isOver).toBe(false);
  });

  it('does not mix transactions from other categories', () => {
    const c = computeCategorySummaries([cat('food', 'Food', 100)], example);
    expect(c[0].used).toBe(3.5);
  });
});

describe('category ordering', () => {
  it('puts defaults first in their usual order, then custom ones', () => {
    const shuffled = [cat('x', 'Gym', 10), categories[4], categories[0]];
    expect(sortCategories(shuffled).map((c) => c.name)).toEqual(['Food', 'School Saving', 'Gym']);
  });
});

describe('search and filters', () => {
  const all = [...example, txn('t4', 'food', 8, 'expense', '2026-09-05', 'Dinner')];

  it('searches description and category name', () => {
    expect(filterTransactions(all, categories, { ...EMPTY_FILTERS, search: 'lunch' }).map((t) => t.id)).toEqual(['t1']);
    expect(filterTransactions(all, categories, { ...EMPTY_FILTERS, search: 'food' }).map((t) => t.id)).toEqual(['t1', 't4']);
  });

  it('combines category, type and date range', () => {
    const f = { ...EMPTY_FILTERS, categoryId: 'food', type: 'expense' as const, from: '2026-09-10', to: '2026-09-30' };
    expect(filterTransactions(all, categories, f).map((t) => t.id)).toEqual(['t1']);
  });

  it('filters by type', () => {
    expect(filterTransactions(all, categories, { ...EMPTY_FILTERS, type: 'saving' }).map((t) => t.id)).toEqual(['t3']);
  });
});

describe('validation', () => {
  it('rejects a duplicate month and accepts editing the same one', () => {
    expect(validateMonthForm({ month: '2026-09-01', total: '500' }, [budget]).errors.month).toMatch(/already exists/);
    expect(validateMonthForm({ month: '2026-09-01', total: '500' }, [budget], 'b1').value).toEqual({ month: '2026-09-01', total_amount: 500 });
  });

  it('rejects bad total money', () => {
    expect(validateMonthForm({ month: '2026-10-01', total: 'abc' }, []).errors.total).toBeDefined();
    expect(validateMonthForm({ month: '2026-10-01', total: '' }, []).errors.total).toBeDefined();
    expect(validateMonthForm({ month: '2026-10-01', total: '-5' }, []).errors.total).toBeDefined();
  });

  it('rejects duplicate category names case-insensitively', () => {
    expect(validateCategoryForm({ name: ' food ', budget: '10', type: 'expense' }, categories).errors.name).toMatch(/already exists/);
    expect(validateCategoryForm({ name: 'Gym', budget: '', type: 'expense' }, categories).value).toEqual({ name: 'Gym', budget_amount: 0, type: 'expense' });
  });

  const good = { amount: '3.50', categoryId: 'food', type: 'expense', date: '2026-09-21', description: 'Lunch', paymentMethod: 'Cash' };

  it('accepts a valid transaction', () => {
    expect(validateTransactionForm(good, categories, '2026-09-01').value).toEqual({
      category_id: 'food', amount: 3.5, transaction_type: 'expense', transaction_date: '2026-09-21', description: 'Lunch', payment_method: 'Cash',
    });
  });

  it('rejects zero / non-numeric amounts, foreign categories and out-of-month dates', () => {
    expect(validateTransactionForm({ ...good, amount: '0' }, categories, '2026-09-01').errors.amount).toBeDefined();
    expect(validateTransactionForm({ ...good, amount: 'abc' }, categories, '2026-09-01').errors.amount).toBeDefined();
    expect(validateTransactionForm({ ...good, categoryId: 'nope' }, categories, '2026-09-01').errors.categoryId).toBeDefined();
    expect(validateTransactionForm({ ...good, date: '2026-10-01' }, categories, '2026-09-01').errors.date).toBeDefined();
    expect(validateTransactionForm({ ...good, type: 'gift' }, categories, '2026-09-01').errors.type).toBeDefined();
  });

  it('treats description and payment method as optional', () => {
    const v = validateTransactionForm({ ...good, description: '', paymentMethod: '' }, categories, '2026-09-01').value;
    expect(v?.description).toBeNull();
    expect(v?.payment_method).toBeNull();
  });
});

describe('formatting and dates', () => {
  it('formats USD', () => {
    expect(formatMoney(500)).toBe('$500.00');
    expect(formatMoney(3.5)).toBe('$3.50');
    expect(formatMoney(-5)).toBe('-$5.00');
    expect(formatMoney(0)).toBe('$0.00');
  });

  it('parses typed money safely', () => {
    expect(parseMoneyInput('$1,200.5')).toBe(1200.5);
    expect(parseMoneyInput('3.555')).toBeNull();
    expect(parseMoneyInput('1e5')).toBeNull();
    expect(parseMoneyInput('')).toBeNull();
  });

  it('handles month boundaries incl. leap years', () => {
    expect(monthEnd('2026-09-01')).toBe('2026-09-30');
    expect(monthEnd('2028-02-01')).toBe('2028-02-29');
    expect(isDateInMonth('2026-09-30', '2026-09-01')).toBe(true);
    expect(isDateInMonth('2026-10-01', '2026-09-01')).toBe(false);
    expect(isDateInMonth('2026-08-31', '2026-09-01')).toBe(false);
    expect(defaultDateForMonth('1999-01-01')).toBe('1999-01-01');
  });
});
