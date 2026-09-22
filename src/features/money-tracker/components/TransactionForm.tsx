import { useState, type FormEvent } from 'react';
import Modal from './Modal';
import { validateTransactionForm } from '../validation';
import { PAYMENT_METHOD_SUGGESTIONS } from '../constants';
import { errorMessage } from '../../../lib/errors';
import { defaultDateForMonth, monthEnd } from '../../../lib/dates';
import type { BudgetCategory, MonthlyBudget, Transaction, TransactionInput } from '../../../types/moneyTracker';

interface Props {
  mode: 'create' | 'edit';
  budget: MonthlyBudget;
  categories: BudgetCategory[];
  editing?: Transaction;
  onSubmit: (input: TransactionInput) => Promise<void>;
  onClose: () => void;
}

export default function TransactionForm({ mode, budget, categories, editing, onSubmit, onClose }: Props) {
  const [amount, setAmount] = useState(editing ? String(editing.amount) : '');
  const [categoryId, setCategoryId] = useState(editing?.category_id ?? '');
  const [type, setType] = useState<string>(editing?.transaction_type ?? 'expense');
  const [date, setDate] = useState(editing?.transaction_date ?? defaultDateForMonth(budget.month));
  const [description, setDescription] = useState(editing?.description ?? '');
  const [paymentMethod, setPaymentMethod] = useState(editing?.payment_method ?? '');
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function handleCategoryChange(id: string) {
    setCategoryId(id);
    const category = categories.find((c) => c.id === id);
    if (category) setType(category.type); // the category decides the type
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    const result = validateTransactionForm(
      { amount, categoryId, type, date, description, paymentMethod },
      categories,
      budget.month,
    );
    setErrors(result.errors);
    if (!result.value) return;
    setBusy(true);
    try {
      await onSubmit(result.value);
      onClose();
    } catch (err) {
      setSubmitError(errorMessage(err, mode === 'create' ? 'Unable to save the transaction.' : 'Unable to update the transaction.'));
      setBusy(false);
    }
  }

  return (
    <Modal title={mode === 'create' ? 'Add transaction' : 'Edit transaction'} onClose={onClose} locked={busy}>
      <form onSubmit={handleSubmit} noValidate>
        <label className="field">
          <span>Amount</span>
          <input
            inputMode="decimal"
            autoComplete="off"
            placeholder="3.50"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            aria-invalid={!!errors.amount}
            autoFocus
          />
          {errors.amount && <span className="field-error" role="alert">{errors.amount}</span>}
        </label>

        <div className="row-2">
          <label className="field">
            <span>Category</span>
            <select value={categoryId} onChange={(e) => handleCategoryChange(e.target.value)} aria-invalid={!!errors.categoryId}>
              <option value="">Choose a category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {errors.categoryId && <span className="field-error" role="alert">{errors.categoryId}</span>}
          </label>

          <label className="field">
            <span>Type</span>
            <select value={type} disabled aria-describedby="type-hint">
              <option value="expense">Expense</option>
              <option value="saving">Saving</option>
            </select>
            <span id="type-hint" className="hint">Set by the category.</span>
          </label>
        </div>

        <label className="field">
          <span>Date</span>
          <input type="date" value={date} min={budget.month} max={monthEnd(budget.month)} onChange={(e) => setDate(e.target.value)} aria-invalid={!!errors.date} />
          {errors.date && <span className="field-error" role="alert">{errors.date}</span>}
        </label>

        <label className="field">
          <span>Description <em className="optional">(optional)</em></span>
          <input value={description} maxLength={500} onChange={(e) => setDescription(e.target.value)} placeholder="Lunch" />
          {errors.description && <span className="field-error" role="alert">{errors.description}</span>}
        </label>

        <label className="field">
          <span>Payment method <em className="optional">(optional)</em></span>
          <input list="payment-methods" value={paymentMethod} maxLength={60} onChange={(e) => setPaymentMethod(e.target.value)} placeholder="Cash" />
          <datalist id="payment-methods">
            {PAYMENT_METHOD_SUGGESTIONS.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
          {errors.paymentMethod && <span className="field-error" role="alert">{errors.paymentMethod}</span>}
        </label>

        {submitError && <p className="form-error" role="alert">{submitError}</p>}

        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Saving…' : mode === 'create' ? 'Save transaction' : 'Save changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
