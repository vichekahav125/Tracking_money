import SummaryCard from './SummaryCard';
import { formatMoney } from '../../../lib/format';
import type { MonthlySummary as Summary } from '../../../types/moneyTracker';

/** Four cards plus one bar that shows where the month's money went. */
export default function MonthlySummary({ summary }: { summary: Summary }) {
  const total = summary.totalMoney;
  const overspent = summary.remaining < 0;
  const pct = (n: number) => (total > 0 ? Math.min(100, Math.max(0, (n / total) * 100)) : 0);

  const expensePct = pct(summary.totalExpenses);
  const savingPct = pct(summary.totalSavings);
  const remainPct = overspent ? 0 : Math.max(0, 100 - expensePct - savingPct);

  return (
    <section aria-labelledby="summary-heading" className="section">
      <h2 id="summary-heading">Summary</h2>
      <dl className="summary-grid">
        <SummaryCard label="Total money" value={summary.totalMoney} />
        <SummaryCard label="Expenses" value={summary.totalExpenses} tone="expense" />
        <SummaryCard label="Savings" value={summary.totalSavings} tone="saving" />
        <SummaryCard label="Remaining" value={summary.remaining} tone="remaining" />
      </dl>

      {total > 0 && (
        <div className="allocation">
          <div
            className="allocation-bar"
            role="img"
            aria-label={`Of ${formatMoney(total)}: ${formatMoney(summary.totalExpenses)} spent, ${formatMoney(summary.totalSavings)} saved, ${formatMoney(summary.remaining)} remaining`}
          >
            <span className="seg seg-expense" style={{ width: `${expensePct}%` }} />
            <span className="seg seg-saving" style={{ width: `${savingPct}%` }} />
            <span className="seg seg-remaining" style={{ width: `${remainPct}%` }} />
          </div>
          <p className="allocation-note">
            {overspent
              ? `You have used ${formatMoney(Math.abs(summary.remaining))} more than this month’s total money.`
              : `${Math.round(remainPct)}% of this month’s money is still unspent.`}
          </p>
        </div>
      )}
    </section>
  );
}
