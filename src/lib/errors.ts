/** An error whose message is safe to show to the user. Raw database errors never reach the UI. */
export class ServiceError extends Error {
  readonly code?: string;
  constructor(userMessage: string, code?: string) {
    super(userMessage);
    this.name = 'ServiceError';
    this.code = code;
  }
}

interface ErrorLike {
  code?: string;
  message?: string;
  status?: number;
}

interface Friendly {
  fallback: string;
  duplicate?: string;
  inUse?: string;
}

/** Convert anything thrown by Supabase into a ServiceError with a friendly message. */
export function toServiceError(err: unknown, friendly: Friendly): ServiceError {
  if (err instanceof ServiceError) return err;
  // Log the technical detail for developers only.
  console.error('[money-tracker]', err);

  const e = (err ?? {}) as ErrorLike;
  const msg = (e.message ?? '').toLowerCase();

  if (e.code === '23505') return new ServiceError(friendly.duplicate ?? friendly.fallback, e.code);
  if (e.code === '23503') return new ServiceError(friendly.inUse ?? friendly.fallback, e.code);
  if (msg.includes('month_has_transactions'))
    return new ServiceError('This month already has transactions, so its month cannot be changed.', 'month_has_transactions');
  if (msg.includes('date_outside_month'))
    return new ServiceError('The date must be inside the selected month.', 'date_outside_month');
  if (e.code === '42501' || msg.includes('row-level security'))
    return new ServiceError('You do not have permission to do that.', 'forbidden');
  if (msg.includes('jwt') || e.status === 401)
    return new ServiceError('Your session has expired. Please sign in again.', 'auth');
  if (msg.includes('failed to fetch') || msg.includes('network'))
    return new ServiceError('Cannot reach the server. Check your connection and try again.', 'network');
  return new ServiceError(friendly.fallback, e.code);
}

export function errorMessage(err: unknown, fallback: string): string {
  return err instanceof ServiceError ? err.message : fallback;
}
