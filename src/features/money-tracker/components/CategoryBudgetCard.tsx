import { formatMoney, formatPercent } from '../../../lib/format';
import type { CategorySummary } from '../../../types/moneyTracker';

interface Props {
  summary: CategorySummary;
  onEdit?: () => void;
  onDelete?: () => void;
}

export default function CategoryBudgetCard({ summary: s, onEdit, onDelete }: Props) {
  const isSaving = s.type === 'saving';
  const barPercent = Math.min(100, s.percentUsed);
  const state = s.isOver ? (isSaving ? 'above' : 'over') : 'ok';

  return (
    <article className={`cat-card cat-${state}`}>
      <header className="cat-head">
        <h3>{s.name}</h3>
        <span className={`badge badge-${s.type}`}>{isSaving ? 'Saving' : 'Expense'}</span>
      </header>

      <dl className="cat-figures">
        <div>
          <dt>Budget</dt>
          <dd>{formatMoney(s.budget)}</dd>
        </div>
        <div>
          <dt>{isSaving ? 'Saved' : 'Used'}</dt>
          <dd>{formatMoney(s.used)}</dd>
        </div>
        <div>
          <dt>Remaining</dt>
          <dd>{formatMoney(Math.max(0, s.remaining))}</dd>
        </div>
      </dl>

      <div
        className="progress"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(barPercent)}
        aria-label={`${s.name} ${isSaving ? 'saved' : 'used'}`}
      >
        <span className="progress-fill" style={{ width: `${barPercent}%` }} />
      </div>

      <p className="cat-status">
        {!s.hasBudget
          ? s.used > 0
            ? `No budget set · ${formatMoney(s.used)} ${isSaving ? 'saved' : 'spent'}`
            : 'No budget set'
          : s.isOver
            ? isSaving
              ? `Above goal by ${formatMoney(s.overBy)}`
              : `Over budget by ${formatMoney(s.overBy)}`
            : `${formatPercent(s.percentUsed)} ${isSaving ? 'saved' : 'used'}`}
      </p>

      {(onEdit || onDelete) && (
        <footer className="cat-actions">
          {onEdit && (
            <button type="button" className="btn btn-small" onClick={onEdit} aria-label={`Edit ${s.name}`}>
              Edit
            </button>
          )}
          {onDelete && (
            <button type="button" className="btn btn-small btn-ghost-danger" onClick={onDelete} aria-label={`Delete ${s.name}`}>
              Delete
            </button>
          )}
        </footer>
      )}
    </article>
  );
}
