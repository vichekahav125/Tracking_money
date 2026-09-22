import CategoryBudgetCard from './CategoryBudgetCard';
import { EmptyState } from './Feedback';
import type { BudgetCategory, CategorySummary } from '../../../types/moneyTracker';

interface Props {
  summaries: CategorySummary[];
  categories: BudgetCategory[];
  onAdd: () => void;
  onEdit: (category: BudgetCategory) => void;
  onDelete: (category: BudgetCategory) => void;
}

export default function CategoryList({ summaries, categories, onAdd, onEdit, onDelete }: Props) {
  const byId = new Map(categories.map((c) => [c.id, c]));
  return (
    <section aria-labelledby="categories-heading" className="section">
      <div className="section-head">
        <h2 id="categories-heading">Categories</h2>
        <button type="button" className="btn btn-small" onClick={onAdd}>
          + Add category
        </button>
      </div>

      {summaries.length === 0 ? (
        <EmptyState title="No categories yet." action={<button type="button" className="btn btn-primary" onClick={onAdd}>+ Add category</button>}>
          Add a category to start planning this month.
        </EmptyState>
      ) : (
        <div className="cat-grid">
          {summaries.map((s) => {
            const category = byId.get(s.categoryId);
            return (
              <CategoryBudgetCard
                key={s.categoryId}
                summary={s}
                onEdit={category ? () => onEdit(category) : undefined}
                onDelete={category ? () => onDelete(category) : undefined}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}
