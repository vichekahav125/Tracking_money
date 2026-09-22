import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatMoney } from '../../../lib/format';
import { formatMonthShort, splitMonth } from '../../../lib/dates';
import type { MonthlySummary } from '../../../types/moneyTracker';

/** Compares months side by side. Only meaningful (and only shown) with 2+ months. */
export default function MonthlyOverviewChart({ history }: { history: MonthlySummary[] }) {
  if (history.length < 2) return null;
  const ascending = [...history].sort((a, b) => a.month.localeCompare(b.month));
  const multiYear = new Set(ascending.map((h) => splitMonth(h.month).year)).size > 1;
  const data = ascending.map((h) => ({
    name: multiYear ? `${formatMonthShort(h.month)} ${String(splitMonth(h.month).year).slice(2)}` : formatMonthShort(h.month),
    'Total money': h.totalMoney,
    Expenses: h.totalExpenses,
    Savings: h.totalSavings,
    Remaining: Math.max(0, h.remaining),
  }));

  return (
    <div className="chart-card chart-wide">
      <h3>Monthly overview</h3>
      <div className="chart-scroll">
        <div style={{ minWidth: Math.max(320, data.length * 90) }}>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
              <CartesianGrid vertical={false} stroke="#efdbe5" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#b08a9b" />
              <YAxis tickFormatter={(v) => `$${v}`} tick={{ fontSize: 12 }} stroke="#b08a9b" width={56} />
              <Tooltip formatter={(v) => formatMoney(Number(v))} cursor={{ fill: 'rgba(190,24,93,0.06)' }} />
              <Legend />
              <Bar dataKey="Total money" fill="#5f6b76" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Expenses" fill="#d1495b" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Savings" fill="#3b5bdb" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Remaining" fill="#be185d" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
