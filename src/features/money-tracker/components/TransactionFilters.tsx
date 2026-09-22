import { EMPTY_FILTERS, hasActiveFilters, type TransactionFilterState } from '../filters';
import type { BudgetCategory } from '../../../types/moneyTracker';

interface Props {
  filters: TransactionFilterState;
  categories: BudgetCategory[];
  onChange: (next: TransactionFilterState) => void;
}

export default function TransactionFilters({ filters, categories, onChange }: Props) {
  const set = <K extends keyof TransactionFilterState>(key: K, value: TransactionFilterState[K]) =>
    onChange({ ...filters, [key]: value });

  return (
    <div className="filters" role="search">
      <label className="field filter-search">
        <span className="sr-only">Search transactions</span>
        <input type="search" placeholder="Search transactions…" value={filters.search} onChange={(e) => set('search', e.target.value)} />
      </label>

      <label className="field">
        <span>Category</span>
        <select value={filters.categoryId} onChange={(e) => set('categoryId', e.target.value)}>
          <option value="all">All</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span>Type</span>
        <select value={filters.type} onChange={(e) => set('type', e.target.value as TransactionFilterState['type'])}>
          <option value="all">All</option>
          <option value="expense">Expense</option>
          <option value="saving">Saving</option>
        </select>
      </label>

      <label className="field">
        <span>From</span>
        <input type="date" value={filters.from} max={filters.to || undefined} onChange={(e) => set('from', e.target.value)} />
      </label>

      <label className="field">
        <span>To</span>
        <input type="date" value={filters.to} min={filters.from || undefined} onChange={(e) => set('to', e.target.value)} />
      </label>

      {hasActiveFilters(filters) && (
        <button type="button" className="btn btn-small filter-clear" onClick={() => onChange(EMPTY_FILTERS)}>
          Clear filters
        </button>
      )}
    </div>
  );
}
