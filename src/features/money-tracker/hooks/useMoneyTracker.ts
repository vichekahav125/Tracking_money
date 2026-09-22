import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as api from '../../../services/moneyTrackerService';
import { errorMessage } from '../../../lib/errors';
import { currentMonthStart } from '../../../lib/dates';
import {
  computeCategorySummaries,
  computeMonthlySummary,
  sortBudgetsNewestFirst,
  sortCategories,
  sortTransactions,
  summaryFromTotals,
} from '../calculations';
import type {
  BudgetCategory,
  CategoryInput,
  MonthInput,
  MonthlyBudget,
  MonthlySummary,
  Transaction,
  TransactionInput,
} from '../../../types/moneyTracker';

interface Totals {
  expenses: number;
  savings: number;
}

/**
 * Supabase -> service -> state -> page -> components.
 * The selected month's numbers are always derived from the transactions in state,
 * so every add / edit / delete updates summaries, cards, charts and history instantly.
 */
export function useMoneyTracker() {
  const [budgets, setBudgets] = useState<MonthlyBudget[]>([]);
  const [totalsByBudget, setTotalsByBudget] = useState<Record<string, Totals>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [categories, setCategories] = useState<BudgetCategory[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadedMonthId, setLoadedMonthId] = useState<string | null>(null);

  const [loadingBudgets, setLoadingBudgets] = useState(true);
  const [loadingMonth, setLoadingMonth] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Guards against a slow response for month A overwriting month B.
  const monthRequest = useRef(0);

  const loadMonth = useCallback(async (budgetId: string) => {
    const request = ++monthRequest.current;
    setSelectedId(budgetId);
    setLoadedMonthId(null);
    setCategories([]); // never show one month's data under another
    setTransactions([]);
    setLoadingMonth(true);
    setLoadError(null);
    try {
      const [cats, txns] = await Promise.all([api.getCategories(budgetId), api.getTransactions(budgetId)]);
      if (request !== monthRequest.current) return;
      setCategories(cats);
      setTransactions(txns);
      setLoadedMonthId(budgetId);
    } catch (err) {
      if (request !== monthRequest.current) return;
      setLoadError(errorMessage(err, 'Unable to load your money data.'));
    } finally {
      if (request === monthRequest.current) setLoadingMonth(false);
    }
  }, []);

  const loadAll = useCallback(async () => {
    setLoadingBudgets(true);
    setLoadError(null);
    try {
      const list = await api.getMonthlyBudgets();
      const summaries = await api.getMonthlySummaries(list);
      const totals: Record<string, Totals> = {};
      for (const s of summaries) totals[s.monthlyBudgetId] = { expenses: s.totalExpenses, savings: s.totalSavings };
      setBudgets(list);
      setTotalsByBudget(totals);
      setLoadingBudgets(false);
      if (list.length > 0) {
        const thisMonth = list.find((b) => b.month === currentMonthStart());
        await loadMonth((thisMonth ?? list[0]).id);
      }
    } catch (err) {
      setLoadError(errorMessage(err, 'Unable to load your money data.'));
      setLoadingBudgets(false);
    }
  }, [loadMonth]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  /* ---------- derived values ---------- */

  const selectedBudget = useMemo(() => budgets.find((b) => b.id === selectedId) ?? null, [budgets, selectedId]);
  const isReady = selectedBudget !== null && loadedMonthId === selectedBudget.id;

  const summary: MonthlySummary | null = useMemo(
    () => (selectedBudget && isReady ? computeMonthlySummary(selectedBudget, transactions) : null),
    [selectedBudget, isReady, transactions],
  );

  const categorySummaries = useMemo(() => computeCategorySummaries(categories, transactions), [categories, transactions]);

  // Keep the stored totals for the open month in sync, so history is right after switching away.
  useEffect(() => {
    if (!selectedBudget || !isReady || !summary) return;
    setTotalsByBudget((prev) => {
      const old = prev[selectedBudget.id];
      if (old && old.expenses === summary.totalExpenses && old.savings === summary.totalSavings) return prev;
      return { ...prev, [selectedBudget.id]: { expenses: summary.totalExpenses, savings: summary.totalSavings } };
    });
  }, [selectedBudget, isReady, summary]);

  const history: MonthlySummary[] = useMemo(
    () =>
      sortBudgetsNewestFirst(budgets).map((b) => {
        const t = totalsByBudget[b.id] ?? { expenses: 0, savings: 0 };
        return summaryFromTotals(b, t.expenses, t.savings);
      }),
    [budgets, totalsByBudget],
  );

  /* ---------- month actions (throw ServiceError; forms show the message) ---------- */

  const selectMonth = useCallback((id: string) => void loadMonth(id), [loadMonth]);

  const createMonth = useCallback(async (input: MonthInput) => {
    const { budget, categories: cats } = await api.createMonthlyBudget(input);
    monthRequest.current += 1; // cancel any in-flight month load
    setBudgets((prev) => sortBudgetsNewestFirst([...prev, budget]));
    setTotalsByBudget((prev) => ({ ...prev, [budget.id]: { expenses: 0, savings: 0 } }));
    setSelectedId(budget.id);
    setCategories(cats);
    setTransactions([]);
    setLoadedMonthId(budget.id);
    setLoadingMonth(false);
    setLoadError(null);
  }, []);

  const updateMonth = useCallback(async (id: string, patch: Partial<MonthInput>) => {
    const updated = await api.updateMonthlyBudget(id, patch);
    setBudgets((prev) => sortBudgetsNewestFirst(prev.map((b) => (b.id === id ? updated : b))));
  }, []);

  const deleteMonth = useCallback(
    async (id: string) => {
      await api.deleteMonthlyBudget(id);
      const remaining = sortBudgetsNewestFirst(budgets.filter((b) => b.id !== id));
      setBudgets(remaining);
      setTotalsByBudget((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      if (selectedId === id) {
        monthRequest.current += 1;
        setCategories([]);
        setTransactions([]);
        setLoadedMonthId(null);
        if (remaining.length > 0) void loadMonth(remaining[0].id);
        else setSelectedId(null);
      }
    },
    [budgets, selectedId, loadMonth],
  );

  /* ---------- category actions ---------- */

  const createCategory = useCallback(
    async (input: CategoryInput) => {
      if (!selectedId) return;
      const created = await api.createCategory(selectedId, input);
      setCategories((prev) => sortCategories([...prev, created]));
    },
    [selectedId],
  );

  const updateCategory = useCallback(async (id: string, patch: Partial<CategoryInput>) => {
    const updated = await api.updateCategory(id, patch);
    setCategories((prev) => sortCategories(prev.map((c) => (c.id === id ? updated : c))));
  }, []);

  const deleteCategory = useCallback(async (id: string) => {
    await api.deleteCategory(id);
    setCategories((prev) => prev.filter((c) => c.id !== id));
  }, []);

  /* ---------- transaction actions ---------- */

  const createTransaction = useCallback(
    async (input: TransactionInput) => {
      if (!selectedId) return;
      const created = await api.createTransaction(selectedId, input);
      setTransactions((prev) => sortTransactions([...prev, created]));
    },
    [selectedId],
  );

  const updateTransaction = useCallback(
    async (id: string, input: TransactionInput) => {
      if (!selectedId) return;
      const updated = await api.updateTransaction(id, selectedId, input);
      setTransactions((prev) => sortTransactions(prev.map((t) => (t.id === id ? updated : t))));
    },
    [selectedId],
  );

  const deleteTransaction = useCallback(async (id: string) => {
    await api.deleteTransaction(id);
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return {
    budgets,
    history,
    selectedBudget,
    categories,
    categorySummaries,
    transactions,
    summary,
    isReady,
    loadingBudgets,
    loadingMonth,
    loadError,
    reload: loadAll,
    selectMonth,
    createMonth,
    updateMonth,
    deleteMonth,
    createCategory,
    updateCategory,
    deleteCategory,
    createTransaction,
    updateTransaction,
    deleteTransaction,
  };
}

export type MoneyTracker = ReturnType<typeof useMoneyTracker>;
