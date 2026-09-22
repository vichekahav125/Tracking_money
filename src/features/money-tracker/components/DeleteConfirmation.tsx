import { useState, type ReactNode } from 'react';
import Modal from './Modal';
import { errorMessage } from '../../../lib/errors';

interface Props {
  title: string;
  children: ReactNode;
  confirmLabel?: string;
  busyLabel?: string;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

export default function DeleteConfirmation({
  title,
  children,
  confirmLabel = 'Delete',
  busyLabel = 'Deleting…',
  onConfirm,
  onCancel,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
      // parent closes the dialog once the item is gone
    } catch (err) {
      setError(errorMessage(err, 'Something went wrong. Please try again.'));
      setBusy(false);
    }
  }

  return (
    <Modal title={title} onClose={onCancel} locked={busy}>
      <div className="modal-body">{children}</div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="modal-actions">
        <button type="button" className="btn" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
        <button type="button" className="btn btn-danger" onClick={confirm} disabled={busy}>
          {busy ? busyLabel : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
