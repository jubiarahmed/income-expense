import { clsx } from 'clsx';

type Tone = 'brand' | 'income' | 'expense' | 'transfer';

const activeTone: Record<Tone, string> = {
  brand: 'bg-white text-indigo-700 shadow-sm dark:bg-zinc-800 dark:text-indigo-300',
  income: 'bg-white text-emerald-700 shadow-sm dark:bg-zinc-800 dark:text-emerald-300',
  expense: 'bg-white text-rose-700 shadow-sm dark:bg-zinc-800 dark:text-rose-300',
  transfer: 'bg-white text-sky-700 shadow-sm dark:bg-zinc-800 dark:text-sky-300',
};

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  tone = 'brand',
}: {
  value: T;
  options: { label: string; value: T }[];
  onChange: (value: T) => void;
  tone?: Tone;
}) {
  return (
    <div
      className="grid rounded-xl bg-zinc-100 p-1 dark:bg-zinc-900"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={clsx(
            'min-h-10 rounded-lg px-2 text-sm font-bold transition',
            value === option.value ? activeTone[tone] : 'text-zinc-500 active:text-zinc-900 dark:text-zinc-400',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
