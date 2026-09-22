import { useMemo, useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { useMoneyTracker } from './hooks/useMoneyTracker';
import { EMPTY_FILTERS, filterTransactions, hasActiveFilters, type TransactionFilterState } from './filters';
import { formatMonthLabel } from '../../lib/dates';
import MonthSelector from './components/MonthSelector';
import MonthForm from './components/MonthForm';
import MonthlySummary from './components/MonthlySummary';
import CategoryList from './components/CategoryList';
import CategoryForm from './components/CategoryForm';
import TransactionForm from './components/TransactionForm';
import TransactionFilters from './components/TransactionFilters';
import TransactionList from './components/TransactionList';
import MonthlyHistory from './components/MonthlyHistory';
import SpendingChart from './components/SpendingChart';
import BudgetVsActualChart from './components/BudgetVsActualChart';
import MonthlyOverviewChart from './components/MonthlyOverviewChart';
import DeleteConfirmation from './components/DeleteConfirmation';
import { EmptyState, ErrorBanner, Spinner } from './components/Feedback';
import type { BudgetCategory, Transaction } from '../../types/moneyTracker';

type MonthModal = 'create' | 'edit' | 'delete' | null;
type CategoryModal = { mode: 'create' } | { mode: 'edit'; category: BudgetCategory } | null;
type TransactionModal = { mode: 'create' } | { mode: 'edit'; transaction: Transaction } | null;

export default function MoneyTrackerPage() {
  const { user, signOut } = useAuth();
  const mt = useMoneyTracker();

  const [monthModal, setMonthModal] = useState<MonthModal>(null);
  const [categoryModal, setCategoryModal] = useState<CategoryModal>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<BudgetCategory | null>(null);
  const [transactionModal, setTransactionModal] = useState<TransactionModal>(null);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const [filters, setFilters] = useState<TransactionFilterState>(EMPTY_FILTERS);

  const { selectedBudget, summary, isReady } = mt;

  const visibleTransactions = useMemo(
    () => filterTransactions(mt.transactions, mt.categories, filters),
    [mt.transactions, mt.categories, filters],
  );

  function selectMonth(id: string) {
    setFilters(EMPTY_FILTERS); // filters belong to one month
    mt.selectMonth(id);
  }

  /* ---------- first load ---------- */
  if (mt.loadingBudgets) {
    return (
      <Shell email={user?.email} onSignOut={signOut}>
        <Spinner label="Loading your months…" />
      </Shell>
    );
  }

  const createMonthDialog = monthModal === 'create' && (
    <MonthForm
      mode="create"
      existing={mt.budgets}
      onSubmit={mt.createMonth}
      onClose={() => {
        setMonthModal(null);
        setFilters(EMPTY_FILTERS);
      }}
    />
  );

  /* ---------- nothing to show yet: error or no months ---------- */
  if (mt.budgets.length === 0) {
    return (
      <Shell email={user?.email} onSignOut={signOut}>
        <>
          {mt.loadError ? (
            <ErrorBanner message={mt.loadError} onRetry={mt.reload} />
          ) : (
            <EmptyState
              title="No monthly budget yet."
              action={
                <button type="button" className="btn btn-primary" onClick={() => setMonthModal('create')}>
                  + Add month
                </button>
              }
            >
              Create your first monthly budget to start tracking your money.
            </EmptyState>
          )}
        </>
        {createMonthDialog}
      </Shell>
    );
  }

  const hasTransactions = mt.transactions.length > 0;

  return (
    <Shell email={user?.email} onSignOut={signOut}>
      <>
      <div className="toolbar">
        <MonthSelector budgets={mt.budgets} selectedId={selectedBudget?.id ?? null} disabled={mt.loadingMonth} onSelect={selectMonth} />
        <div className="toolbar-actions">
          <button type="button" className="btn btn-primary" onClick={() => setMonthModal('create')}>
            + Add month
          </button>
          {selectedBudget && (
            <>
              <button type="button" className="btn" onClick={() => setMonthModal('edit')} disabled={!isReady}>
                Edit month
              </button>
              <button type="button" className="btn btn-ghost-danger" onClick={() => setMonthModal('delete')} disabled={!isReady}>
                Delete month
              </button>
            </>
          )}
        </div>
      </div>

      {mt.loadError && <ErrorBanner message={mt.loadError} onRetry={() => selectedBudget && mt.selectMonth(selectedBudget.id)} />}

      {mt.loadingMonth && <Spinner label={selectedBudget ? `Loading ${formatMonthLabel(selectedBudget.month)}…` : 'Loading…'} />}

      {isReady && selectedBudget && summary && (
        <>
          <MonthlySummary summary={summary} />

          <CategoryList
            summaries={mt.categorySummaries}
            categories={mt.categories}
            onAdd={() => setCategoryModal({ mode: 'create' })}
            onEdit={(category) => setCategoryModal({ mode: 'edit', category })}
            onDelete={setCategoryToDelete}
          />

          <section aria-labelledby="charts-heading" className="section">
            <h2 id="charts-heading">Charts</h2>
            <div className="chart-grid">
              <SpendingChart summaries={mt.categorySummaries} />
              <BudgetVsActualChart summaries={mt.categorySummaries} />
              {mt.history.length >= 2 ? (
                <MonthlyOverviewChart history={mt.history} />
              ) : (
                <div className="chart-card chart-wide">
                  <h3>Monthly overview</h3>
                  <p className="muted chart-empty">Add another month to compare months side by side.</p>
                </div>
              )}
            </div>
          </section>

          <section aria-labelledby="transactions-heading" className="section">
            <div className="section-head">
              <h2 id="transactions-heading">Transactions</h2>
              <button type="button" className="btn btn-primary" onClick={() => setTransactionModal({ mode: 'create' })}>
                + Add transaction
              </button>
            </div>

            {!hasTransactions ? (
              <EmptyState
                title="No transactions yet."
                action={
                  <button type="button" className="btn btn-primary" onClick={() => setTransactionModal({ mode: 'create' })}>
                    + Add transaction
                  </button>
                }
              >
                Start tracking your expenses and savings.
              </EmptyState>
            ) : (
              <>
                <TransactionFilters filters={filters} categories={mt.categories} onChange={setFilters} />
                <h3 className="subheading">
                  Transaction history
                  {hasActiveFilters(filters) && (
                    <span className="muted"> · {visibleTransactions.length} of {mt.transactions.length}</span>
                  )}
                </h3>
                {visibleTransactions.length === 0 ? (
                  <EmptyState
                    title="No transactions match your filters."
                    action={
                      <button type="button" className="btn" onClick={() => setFilters(EMPTY_FILTERS)}>
                        Clear filters
                      </button>
                    }
                  />
                ) : (
                  <TransactionList
                    transactions={visibleTransactions}
                    categories={mt.categories}
                    onEdit={(transaction) => setTransactionModal({ mode: 'edit', transaction })}
                    onDelete={setTransactionToDelete}
                  />
                )}
              </>
            )}
          </section>
        </>
      )}

      <MonthlyHistory history={mt.history} selectedId={selectedBudget?.id ?? null} onSelect={(id) => { selectMonth(id); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />

      </>

      {/* ---------- dialogs ---------- */}
      {createMonthDialog}
      {monthModal === 'edit' && selectedBudget && (
        <MonthForm
          mode="edit"
          existing={mt.budgets}
          editing={selectedBudget}
          monthLocked={hasTransactions}
          onSubmit={(input) => mt.updateMonth(selectedBudget.id, input)}
          onClose={() => setMonthModal(null)}
        />
      )}
      {monthModal === 'delete' && selectedBudget && (
        <DeleteConfirmation
          title={`Delete ${formatMonthLabel(selectedBudget.month)}?`}
          confirmLabel="Delete month"
          onCancel={() => setMonthModal(null)}
          onConfirm={async () => {
            await mt.deleteMonth(selectedBudget.id);
            setMonthModal(null);
            setFilters(EMPTY_FILTERS);
          }}
        >
          <p>This will permanently delete:</p>
          <ul>
            <li>Monthly budget</li>
            <li>Categories</li>
            <li>Transactions</li>
          </ul>
          <p>This action cannot be undone.</p>
        </DeleteConfirmation>
      )}

      {categoryModal && selectedBudget && (
        <CategoryForm
          mode={categoryModal.mode}
          existing={mt.categories}
          editing={categoryModal.mode === 'edit' ? categoryModal.category : undefined}
          onSubmit={(input) =>
            categoryModal.mode === 'edit' ? mt.updateCategory(categoryModal.category.id, input) : mt.createCategory(input)
          }
          onClose={() => setCategoryModal(null)}
        />
      )}
      {categoryToDelete && (
        <DeleteConfirmation
          title={`Delete ${categoryToDelete.name}?`}
          confirmLabel="Delete category"
          onCancel={() => setCategoryToDelete(null)}
          onConfirm={async () => {
            await mt.deleteCategory(categoryToDelete.id);
            setCategoryToDelete(null);
          }}
        >
          <p>This category will be removed from this month.</p>
          <p>This action cannot be undone.</p>
        </DeleteConfirmation>
      )}

      {transactionModal && selectedBudget && (
        <TransactionForm
          mode={transactionModal.mode}
          budget={selectedBudget}
          categories={mt.categories}
          editing={transactionModal.mode === 'edit' ? transactionModal.transaction : undefined}
          onSubmit={(input) =>
            transactionModal.mode === 'edit'
              ? mt.updateTransaction(transactionModal.transaction.id, input)
              : mt.createTransaction(input)
          }
          onClose={() => setTransactionModal(null)}
        />
      )}
      {transactionToDelete && (
        <DeleteConfirmation
          title="Delete this transaction?"
          onCancel={() => setTransactionToDelete(null)}
          onConfirm={async () => {
            await mt.deleteTransaction(transactionToDelete.id);
            setTransactionToDelete(null);
          }}
        >
          <p>This action cannot be undone.</p>
        </DeleteConfirmation>
      )}
    </Shell>
  );
}

function Shell({ children, email, onSignOut }: { children: React.ReactNode; email?: string; onSignOut: () => void }) {
  return (
    <div className="page">
      <header className="page-header">
        <h1>Money Tracker</h1>
        <div className="page-user">
          {email && <span className="muted page-email">{email}</span>}
          <button type="button" className="btn btn-small" onClick={onSignOut}>
            Sign out
          </button>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
