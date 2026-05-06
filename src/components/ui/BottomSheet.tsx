import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { clsx } from 'clsx';

export function BottomSheet({
  open,
  title,
  children,
  onClose,
  className,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  className?: string;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-slate-950/45" role="dialog" aria-modal="true">
      <button className="absolute inset-0 cursor-default" aria-label="Close sheet" onClick={onClose} />
      <div
        className={clsx(
          'sheet-shadow safe-bottom relative max-h-[88dvh] w-full overflow-hidden rounded-t-3xl bg-slate-50 dark:bg-slate-950',
          className,
        )}
      >
        <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-slate-300 dark:bg-slate-700" />
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-950 dark:text-slate-50">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 place-items-center rounded-full bg-white text-slate-700 shadow-sm dark:bg-slate-900 dark:text-slate-200"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
        <div className="thin-scrollbar max-h-[calc(88dvh-82px)] overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}
