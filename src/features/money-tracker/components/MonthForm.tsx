import { useState, type FormEvent } from 'react';
import Modal from './Modal';
import { validateMonthForm } from '../validation';
import { errorMessage } from '../../../lib/errors';
import { MONTH_NAMES, currentMonthStart, monthStart, splitMonth } from '../../../lib/dates';
import type { MonthInput, MonthlyBudget } from '../../../types/moneyTracker';

interface Props {
  mode: 'create' | 'edit';
  existing: MonthlyBudget[];
  editing?: MonthlyBudget;
  /** When true the month itself is locked (it already has transactions). */
  monthLocked?: boolean;
  onSubmit: (input: MonthInput) => Promise<void>;
  onClose: () => void;
}

export default function MonthForm({ mode, existing, editing, monthLocked = false, onSubmit, onClose }: Props) {
  const start = editing?.month ?? currentMonthStart();
  const initial = splitMonth(start);
  const [year, setYear] = useState(initial.year);
  const [monthNumber, setMonthNumber] = useState(initial.month);
  const [total, setTotal] = useState(editing ? String(editing.total_amount) : '');
  const [errors, setErrors] = useState<{ month?: string; total?: string }>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const thisYear = new Date().getFullYear();
  const years = Array.from(new Set([initial.year, ...Array.from({ length: 9 }, (_, i) => thisYear - 4 + i)])).sort();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    const result = validateMonthForm({ month: monthStart(year, monthNumber), total }, existing, editing?.id);
    setErrors(result.errors);
    if (!result.value) return;
    setBusy(true);
    try {
      await onSubmit(result.value);
      onClose();
    } catch (err) {
      setSubmitError(errorMessage(err, mode === 'create' ? 'Unable to create the month.' : 'Unable to update the month.'));
      setBusy(false);
    }
  }

  return (
    <Modal title={mode === 'create' ? 'Create monthly budget' : 'Edit month'} onClose={onClose} locked={busy}>
      <form onSubmit={handleSubmit} noValidate>
        <fieldset className="field" disabled={monthLocked || busy}>
          <legend>Month</legend>
          <div className="row-2">
            <select aria-label="Month" value={monthNumber} onChange={(e) => setMonthNumber(Number(e.target.value))}>
              {MONTH_NAMES.map((name, i) => (
                <option key={name} value={i + 1}>
                  {name}
                </option>
              ))}
            </select>
            <select aria-label="Year" value={year} onChange={(e) => setYear(Number(e.target.value))}>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          {monthLocked && <span className="hint">This month has transactions, so it can’t be moved to another month.</span>}
          {errors.month && <span className="field-error" role="alert">{errors.month}</span>}
        </fieldset>

        <label className="field">
          <span>Total money</span>
          <input
            inputMode="decimal"
            autoComplete="off"
            placeholder="500.00"
            value={total}
            onChange={(e) => setTotal(e.target.value)}
            aria-invalid={!!errors.total}
            autoFocus
          />
          <span className="hint">Everything you plan to spend or save this month.</span>
          {errors.total && <span className="field-error" role="alert">{errors.total}</span>}
        </label>

        {submitError && <p className="form-error" role="alert">{submitError}</p>}

        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? (mode === 'create' ? 'Creating…' : 'Saving…') : mode === 'create' ? 'Create' : 'Save changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
