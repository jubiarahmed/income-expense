import { useMemo, useState } from 'react';
import { ArrowLeftRight, ArrowUpRight, Check, Pencil, Wand2, X } from 'lucide-react';
import { clsx } from 'clsx';
import { todayISO } from '../../lib/date';
import { parseQuickEntry, type QuickAddIntent, type QuickAddParseResult } from '../../lib/quickAdd';
import type { ExpenseCategory, IncomeCategory } from '../../domain/models';
import { useFinanceStore } from '../../state/useFinanceStore';
import { useToastStore } from '../../state/useToastStore';
import { useUiStore } from '../../state/useUiStore';

const intentLabel: Record<QuickAddIntent, string> = {
  expense: 'Expense',
  income: 'Income',
  transfer: 'Transfer',
};

const intentTone: Record<QuickAddIntent, string> = {
  expense: 'bg-rose-600 text-white',
  income: 'bg-emerald-600 text-white',
  transfer: 'bg-sky-600 text-white',
};

export function QuickAddBar({ compact = false }: { compact?: boolean }) {
  const addExpense = useFinanceStore((state) => state.addExpense);
  const addIncome = useFinanceStore((state) => state.addIncome);
  const addTransfer = useFinanceStore((state) => state.addTransfer);
  const openAddFlow = useUiStore((state) => state.openAddFlow);
  const pushToast = useToastStore((state) => state.push);

  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);

  const parsed = useMemo<QuickAddParseResult | null>(() => {
    const trimmed = value.trim();
    return trimmed ? parseQuickEntry(trimmed) : null;
  }, [value]);

  const ready = Boolean(parsed && parsed.amount && parsed.amount > 0);

  async function commit() {
    if (!ready || !parsed || !parsed.amount) return;
    setBusy(true);
    try {
      if (parsed.intent === 'expense') {
        await addExpense({
          amount: parsed.amount,
          category: (parsed.category as ExpenseCategory) ?? 'Other',
          note: parsed.note,
          date: todayISO(),
          paymentMethod: parsed.paymentMethod ?? 'Cash',
          tags: '',
        });
      } else if (parsed.intent === 'income') {
        await addIncome({
          amount: parsed.amount,
          category: (parsed.category as IncomeCategory) ?? 'Others',
          source: parsed.note,
          note: '',
          date: todayISO(),
          paymentMethod: parsed.paymentMethod ?? 'Bank',
        });
      } else {
        await addTransfer({
          amount: parsed.amount,
          fromMethod: parsed.fromMethod ?? 'Cash',
          toMethod: parsed.toMethod ?? 'Bank',
          fee: 0,
          date: todayISO(),
          note: parsed.note,
        });
      }
      setValue('');
      pushToast(`${intentLabel[parsed.intent]} added.`, { tone: 'success' });
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Could not add entry.', { tone: 'danger' });
    } finally {
      setBusy(false);
    }
  }

  function openFullForm() {
    if (!parsed) return;
    openAddFlow(parsed.intent === 'transfer' ? 'transfer' : parsed.intent === 'income' ? 'income' : 'expense');
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Wand2 size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-indigo-500" />
        <input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && ready) {
              event.preventDefault();
              void commit();
            }
          }}
          placeholder="Quick add — try '120 lunch cash' or 'salary 50000 bank'"
          className={clsx(
            'min-h-12 w-full rounded-xl border border-indigo-200 bg-indigo-50/30 pl-10 pr-10 text-base font-semibold outline-none transition placeholder:font-normal placeholder:text-zinc-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-indigo-900 dark:bg-indigo-950/30 dark:text-zinc-50',
          )}
        />
        {value ? (
          <button
            type="button"
            onClick={() => setValue('')}
            aria-label="Clear"
            className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-white text-zinc-500 ring-1 ring-zinc-200 active:bg-zinc-100 dark:bg-zinc-900 dark:text-zinc-300 dark:ring-zinc-700"
          >
            <X size={14} />
          </button>
        ) : null}
      </div>

      {parsed && !compact ? (
        <div className="rounded-xl border border-indigo-100 bg-white p-3 text-xs dark:border-indigo-900 dark:bg-zinc-900">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={clsx('rounded-full px-2 py-0.5 text-[0.65rem] font-black uppercase tracking-wide', intentTone[parsed.intent])}>
              {parsed.intent === 'expense' ? 'Spend' : parsed.intent === 'income' ? 'Earn' : 'Move'}
            </span>
            {parsed.amount ? (
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 font-bold tabular-nums dark:bg-zinc-800">{parsed.amount}</span>
            ) : (
              <span className="rounded-full bg-rose-100 px-2 py-0.5 font-bold text-rose-700 dark:bg-rose-950 dark:text-rose-300">No amount detected</span>
            )}
            {parsed.category ? (
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">{parsed.category}</span>
            ) : null}
            {parsed.paymentMethod && parsed.intent !== 'transfer' ? (
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">{parsed.paymentMethod}</span>
            ) : null}
            {parsed.intent === 'transfer' && parsed.fromMethod && parsed.toMethod ? (
              <span className="flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 font-semibold text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                {parsed.fromMethod} <ArrowLeftRight size={10} /> {parsed.toMethod}
              </span>
            ) : null}
            {parsed.note ? <span className="text-zinc-500">"{parsed.note}"</span> : null}
            <span
              className={clsx(
                'ml-auto rounded-full px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider',
                parsed.confidence === 'high'
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                  : parsed.confidence === 'medium'
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                    : 'bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300',
              )}
            >
              {parsed.confidence}
            </span>
          </div>

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => void commit()}
              disabled={!ready || busy}
              className={clsx(
                'inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-lg text-xs font-bold transition disabled:opacity-50',
                parsed.intent === 'income'
                  ? 'bg-emerald-600 text-white active:bg-emerald-700'
                  : parsed.intent === 'transfer'
                    ? 'bg-sky-600 text-white active:bg-sky-700'
                    : 'bg-rose-600 text-white active:bg-rose-700',
              )}
            >
              <Check size={14} />
              {busy ? 'Adding…' : `Add ${intentLabel[parsed.intent].toLowerCase()}`}
            </button>
            <button
              type="button"
              onClick={openFullForm}
              className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg bg-zinc-100 px-3 text-xs font-bold text-zinc-700 active:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200"
            >
              <Pencil size={14} />
              Edit details
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

void ArrowUpRight;
