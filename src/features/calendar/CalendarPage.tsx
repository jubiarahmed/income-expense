import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isSameDay,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { ArrowLeft, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Repeat } from 'lucide-react';
import { clsx } from 'clsx';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, SectionHeader } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { PullToRefresh } from '../../components/ui/PullToRefresh';
import { getExpenseCategoryStyle, getIncomeCategoryStyle } from '../../domain/categoryIcons';
import { formatFullDate } from '../../lib/date';
import { formatMoney, roundMoney } from '../../lib/money';
import { useFinanceStore } from '../../state/useFinanceStore';

export function CalendarPage() {
  const navigate = useNavigate();
  const reload = useFinanceStore((state) => state.reload);
  const { preferences, expenses, incomes, transfers, loans, items, subscriptions } = useFinanceStore();
  const [cursor, setCursor] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const monthLabel = format(cursor, 'MMMM yyyy');
  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const dayData = useMemo(() => {
    const map = new Map<string, { expense: number; income: number; transfer: number; dueCount: number }>();
    for (const expense of expenses) {
      if (!expense.date.startsWith(format(cursor, 'yyyy-MM'))) continue;
      const cell = map.get(expense.date) ?? { expense: 0, income: 0, transfer: 0, dueCount: 0 };
      cell.expense += expense.amount;
      map.set(expense.date, cell);
    }
    for (const income of incomes) {
      if (!income.date.startsWith(format(cursor, 'yyyy-MM'))) continue;
      const cell = map.get(income.date) ?? { expense: 0, income: 0, transfer: 0, dueCount: 0 };
      cell.income += income.amount;
      map.set(income.date, cell);
    }
    for (const transfer of transfers) {
      if (!transfer.date.startsWith(format(cursor, 'yyyy-MM'))) continue;
      const cell = map.get(transfer.date) ?? { expense: 0, income: 0, transfer: 0, dueCount: 0 };
      cell.transfer += transfer.amount;
      map.set(transfer.date, cell);
    }
    for (const subscription of subscriptions) {
      if (subscription.status !== 'active') continue;
      const date = subscription.nextDueDate;
      if (!date.startsWith(format(cursor, 'yyyy-MM'))) continue;
      const cell = map.get(date) ?? { expense: 0, income: 0, transfer: 0, dueCount: 0 };
      cell.dueCount += 1;
      map.set(date, cell);
    }
    for (const loan of loans) {
      if (!loan.dueDate || loan.status === 'settled') continue;
      if (!loan.dueDate.startsWith(format(cursor, 'yyyy-MM'))) continue;
      const cell = map.get(loan.dueDate) ?? { expense: 0, income: 0, transfer: 0, dueCount: 0 };
      cell.dueCount += 1;
      map.set(loan.dueDate, cell);
    }
    for (const item of items) {
      if (!item.dueDate || item.status === 'returned') continue;
      if (!item.dueDate.startsWith(format(cursor, 'yyyy-MM'))) continue;
      const cell = map.get(item.dueDate) ?? { expense: 0, income: 0, transfer: 0, dueCount: 0 };
      cell.dueCount += 1;
      map.set(item.dueDate, cell);
    }
    return map;
  }, [cursor, expenses, incomes, transfers, subscriptions, loans, items]);

  const monthTotals = useMemo(() => {
    let exp = 0;
    let inc = 0;
    for (const cell of dayData.values()) {
      exp += cell.expense;
      inc += cell.income;
    }
    return { expense: roundMoney(exp), income: roundMoney(inc), net: roundMoney(inc - exp) };
  }, [dayData]);

  const selectedExpenses = expenses.filter((expense) => expense.date === selectedDate);
  const selectedIncomes = incomes.filter((income) => income.date === selectedDate);
  const selectedTransfers = transfers.filter((transfer) => transfer.date === selectedDate);
  const selectedSubs = subscriptions.filter((sub) => sub.status === 'active' && sub.nextDueDate === selectedDate);
  const selectedLoans = loans.filter((loan) => loan.status !== 'settled' && loan.dueDate === selectedDate);
  const selectedItems = items.filter((item) => item.status !== 'returned' && item.dueDate === selectedDate);

  return (
    <PullToRefresh onRefresh={reload}>
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <Button variant="secondary" icon={<ArrowLeft size={16} />} onClick={() => navigate(-1)}>
            Back
          </Button>
          <div className="flex flex-1 items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-300">
              <CalendarIcon size={18} />
            </span>
            <div>
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-amber-600 dark:text-amber-400">Calendar</p>
              <p className="text-sm font-bold tracking-tight text-zinc-700 dark:text-zinc-200">Daily spending view</p>
            </div>
          </div>
        </div>

        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setCursor((c) => subMonths(c, 1))}
              className="grid h-9 w-9 place-items-center rounded-full bg-zinc-100 text-zinc-600 active:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"
              aria-label="Previous month"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="text-center">
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Month</p>
              <p className="text-lg font-black tracking-tight">{monthLabel}</p>
            </div>
            <button
              type="button"
              onClick={() => setCursor((c) => addMonths(c, 1))}
              className="grid h-9 w-9 place-items-center rounded-full bg-zinc-100 text-zinc-600 active:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"
              aria-label="Next month"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[0.65rem] font-bold uppercase tracking-wide text-zinc-500">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {days.map((day) => {
              const iso = format(day, 'yyyy-MM-dd');
              const inMonth = isSameMonth(day, cursor);
              const isSelected = iso === selectedDate;
              const today = isToday(day);
              const cell = dayData.get(iso);
              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => setSelectedDate(iso)}
                  className={clsx(
                    'flex min-h-14 flex-col items-center justify-start gap-0.5 rounded-lg p-1 text-center transition',
                    !inMonth && 'opacity-40',
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : today
                        ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:ring-indigo-800'
                        : 'bg-zinc-50 text-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-300',
                  )}
                >
                  <span className={clsx('text-xs font-bold', isSelected && 'text-white')}>{format(day, 'd')}</span>
                  {cell?.expense ? (
                    <span className={clsx('text-[0.6rem] font-black tabular-nums', isSelected ? 'text-white' : 'text-rose-600 dark:text-rose-400')}>
                      −{Math.round(cell.expense)}
                    </span>
                  ) : null}
                  {cell?.income ? (
                    <span className={clsx('text-[0.6rem] font-black tabular-nums', isSelected ? 'text-white' : 'text-emerald-600 dark:text-emerald-400')}>
                      +{Math.round(cell.income)}
                    </span>
                  ) : null}
                  <div className="flex gap-0.5">
                    {cell?.dueCount ? (
                      <span className={clsx('h-1 w-1 rounded-full', isSelected ? 'bg-white' : 'bg-amber-500')} />
                    ) : null}
                    {cell?.transfer ? (
                      <span className={clsx('h-1 w-1 rounded-full', isSelected ? 'bg-white' : 'bg-sky-500')} />
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-3 gap-2 rounded-xl bg-zinc-50 p-2 text-xs dark:bg-zinc-800/60">
            <div className="text-center">
              <p className="text-[0.65rem] font-bold uppercase tracking-wide text-zinc-500">Month income</p>
              <p className="mt-0.5 font-black tabular-nums text-emerald-600 dark:text-emerald-400">
                {formatMoney(monthTotals.income, preferences.currency)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-[0.65rem] font-bold uppercase tracking-wide text-zinc-500">Month expense</p>
              <p className="mt-0.5 font-black tabular-nums text-rose-600 dark:text-rose-400">
                {formatMoney(monthTotals.expense, preferences.currency)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-[0.65rem] font-bold uppercase tracking-wide text-zinc-500">Net</p>
              <p
                className={clsx(
                  'mt-0.5 font-black tabular-nums',
                  monthTotals.net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400',
                )}
              >
                {formatMoney(monthTotals.net, preferences.currency)}
              </p>
            </div>
          </div>
        </Card>

        <SectionHeader title={formatFullDate(selectedDate)} />

        {selectedSubs.length || selectedLoans.length || selectedItems.length ? (
          <Card className="space-y-2">
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400">
              <Repeat size={12} />
              Due today
            </p>
            {selectedSubs.map((sub) => (
              <div key={sub.id} className="flex items-center justify-between rounded-xl bg-amber-50 px-3 py-2 dark:bg-amber-950/40">
                <span className="text-sm font-bold text-zinc-950 dark:text-zinc-50">{sub.name}</span>
                <span className="font-black tabular-nums">{formatMoney(sub.amount, preferences.currency)}</span>
              </div>
            ))}
            {selectedLoans.map((loan) => (
              <div key={loan.id} className="flex items-center justify-between rounded-xl bg-amber-50 px-3 py-2 dark:bg-amber-950/40">
                <span className="text-sm font-bold text-zinc-950 dark:text-zinc-50">
                  Loan {loan.direction === 'lent' ? 'incoming' : 'due'}
                </span>
                <span className="font-black tabular-nums">{formatMoney(loan.amount, preferences.currency)}</span>
              </div>
            ))}
            {selectedItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-xl bg-amber-50 px-3 py-2 dark:bg-amber-950/40">
                <span className="text-sm font-bold text-zinc-950 dark:text-zinc-50">{item.itemName}</span>
                <Badge tone="warn">{item.direction === 'lent' ? 'Expected back' : 'Return'}</Badge>
              </div>
            ))}
          </Card>
        ) : null}

        {selectedExpenses.length === 0 && selectedIncomes.length === 0 && selectedTransfers.length === 0 ? (
          <EmptyState
            title="Nothing logged on this day"
            body="Tap another day or add a record from the + button."
            icon={<CalendarIcon size={22} />}
          />
        ) : (
          <div className="space-y-2">
            {selectedIncomes.map((income) => {
              const style = getIncomeCategoryStyle(income.category);
              const Icon = style.icon;
              return (
                <Card key={income.id} className="p-3">
                  <div className="flex items-center gap-3">
                    <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${style.bg} ${style.fg}`}>
                      <Icon size={20} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold tracking-tight">{income.source || income.note || income.category}</p>
                      <p className="text-xs text-zinc-500">{income.category} · {income.paymentMethod}</p>
                    </div>
                    <p className="font-black tabular-nums text-emerald-600 dark:text-emerald-400">
                      +{formatMoney(income.amount, preferences.currency)}
                    </p>
                  </div>
                </Card>
              );
            })}
            {selectedExpenses.map((expense) => {
              const style = getExpenseCategoryStyle(expense.category);
              const Icon = style.icon;
              return (
                <Card key={expense.id} className="p-3">
                  <div className="flex items-center gap-3">
                    <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${style.bg} ${style.fg}`}>
                      <Icon size={20} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold tracking-tight">{expense.merchant || expense.note || expense.category}</p>
                      <p className="text-xs text-zinc-500">{expense.category} · {expense.paymentMethod}</p>
                    </div>
                    <p className="font-black tabular-nums text-rose-600 dark:text-rose-400">
                      −{formatMoney(expense.amount, preferences.currency)}
                    </p>
                  </div>
                </Card>
              );
            })}
            {selectedTransfers.map((transfer) => (
              <Card key={transfer.id} className="p-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                    <Repeat size={20} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold tracking-tight">{transfer.fromMethod} → {transfer.toMethod}</p>
                    {transfer.note ? <p className="text-xs text-zinc-500">{transfer.note}</p> : null}
                  </div>
                  <p className="font-black tabular-nums text-sky-700 dark:text-sky-300">
                    {formatMoney(transfer.amount, preferences.currency)}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        )}

        <p className="pt-2 text-center text-[0.65rem] text-zinc-400">
          <span className="mr-2"><span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500 align-middle" /> Due</span>
          <span><span className="inline-block h-1.5 w-1.5 rounded-full bg-sky-500 align-middle" /> Transfer</span>
        </p>
      </div>
    </PullToRefresh>
  );
}

void isSameDay;
