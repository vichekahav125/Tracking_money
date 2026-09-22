export type TransactionType = 'expense' | 'saving';
export type CategoryType = TransactionType;

export interface MonthlyBudget {
  id: string;
  user_id: string;
  /** First day of the month, e.g. "2026-09-01" */
  month: string;
  total_amount: number;
  created_at: string;
  updated_at: string;
}

export interface BudgetCategory {
  id: string;
  monthly_budget_id: string;
  name: string;
  budget_amount: number;
  type: CategoryType;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  monthly_budget_id: string;
  category_id: string;
  amount: number;
  transaction_type: TransactionType;
  /** "YYYY-MM-DD" */
  transaction_date: string;
  description: string | null;
  payment_method: string | null;
  created_at: string;
  updated_at: string;
}

export interface MonthlySummary {
  monthlyBudgetId: string;
  month: string;
  totalMoney: number;
  totalExpenses: number;
  totalSavings: number;
  remaining: number;
}

export interface CategorySummary {
  categoryId: string;
  name: string;
  type: CategoryType;
  budget: number;
  used: number;
  /** budget - used (negative when over budget) */
  remaining: number;
  /** 0 when no budget is set */
  percentUsed: number;
  hasBudget: boolean;
  isOver: boolean;
  overBy: number;
  transactionCount: number;
}

/* ---------- inputs ---------- */

export interface MonthInput {
  month: string; // first day of month
  total_amount: number;
}

export interface CategoryInput {
  name: string;
  budget_amount: number;
  type: CategoryType;
}

export interface TransactionInput {
  category_id: string;
  amount: number;
  transaction_type: TransactionType;
  transaction_date: string;
  description: string | null;
  payment_method: string | null;
}
