import type { ReactNode } from 'react';

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center dark:border-slate-700 dark:bg-slate-950">
      <p className="text-base font-bold text-slate-950 dark:text-slate-50">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{body}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
