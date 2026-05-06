import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { clsx } from 'clsx';

export function Field({ label, children, error }: { label: string; children: ReactNode; error?: string }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{label}</span>
      {children}
      {error ? <span className="block text-xs font-medium text-rose-600">{error}</span> : null}
    </label>
  );
}

const inputClass =
  'min-h-12 w-full rounded-xl border border-zinc-200 bg-white px-3 text-base outline-none transition placeholder:text-zinc-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50';

export function TextInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={clsx(inputClass, className)} {...props} />;
}

export function TextArea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={clsx(
        'min-h-20 w-full resize-none rounded-xl border border-zinc-200 bg-white px-3 py-3 text-base outline-none transition placeholder:text-zinc-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50',
        className,
      )}
      {...props}
    />
  );
}

export function SelectInput({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={clsx(inputClass, className)} {...props}>
      {children}
    </select>
  );
}

export function ChipButton({
  active,
  children,
  onClick,
  tone = 'brand',
}: {
  active?: boolean;
  children: ReactNode;
  onClick: () => void;
  tone?: 'brand' | 'income' | 'expense' | 'transfer';
}) {
  const activeStyles = {
    brand: 'border-indigo-600 bg-indigo-600 text-white',
    income: 'border-emerald-600 bg-emerald-600 text-white',
    expense: 'border-rose-600 bg-rose-600 text-white',
    transfer: 'border-sky-600 bg-sky-600 text-white',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'min-h-10 rounded-full border px-3 text-sm font-semibold transition',
        active
          ? activeStyles[tone]
          : 'border-zinc-200 bg-white text-zinc-700 active:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200',
      )}
    >
      {children}
    </button>
  );
}
