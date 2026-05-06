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
    <div className="fixed inset-0 z-50 flex items-end bg-zinc-950/55 backdrop-blur-sm" role="dialog" aria-modal="true">
      <button className="absolute inset-0 cursor-default" aria-label="Close sheet" onClick={onClose} />
      <div
        className={clsx(
          'sheet-shadow safe-bottom relative max-h-[88dvh] w-full overflow-hidden rounded-t-3xl bg-white dark:bg-zinc-950',
          className,
        )}
      >
        <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-zinc-300 dark:bg-zinc-700" />
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <h2 className="text-lg font-bold tracking-tight text-zinc-950 dark:text-zinc-50">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 place-items-center rounded-full bg-zinc-100 text-zinc-700 active:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-200 dark:active:bg-zinc-800"
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
