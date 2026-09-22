import { formatMoney } from '../../../lib/format';

interface Props {
  label: string;
  value: number;
  tone?: 'neutral' | 'expense' | 'saving' | 'remaining';
}

export default function SummaryCard({ label, value, tone = 'neutral' }: Props) {
  const negative = value < 0;
  return (
    <div className={`summary-card tone-${tone}${negative ? ' is-negative' : ''}`}>
      <dt>{label}</dt>
      <dd>{formatMoney(value)}</dd>
    </div>
  );
}
