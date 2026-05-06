import { clsx } from 'clsx';

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { label: string; value: T }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="grid rounded-xl bg-slate-100 p-1 dark:bg-slate-900" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={clsx(
            'min-h-10 rounded-lg px-2 text-sm font-bold transition',
            value === option.value
              ? 'bg-white text-teal-800 shadow-sm dark:bg-slate-800 dark:text-teal-200'
              : 'text-slate-500 active:text-slate-900 dark:text-slate-400',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
