import type { HTMLAttributes } from 'react';
import { clsx } from 'clsx';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx(
        'rounded-2xl border border-zinc-200 bg-white p-4 shadow-[0_1px_2px_rgba(9,9,11,0.04)] dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none',
        className,
      )}
      {...props}
    />
  );
}

export function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-base font-bold tracking-tight text-zinc-950 dark:text-zinc-50">{title}</h2>
      {action}
    </div>
  );
}
