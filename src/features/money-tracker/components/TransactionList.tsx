import { formatMoney } from '../../../lib/format';
import { formatShortDate } from '../../../lib/dates';
import type { BudgetCategory, Transaction } from '../../../types/moneyTracker';

interface Props {
  transactions: Transaction[];
  categories: BudgetCategory[];
  onEdit: (t: Transaction) => void;
  onDelete: (t: Transaction) => void;
}

/** A table on wide screens; each row becomes a card on phones (see .txn-table in index.css). */
export default function TransactionList({ transactions, categories, onEdit, onDelete }: Props) {
  const names = new Map(categories.map((c) => [c.id, c.name]));
  return (
    <div className="table-wrap">
      <table className="txn-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Category</th>
            <th>Description</th>
            <th>Type</th>
            <th className="num">Amount</th>
            <th>Payment method</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((t) => (
            <tr key={t.id}>
              <td data-label="Date">{formatShortDate(t.transaction_date)}</td>
              <td data-label="Category">{names.get(t.category_id) ?? 'Unknown'}</td>
              <td data-label="Description" className="txn-desc">{t.description || <span className="muted">—</span>}</td>
              <td data-label="Type">
                <span className={`badge badge-${t.transaction_type}`}>{t.transaction_type === 'saving' ? 'Saving' : 'Expense'}</span>
              </td>
              <td data-label="Amount" className="num">{formatMoney(t.amount)}</td>
              <td data-label="Payment">{t.payment_method || <span className="muted">—</span>}</td>
              <td data-label="Actions" className="txn-actions">
                <button type="button" className="btn btn-small" onClick={() => onEdit(t)}>
                  Edit
                </button>
                <button type="button" className="btn btn-small btn-ghost-danger" onClick={() => onDelete(t)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
