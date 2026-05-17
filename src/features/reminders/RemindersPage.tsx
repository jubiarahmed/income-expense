import { useMemo } from 'react';
import { AlertTriangle, ArrowLeft, BellRing, CalendarClock, HandCoins, PackageOpen, Plus, Repeat, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, SectionHeader } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { PullToRefresh } from '../../components/ui/PullToRefresh';
import { getExpenseCategoryStyle } from '../../domain/categoryIcons';
import type { CurrencyCode, ExpenseCategory } from '../../domain/models';
import { formatFullDate } from '../../lib/date';
import { formatMoney } from '../../lib/money';
import {
  getUpcomingReminders,
  predictRecurringExpenses,
  type ReminderUrgency,
  type UpcomingReminder,
} from '../../lib/reminders';
import { useFinanceStore } from '../../state/useFinanceStore';
import { useUiStore } from '../../state/useUiStore';

const urgencyBadge: Record<ReminderUrgency, 'danger' | 'warn' | 'good' | 'neutral' | 'info'> = {
  overdue: 'danger',
  today: 'warn',
  soon: 'warn',
  upcoming: 'info',
};

const urgencyLabel: Record<ReminderUrgency, string> = {
  overdue: 'Overdue',
  today: 'Today',
  soon: 'Due soon',
  upcoming: 'Upcoming',
};

function daysCopy(daysUntil: number) {
  if (daysUntil < 0) return `${Math.abs(daysUntil)} day${Math.abs(daysUntil) === 1 ? '' : 's'} overdue`;
  if (daysUntil === 0) return 'today';
  if (daysUntil === 1) return 'tomorrow';
  return `in ${daysUntil} days`;
}

export function RemindersPage() {
  const navigate = useNavigate();
  const reload = useFinanceStore((state) => state.reload);
  const openAddFlow = useUiStore((state) => state.openAddFlow);
  const { preferences, expenses, loans, loanPayments, items, subscriptions } = useFinanceStore();

  const upcoming = useMemo(
    () => getUpcomingReminders(loans, loanPayments, items, subscriptions, 30),
    [items, loanPayments, loans, subscriptions],
  );
  const recurring = useMemo(() => predictRecurringExpenses(expenses, 14), [expenses]);

  const overdue = upcoming.filter((entry) => entry.urgency === 'overdue');
  const dueSoon = upcoming.filter((entry) => entry.urgency !== 'overdue');

  return (
    <PullToRefresh onRefresh={reload}>
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <Button variant="secondary" icon={<ArrowLeft size={16} />} onClick={() => navigate(-1)}>
            Back
          </Button>
          <div className="flex flex-1 items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300">
              <BellRing size={18} />
            </span>
            <div>
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-400">
                Reminders
              </p>
              <p className="text-sm font-bold tracking-tight text-zinc-700 dark:text-zinc-200">
                {overdue.length + dueSoon.length + recurring.length} signals today
              </p>
            </div>
          </div>
        </div>

        {overdue.length ? (
          <section>
            <SectionHeader title={`Overdue (${overdue.length})`} />
            <div className="space-y-2">
              {overdue.map((reminder) => (
                <ReminderRow key={reminder.id} reminder={reminder} currency={preferences.currency} />
              ))}
            </div>
          </section>
        ) : null}

        <section>
          <SectionHeader title={`Due in next 30 days (${dueSoon.length})`} />
          {dueSoon.length ? (
            <div className="space-y-2">
              {dueSoon.map((reminder) => (
                <ReminderRow key={reminder.id} reminder={reminder} currency={preferences.currency} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="Nothing due in the next 30 days"
              body="Loans, items, and subscriptions with due dates land here as they get close."
              icon={<CalendarClock size={22} />}
            />
          )}
        </section>

        <section>
          <SectionHeader title={`Might happen again (${recurring.length})`} />
          {recurring.length ? (
            <div className="space-y-2">
              <p className="px-1 text-xs text-zinc-500">
                Suggested from expenses you've logged at a similar interval recently — tap "Log" to add this expense.
              </p>
              {recurring.map((entry) => {
                const style = getExpenseCategoryStyle(entry.category as ExpenseCategory);
                const Icon = style.icon;
                return (
                  <Card key={entry.id} className="p-3">
                    <div className="flex items-start gap-3">
                      <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${style.bg} ${style.fg}`}>
                        <Icon size={20} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-1.5 truncate text-sm font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
                          <Sparkles size={14} className="shrink-0 text-indigo-500" />
                          {entry.note || entry.category}
                        </p>
                        <p className="mt-0.5 text-xs text-zinc-500">
                          {entry.category} · {entry.paymentMethod} · last {formatFullDate(entry.lastDate)}
                        </p>
                        <p className="mt-0.5 text-[0.7rem] font-semibold text-indigo-600 dark:text-indigo-300">
                          Expected {daysCopy(entry.daysUntil)} ({formatFullDate(entry.predictedDate)})
                        </p>
                        <p className="mt-0.5 text-[0.65rem] text-zinc-500">{entry.reason}</p>
                      </div>
                      <div className="text-right">
                        <Badge
                          tone={entry.confidence === 'high' ? 'good' : entry.confidence === 'medium' ? 'info' : 'neutral'}
                          className="mb-1"
                        >
                          {entry.confidence}
                        </Badge>
                        <p className="text-[0.65rem] font-semibold text-zinc-400">Avg</p>
                        <p className="font-black tabular-nums text-zinc-700 dark:text-zinc-200">
                          {formatMoney(entry.averageAmount, preferences.currency)}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button
                        variant="danger"
                        className="min-h-9 flex-1 px-2"
                        icon={<Plus size={16} />}
                        onClick={() => openAddFlow('expense')}
                      >
                        Log expense
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            <EmptyState
              title="No recurring patterns yet"
              body="Once you log a recurring expense a few times, we'll predict it here so it never slips through."
              icon={<Sparkles size={22} />}
            />
          )}
        </section>
      </div>
    </PullToRefresh>
  );
}

function ReminderRow({ reminder, currency }: { reminder: UpcomingReminder; currency: CurrencyCode }) {
  const navigate = useNavigate();
  const tone = reminder.urgency === 'overdue'
    ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-200'
    : reminder.urgency === 'today' || reminder.urgency === 'soon'
      ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-200'
      : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-200';
  const Icon = reminder.type === 'loan' ? HandCoins : reminder.type === 'item' ? PackageOpen : Repeat;
  const dest = reminder.type === 'subscription' ? '/obligations' : '/obligations';
  return (
    <button type="button" className="w-full text-left" onClick={() => navigate(dest, { state: { mode: reminder.type === 'loan' ? 'loans' : reminder.type === 'item' ? 'items' : 'subscriptions' } })}>
      <Card className="p-3 active:bg-zinc-50 dark:active:bg-zinc-800">
        <div className="flex items-start gap-3">
          <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${tone}`}>
            {reminder.urgency === 'overdue' ? <AlertTriangle size={20} /> : <Icon size={20} />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold tracking-tight text-zinc-950 dark:text-zinc-50">{reminder.title}</p>
            {reminder.detail ? <p className="mt-0.5 truncate text-xs text-zinc-500">{reminder.detail}</p> : null}
            <p className="mt-0.5 text-[0.7rem] font-semibold text-zinc-500">
              {formatFullDate(reminder.dueDate)} · {daysCopy(reminder.daysUntil)}
            </p>
          </div>
          <div className="text-right">
            <Badge tone={urgencyBadge[reminder.urgency]}>{urgencyLabel[reminder.urgency]}</Badge>
            {reminder.amount != null ? (
              <p className="mt-1 font-black tabular-nums text-zinc-700 dark:text-zinc-200">
                {formatMoney(reminder.amount, currency)}
              </p>
            ) : null}
          </div>
        </div>
      </Card>
    </button>
  );
}
