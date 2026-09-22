import type { CategoryType } from '../../types/moneyTracker';

/** Created automatically for every new month, with a $0 budget. */
export const DEFAULT_CATEGORIES: ReadonlyArray<{ name: string; type: CategoryType }> = [
  { name: 'Food', type: 'expense' },
  { name: 'Transport', type: 'expense' },
  { name: 'Rental House', type: 'expense' },
  { name: 'Water & Light', type: 'expense' },
  { name: 'School Saving', type: 'saving' },
  { name: 'Skincare', type: 'expense' },
  { name: 'Support Family', type: 'expense' },
  { name: 'Other', type: 'expense' },
];

export const PAYMENT_METHOD_SUGGESTIONS = ['Cash', 'Debit card', 'Credit card', 'Bank transfer', 'Mobile wallet'];

export const CHART_COLORS = [
  '#0f5c4d', '#3b5bdb', '#d1495b', '#e0a100', '#7a4fd6', '#0e8fa8', '#8a6d3b', '#5f6b76', '#2f9e6b', '#c2578a',
];
