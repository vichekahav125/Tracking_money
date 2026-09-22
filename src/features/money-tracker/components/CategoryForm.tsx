import { useState, type FormEvent } from 'react';
import Modal from './Modal';
import { validateCategoryForm } from '../validation';
import { errorMessage } from '../../../lib/errors';
import type { BudgetCategory, CategoryInput } from '../../../types/moneyTracker';

interface Props {
  mode: 'create' | 'edit';
  existing: BudgetCategory[];
  editing?: BudgetCategory;
  onSubmit: (input: CategoryInput) => Promise<void>;
  onClose: () => void;
}

export default function CategoryForm({ mode, existing, editing, onSubmit, onClose }: Props) {
  const [name, setName] = useState(editing?.name ?? '');
  const [budget, setBudget] = useState(editing ? String(editing.budget_amount) : '');
  const [type, setType] = useState<string>(editing?.type ?? 'expense');
  const [errors, setErrors] = useState<{ name?: string; budget?: string; type?: string }>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    const result = validateCategoryForm({ name, budget, type }, existing, editing?.id);
    setErrors(result.errors);
    if (!result.value) return;
    setBusy(true);
    try {
      await onSubmit(result.value);
      onClose();
    } catch (err) {
      setSubmitError(errorMessage(err, 'Unable to save the category.'));
      setBusy(false);
    }
  }

  return (
    <Modal title={mode === 'create' ? 'Add category' : 'Edit category'} onClose={onClose} locked={busy}>
      <form onSubmit={handleSubmit} noValidate>
        <label className="field">
          <span>Category name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} autoFocus aria-invalid={!!errors.name} />
          {errors.name && <span className="field-error" role="alert">{errors.name}</span>}
        </label>

        <label className="field">
          <span>Budget amount</span>
          <input inputMode="decimal" placeholder="0.00" value={budget} onChange={(e) => setBudget(e.target.value)} aria-invalid={!!errors.budget} />
          {errors.budget && <span className="field-error" role="alert">{errors.budget}</span>}
        </label>

        <label className="field">
          <span>Type</span>
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="expense">Expense</option>
            <option value="saving">Saving</option>
          </select>
          {errors.type && <span className="field-error" role="alert">{errors.type}</span>}
        </label>

        {submitError && <p className="form-error" role="alert">{submitError}</p>}

        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Saving…' : mode === 'create' ? 'Add category' : 'Save changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
