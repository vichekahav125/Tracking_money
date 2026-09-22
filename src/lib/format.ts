const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** 3.5 -> "$3.50", -5 -> "-$5.00" */
export function formatMoney(value: number): string {
  const safe = Number.isFinite(value) ? value : 0;
  // avoid "-$0.00"
  return usd.format(Math.abs(safe) < 0.005 ? 0 : safe);
}

export function formatPercent(value: number): string {
  return `${Math.round(Number.isFinite(value) ? value : 0)}%`;
}

/**
 * Parse user-typed money ("3.5", "$1,200.50") into a number rounded to cents.
 * Returns null when the text is not a valid non-negative amount.
 */
export function parseMoneyInput(text: string): number | null {
  const cleaned = text.trim().replace(/^\$/, '').replace(/,/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned) && !/^\.\d{1,2}$/.test(cleaned)) return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n > 9_999_999_999) return null;
  return Math.round(n * 100) / 100;
}
