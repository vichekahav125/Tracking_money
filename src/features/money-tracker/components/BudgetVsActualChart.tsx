import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatMoney } from '../../../lib/format';
import type { CategorySummary } from '../../../types/moneyTracker';

export default function BudgetVsActualChart({ summaries }: { summaries: CategorySummary[] }) {
  const data = summaries.map((s) => ({ name: s.name, Budget: s.budget, Actual: s.used }));
  const hasAnything = data.some((d) => d.Budget > 0 || d.Actual > 0);

  return (
    <div className="chart-card">
      <h3>Budget vs actual</h3>
      {!hasAnything ? (
        <p className="muted chart-empty">Set category budgets or add transactions to compare them here.</p>
      ) : (
        <ResponsiveContainer width="100%" height={data.length * 62 + 56}>
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 12, bottom: 4, left: 0 }} barGap={2}>
            <CartesianGrid horizontal={false} stroke="#dfe6e3" />
            <XAxis type="number" tickFormatter={(v) => `$${v}`} tick={{ fontSize: 12 }} stroke="#8a9793" />
            <YAxis type="category" dataKey="name" width={96} tick={{ fontSize: 12 }} stroke="#8a9793" />
            <Tooltip formatter={(v) => formatMoney(Number(v))} cursor={{ fill: 'rgba(15,92,77,0.06)' }} />
            <Legend />
            <Bar dataKey="Budget" fill="#b9c9c4" radius={[0, 4, 4, 0]} barSize={14} />
            <Bar dataKey="Actual" fill="#0f5c4d" radius={[0, 4, 4, 0]} barSize={14} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
