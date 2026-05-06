import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { clsx } from 'clsx';

export function Field({ label, children, error }: { label: string; children: ReactNode; error?: string }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</span>
      {children}
      {error ? <span className="block text-xs font-medium text-rose-600">{error}</span> : null}
    </label>
  );
}

export function TextInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={clsx(
        'min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-base outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50',
        className,
      )}
      {...props}
    />
  );
}

export function TextArea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={clsx(
        'min-h-20 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-3 text-base outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50',
        className,
      )}
      {...props}
    />
  );
}

export function SelectInput({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={clsx(
        'min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-base outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function ChipButton({
  active,
  children,
  onClick,
}: {
  active?: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'min-h-10 rounded-full border px-3 text-sm font-semibold transition',
        active
          ? 'border-teal-700 bg-teal-700 text-white'
          : 'border-slate-200 bg-white text-slate-700 active:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200',
      )}
    >
      {children}
    </button>
  );
}
