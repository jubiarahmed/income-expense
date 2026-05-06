import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { clsx } from 'clsx';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'income' | 'transfer';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  icon?: ReactNode;
}

const variants: Record<ButtonVariant, string> = {
  primary:
    'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20 active:bg-indigo-700 disabled:bg-indigo-300 dark:disabled:bg-indigo-900',
  secondary:
    'bg-white text-zinc-900 ring-1 ring-zinc-200 active:bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-100 dark:ring-zinc-800 dark:active:bg-zinc-800',
  ghost:
    'bg-transparent text-zinc-700 active:bg-zinc-100 dark:text-zinc-200 dark:active:bg-zinc-800',
  danger:
    'bg-rose-600 text-white shadow-sm shadow-rose-600/20 active:bg-rose-700 disabled:bg-rose-300 dark:disabled:bg-rose-900',
  income:
    'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20 active:bg-emerald-700 disabled:bg-emerald-300 dark:disabled:bg-emerald-900',
  transfer:
    'bg-sky-600 text-white shadow-sm shadow-sky-600/20 active:bg-sky-700 disabled:bg-sky-300 dark:disabled:bg-sky-900',
};

export function Button({ className, variant = 'primary', icon, children, type = 'button', ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={clsx(
        'inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-70',
        variants[variant],
        className,
      )}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
