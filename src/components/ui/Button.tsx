import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { clsx } from 'clsx';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  icon?: ReactNode;
}

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-teal-700 text-white shadow-sm active:bg-teal-800 disabled:bg-teal-300',
  secondary: 'bg-white text-slate-900 ring-1 ring-slate-200 active:bg-slate-50 dark:bg-slate-900 dark:text-slate-100 dark:ring-slate-700',
  ghost: 'bg-transparent text-slate-700 active:bg-slate-100 dark:text-slate-200 dark:active:bg-slate-800',
  danger: 'bg-rose-600 text-white active:bg-rose-700 disabled:bg-rose-300',
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
