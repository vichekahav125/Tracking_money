import type { MonthlyBudget } from '../../../types/moneyTracker';
import { formatMonthLabel } from '../../../lib/dates';

interface Props {
  budgets: MonthlyBudget[]; // newest first
  selectedId: string | null;
  disabled?: boolean;
  onSelect: (id: string) => void;
}

/** ← August 2026   September 2026   October 2026 →  (only months that exist) */
export default function MonthSelector({ budgets, selectedId, disabled, onSelect }: Props) {
  const ascending = [...budgets].sort((a, b) => a.month.localeCompare(b.month));
  const index = ascending.findIndex((b) => b.id === selectedId);
  const current = index >= 0 ? ascending[index] : null;
  const prev = index > 0 ? ascending[index - 1] : null;
  const next = index >= 0 && index < ascending.length - 1 ? ascending[index + 1] : null;

  if (!current) return null;

  return (
    <nav className="month-selector" aria-label="Choose month">
      <button
        type="button"
        className="month-step"
        onClick={() => prev && onSelect(prev.id)}
        disabled={!prev || disabled}
        aria-label={prev ? `Previous month: ${formatMonthLabel(prev.month)}` : 'No earlier month'}
      >
        <span aria-hidden="true">←</span>
        <span className="month-step-label">{prev ? formatMonthLabel(prev.month) : ''}</span>
      </button>

      <label className="month-current">
        <span className="sr-only">Selected month</span>
        <select value={current.id} onChange={(e) => onSelect(e.target.value)} disabled={disabled}>
          {[...ascending].reverse().map((b) => (
            <option key={b.id} value={b.id}>
              {formatMonthLabel(b.month)}
            </option>
          ))}
        </select>
      </label>

      <button
        type="button"
        className="month-step month-step-next"
        onClick={() => next && onSelect(next.id)}
        disabled={!next || disabled}
        aria-label={next ? `Next month: ${formatMonthLabel(next.month)}` : 'No later month'}
      >
        <span className="month-step-label">{next ? formatMonthLabel(next.month) : ''}</span>
        <span aria-hidden="true">→</span>
      </button>
    </nav>
  );
}
