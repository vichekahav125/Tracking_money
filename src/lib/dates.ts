/** All month keys are "YYYY-MM-01" strings. Dates are "YYYY-MM-DD". No timezone math. */

const pad = (n: number) => String(n).padStart(2, '0');

export function monthStart(year: number, month1to12: number): string {
  return `${year}-${pad(month1to12)}-01`;
}

export function splitMonth(monthStartStr: string): { year: number; month: number } {
  const [y, m] = monthStartStr.split('-');
  return { year: Number(y), month: Number(m) };
}

export function currentMonthStart(now = new Date()): string {
  return monthStart(now.getFullYear(), now.getMonth() + 1);
}

export function todayISO(now = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function monthEnd(monthStartStr: string): string {
  const { year, month } = splitMonth(monthStartStr);
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${year}-${pad(month)}-${pad(last)}`;
}

export function isDateInMonth(date: string, monthStartStr: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && date >= monthStartStr && date <= monthEnd(monthStartStr);
}

/** Today if it falls inside the month, otherwise the first day of that month. */
export function defaultDateForMonth(monthStartStr: string): string {
  const today = todayISO();
  return isDateInMonth(today, monthStartStr) ? today : monthStartStr;
}

const monthFmt = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const monthShortFmt = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' });
const dayFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
const longDayFmt = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

function toUtcDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1));
}

/** "2026-09-01" -> "September 2026" */
export const formatMonthLabel = (m: string) => monthFmt.format(toUtcDate(m));
/** "2026-09-01" -> "Sep" */
export const formatMonthShort = (m: string) => monthShortFmt.format(toUtcDate(m));
/** "2026-09-21" -> "Sep 21" */
export const formatShortDate = (d: string) => dayFmt.format(toUtcDate(d));
/** "2026-09-21" -> "September 21, 2026" */
export const formatLongDate = (d: string) => longDayFmt.format(toUtcDate(d));

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
