import type { ReactNode } from 'react';
import { clsx } from 'clsx';

type Tone = 'neutral' | 'good' | 'warn' | 'danger' | 'info';

const toneClass: Record<Tone, string> = {
  neutral: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200',
  good: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200',
  warn: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-200',
  danger: 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-200',
  info: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-200',
};

export function Badge({ children, tone = 'neutral', className }: { children: ReactNode; tone?: Tone; className?: string }) {
  return <span className={clsx('inline-flex rounded-full px-2.5 py-1 text-xs font-semibold', toneClass[tone], className)}>{children}</span>;
}
