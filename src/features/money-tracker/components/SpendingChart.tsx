import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { CHART_COLORS } from '../constants';
import { formatMoney } from '../../../lib/format';
import type { CategorySummary } from '../../../types/moneyTracker';

/** Donut of actual expenses per category (savings are shown in Budget vs actual). */
export default function SpendingChart({ summaries }: { summaries: CategorySummary[] }) {
  const data = summaries.filter((s) => s.type === 'expense' && s.used > 0).map((s) => ({ name: s.name, value: s.used }));
  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="chart-card">
      <h3>Spending by category</h3>
      {data.length === 0 ? (
        <p className="muted chart-empty">Add an expense to see where your money goes.</p>
      ) : (
        <>
          <div className="donut">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={data} dataKey="value" nameKey="name" innerRadius={62} outerRadius={94} paddingAngle={2} stroke="none">
                  {data.map((d, i) => (
                    <Cell key={d.name} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => formatMoney(Number(v))} />
              </PieChart>
            </ResponsiveContainer>
            <div className="donut-center" aria-hidden="true">
              <span>Spent</span>
              <strong>{formatMoney(total)}</strong>
            </div>
          </div>
          <ul className="legend">
            {data.map((d, i) => (
              <li key={d.name}>
                <span className="swatch" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                <span className="legend-name">{d.name}</span>
                <span className="legend-value">{formatMoney(d.value)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
