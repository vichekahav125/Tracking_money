import { formatMoney } from '../../../lib/format';
import { formatMonthLabel } from '../../../lib/dates';
import type { MonthlySummary } from '../../../types/moneyTracker';

interface Props {
  history: MonthlySummary[]; // newest first
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export default function MonthlyHistory({ history, selectedId, onSelect }: Props) {
  if (history.length === 0) return null;
  return (
    <section aria-labelledby="history-heading" className="section">
      <h2 id="history-heading">Monthly history</h2>
      <ul className="history-list">
        {history.map((h) => (
          <li key={h.monthlyBudgetId}>
            <button
              type="button"
              className={`history-item${h.monthlyBudgetId === selectedId ? ' is-current' : ''}`}
              onClick={() => onSelect(h.monthlyBudgetId)}
              aria-current={h.monthlyBudgetId === selectedId ? 'true' : undefined}
            >
              <strong>{formatMonthLabel(h.month)}</strong>
              <dl>
                <div><dt>Total money</dt><dd>{formatMoney(h.totalMoney)}</dd></div>
                <div><dt>Expenses</dt><dd>{formatMoney(h.totalExpenses)}</dd></div>
                <div><dt>Savings</dt><dd>{formatMoney(h.totalSavings)}</dd></div>
                <div><dt>Remaining</dt><dd className={h.remaining < 0 ? 'neg' : undefined}>{formatMoney(h.remaining)}</dd></div>
              </dl>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
