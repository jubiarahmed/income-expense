import { X } from 'lucide-react';
import { clsx } from 'clsx';
import { useToastStore } from '../../state/useToastStore';

export function Toaster() {
  const toasts = useToastStore((state) => state.toasts);
  const dismiss = useToastStore((state) => state.dismiss);

  return (
    <div className="safe-bottom pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex flex-col items-center gap-2 px-4">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={clsx(
            'pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold shadow-xl ring-1 ring-black/10',
            toast.tone === 'danger'
              ? 'bg-rose-600 text-white'
              : toast.tone === 'success'
                ? 'bg-teal-700 text-white'
                : 'bg-slate-900 text-white dark:bg-slate-800',
          )}
          role="status"
        >
          <span className="flex-1">{toast.message}</span>
          {toast.action ? (
            <button
              type="button"
              onClick={() => {
                void toast.action!.onClick();
                dismiss(toast.id);
              }}
              className="rounded-lg px-2 py-1 text-xs font-bold uppercase tracking-wide text-teal-200 underline-offset-2 hover:underline"
            >
              {toast.action.label}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => dismiss(toast.id)}
            aria-label="Dismiss"
            className="grid h-7 w-7 place-items-center rounded-full text-white/80 hover:bg-white/10 hover:text-white"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
