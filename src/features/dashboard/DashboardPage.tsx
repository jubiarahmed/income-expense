import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { endOfMonth, format, parseISO, startOfMonth, subMonths } from 'date-fns';
import { AlertTriangle, ArrowDownRight, ArrowUpRight, BarChart3, CalendarClock, ChevronRight, Flag, Plus, Sparkles, Target, Wallet } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Card, SectionHeader } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { Field, SelectInput } from '../../components/ui/Form';
import { PullToRefresh } from '../../components/ui/PullToRefresh';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import {
  getExpenseTotals,
  getIncomeTotals,
  getObligationStats,
  getUpcomingObligations,
} from '../../lib/calculations';
import { getSmartInsights, getTotalLiquidBalance, getWalletBalances } from '../../lib/moneyAnalytics';
import { formatRelativeDateTime, formatShortDate, getMonthRange } from '../../lib/date';
import { formatMoney, roundMoney } from '../../lib/money';
import { useFinanceStore } from '../../state/useFinanceStore';
import { useUiStore } from '../../state/useUiStore';
import { getExpenseCategoryStyle } from '../../domain/categoryIcons';
import type { ExpenseCategory } from '../../domain/models';

const pieColors = ['#4f46e5', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#8b5cf6', '#f43f5e', '#84cc16'];

type ObligationMode = 'loans' | 'items' | 'subscriptions';
type Period = 'thisMonth' | 'lastMonth' | 'allTime';

const periodLabel: Record<Period, string> = {
  thisMonth: 'This month',
  lastMonth: 'Last month',
  allTime: 'All time',
};

function getPeriodRange(period: Period, allTimeMonth?: string): { start?: string; end?: string } {
  const now = new Date();
  if (period === 'thisMonth') return getMonthRange(now);
  if (period === 'lastMonth') return getMonthRange(subMonths(now, 1));
  if (allTimeMonth) {
    const monthDate = parseISO(`${allTimeMonth}-01`);
    return {
      start: format(startOfMonth(monthDate), 'yyyy-MM-dd'),
      end: format(endOfMonth(monthDate), 'yyyy-MM-dd'),
    };
  }
  return {};
}

function inRange<T extends { date: string }>(items: T[], range: { start?: string; end?: string }) {
  if (!range.start && !range.end) return items;
  return items.filter((item) => (!range.start || item.date >= range.start) && (!range.end || item.date <= range.end));
}

function getLast6MonthSeries(
  expenses: { amount: number; date: string }[],
  incomes: { amount: number; date: string }[],
) {
  const now = new Date();
  const buckets = [];
  for (let offset = 5; offset >= 0; offset -= 1) {
    const month = subMonths(now, offset);
    buckets.push({
      key: format(startOfMonth(month), 'yyyy-MM'),
      label: format(month, 'MMM'),
      expense: 0,
      income: 0,
    });
  }
  for (const expense of expenses) {
    const bucket = buckets.find((entry) => entry.key === expense.date.slice(0, 7));
    if (bucket) bucket.expense += expense.amount;
  }
  for (const income of incomes) {
    const bucket = buckets.find((entry) => entry.key === income.date.slice(0, 7));
    if (bucket) bucket.income += income.amount;
  }
  return buckets.map((bucket) => ({
    ...bucket,
    expense: roundMoney(bucket.expense),
    income: roundMoney(bucket.income),
  }));
}

function categoryBreakdown(expenses: { amount: number; category: string; date: string }[], range: { start?: string; end?: string }) {
  const totals = new Map<string, number>();
  inRange(expenses, range).forEach((expense) =>
    totals.set(expense.category, (totals.get(expense.category) ?? 0) + expense.amount),
  );
  return [...totals.entries()]
    .map(([name, value]) => ({ name, value: roundMoney(value) }))
    .sort((a, b) => b.value - a.value);
}

export function DashboardPage() {
  const {
    preferences,
    contacts,
    expenses,
    incomes,
    transfers,
    loans,
    loanPayments,
    sharedExpenses,
    items,
    subscriptions,
    activities,
    budgets,
    wallets,
    goals,
  } = useFinanceStore();
  const reload = useFinanceStore((state) => state.reload);
  const openAddFlow = useUiStore((state) => state.openAddFlow);
  const navigate = useNavigate();
  const [period, setPeriod] = useState<Period>('thisMonth');
  const [allTimeMonth, setAllTimeMonth] = useState<string>(''); // '' = show all
  const stats = getObligationStats(contacts, loans, loanPayments, sharedExpenses, items, subscriptions);

  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    for (const expense of expenses) if (expense.date) set.add(expense.date.slice(0, 7));
    for (const income of incomes) if (income.date) set.add(income.date.slice(0, 7));
    return [...set].sort().reverse();
  }, [expenses, incomes]);

  const effectiveMonth = period === 'allTime' && allTimeMonth ? allTimeMonth : undefined;
  const range = useMemo(() => getPeriodRange(period, effectiveMonth), [period, effectiveMonth]);
  const periodExpenses = useMemo(() => inRange(expenses, range), [expenses, range]);
  const periodIncomes = useMemo(() => inRange(incomes, range), [incomes, range]);
  const totals = getExpenseTotals(expenses);
  const incomeTotals = getIncomeTotals(incomes);
  const periodExpenseTotal = useMemo(
    () => roundMoney(periodExpenses.reduce((sum, expense) => sum + expense.amount, 0)),
    [periodExpenses],
  );
  const periodIncomeTotal = useMemo(
    () => roundMoney(periodIncomes.reduce((sum, income) => sum + income.amount, 0)),
    [periodIncomes],
  );
  const periodNet = roundMoney(periodIncomeTotal - periodExpenseTotal);
  const categories = useMemo(() => categoryBreakdown(expenses, range), [expenses, range]);
  const monthlySeries = useMemo(() => getLast6MonthSeries(expenses, incomes), [expenses, incomes]);
  const upcoming = getUpcomingObligations(loans, loanPayments, items, subscriptions).slice(0, 6);
  const todayNet = roundMoney(incomeTotals.today - totals.today);
  const walletBalances = useMemo(
    () => getWalletBalances(wallets, expenses, incomes, transfers),
    [wallets, expenses, incomes, transfers],
  );
  const liquidBalance = getTotalLiquidBalance(walletBalances);
  const insights = useMemo(
    () => getSmartInsights(expenses, incomes, budgets, walletBalances),
    [expenses, incomes, budgets, walletBalances],
  );
  const activeGoals = goals.filter((goal) => goal.status === 'active').length;
  const activeBudgets = budgets.length;

  function goToObligations(mode: ObligationMode) {
    navigate('/obligations', { state: { mode } });
  }

  return (
    <PullToRefresh onRefresh={reload}>
      <div className="space-y-5">
        <SegmentedControl
          value={period}
          onChange={(next) => {
            setPeriod(next);
            if (next !== 'allTime') setAllTimeMonth('');
          }}
          options={[
            { label: 'This month', value: 'thisMonth' },
            { label: 'Last month', value: 'lastMonth' },
            { label: 'All time', value: 'allTime' },
          ]}
        />

        {period === 'allTime' && availableMonths.length ? (
          <Field label="Filter by month">
            <SelectInput value={allTimeMonth} onChange={(event) => setAllTimeMonth(event.target.value)}>
              <option value="">All months</option>
              {availableMonths.map((monthKey) => (
                <option key={monthKey} value={monthKey}>
                  {format(parseISO(`${monthKey}-01`), 'MMMM yyyy')}
                </option>
              ))}
            </SelectInput>
          </Field>
        ) : null}

        <BalanceHero
          currency={preferences.currency}
          income={periodIncomeTotal}
          expense={periodExpenseTotal}
          net={periodNet}
          periodLabel={
            period === 'allTime' && allTimeMonth
              ? format(parseISO(`${allTimeMonth}-01`), 'MMMM yyyy')
              : periodLabel[period]
          }
          liquidBalance={liquidBalance}
        />

        <section className="grid grid-cols-4 gap-2">
          <LaunchpadTile label="Wallets" tone="emerald" icon={<Wallet size={20} />} onClick={() => navigate('/wallets')} subtitle={formatMoney(liquidBalance, preferences.currency)} />
          <LaunchpadTile label="Budgets" tone="indigo" icon={<Target size={20} />} onClick={() => navigate('/budgets')} subtitle={`${activeBudgets} set`} />
          <LaunchpadTile label="Goals" tone="pink" icon={<Flag size={20} />} onClick={() => navigate('/goals')} subtitle={`${activeGoals} active`} />
          <LaunchpadTile label="Reports" tone="violet" icon={<BarChart3 size={20} />} onClick={() => navigate('/reports')} subtitle="Analyze" />
        </section>

        {insights.length ? (
          <section>
            <SectionHeader title="Smart insights" />
            <div className="space-y-2">
              {insights.slice(0, 3).map((insight) => {
                const tone =
                  insight.tone === 'warning'
                    ? 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-200'
                    : insight.tone === 'positive'
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200'
                      : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-200';
                return (
                  <Card key={insight.id} className="p-3">
                    <div className="flex items-start gap-3">
                      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${tone}`}>
                        <Sparkles size={16} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold tracking-tight text-zinc-950 dark:text-zinc-50">{insight.title}</p>
                        <p className="mt-0.5 text-xs text-zinc-500">{insight.detail}</p>
                      </div>
                    </div>
                  </Card>
                );
              })}
              {insights.length > 3 ? (
                <button
                  type="button"
                  onClick={() => navigate('/reports')}
                  className="w-full rounded-xl bg-zinc-100 px-3 py-2 text-xs font-bold text-zinc-700 active:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200"
                >
                  See {insights.length - 3} more insights in Reports →
                </button>
              ) : null}
            </div>
          </section>
        ) : null}

        <section className="grid grid-cols-2 gap-3">
          <SummaryCard
            label="Income today"
            value={formatMoney(incomeTotals.today, preferences.currency)}
            tone="emerald"
            icon={<ArrowUpRight size={18} />}
          />
          <SummaryCard
            label="Spent today"
            value={formatMoney(totals.today, preferences.currency)}
            tone="rose"
            icon={<ArrowDownRight size={18} />}
          />
          <SummaryCard
            label="People owe me"
            value={formatMoney(stats.peopleOweMe, preferences.currency)}
            tone="indigo"
            icon={<ChevronRight size={18} />}
            onClick={() => navigate('/people')}
          />
          <SummaryCard
            label="I owe others"
            value={formatMoney(stats.iOweOthers, preferences.currency)}
            tone="amber"
            icon={<AlertTriangle size={18} />}
            onClick={() => navigate('/people')}
          />
        </section>

        <div className="grid grid-cols-3 gap-2">
          <QuickAction tone="rose" label="Expense" onClick={() => openAddFlow('expense')} />
          <QuickAction tone="emerald" label="Income" onClick={() => openAddFlow('income')} />
          <QuickAction tone="sky" label="Transfer" onClick={() => openAddFlow('transfer')} />
        </div>

        <Card className="gradient-balance text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-white/70">Subscriptions</p>
              <p className="mt-1 text-2xl font-black tracking-tight">{formatMoney(stats.subscriptionMonthlyTotal, preferences.currency)}</p>
              <p className="mt-1 text-xs text-white/60">
                {stats.activeSubscriptions} active · {formatMoney(stats.subscriptionYearlyEstimate, preferences.currency)}/yr
              </p>
            </div>
            <Badge tone={stats.overdueItems ? 'danger' : 'good'}>{stats.overdueItems} overdue</Badge>
          </div>
        </Card>

        <section>
          <SectionHeader
            title={`Spending by category — ${
              period === 'allTime' && allTimeMonth
                ? format(parseISO(`${allTimeMonth}-01`), 'MMMM yyyy')
                : periodLabel[period]
            }`}
          />
          {categories.length ? (
            <Card className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categories} dataKey="value" nameKey="name" innerRadius={50} outerRadius={86} paddingAngle={3}>
                    {categories.map((entry, index) => (
                      <Cell key={entry.name} fill={pieColors[index % pieColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatMoney(Number(value), preferences.currency)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-[-8px] grid grid-cols-2 gap-2">
                {categories.slice(0, 4).map((item) => {
                  const style = getExpenseCategoryStyle(item.name as ExpenseCategory);
                  const Icon = style.icon;
                  return (
                    <div key={item.name} className="flex items-center gap-2 text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                      <span className={`grid h-6 w-6 place-items-center rounded-full ${style.bg} ${style.fg}`}>
                        <Icon size={12} />
                      </span>
                      <span className="truncate">{item.name}</span>
                    </div>
                  );
                })}
              </div>
            </Card>
          ) : (
            <EmptyState title="No spending in this period" body="Add an expense to see category totals." />
          )}
        </section>

        <section>
          <SectionHeader title="Income vs Expense — 6 months" />
          <Card className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlySeries} margin={{ top: 8, right: 4, left: -28, bottom: 0 }}>
                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} />
                <YAxis tickLine={false} axisLine={false} fontSize={11} />
                <Tooltip formatter={(value) => formatMoney(Number(value), preferences.currency)} />
                <Bar dataKey="income" fill="#10b981" radius={[6, 6, 0, 0]} />
                <Bar dataKey="expense" fill="#f43f5e" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-2 flex justify-center gap-4 text-[0.7rem] font-semibold">
              <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Income
              </span>
              <span className="flex items-center gap-1.5 text-rose-700 dark:text-rose-300">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> Expense
              </span>
            </div>
          </Card>
        </section>

        <section>
          <SectionHeader title="Upcoming" />
          <div className="space-y-2">
            {upcoming.length ? (
              upcoming.map((item) => (
                <button
                  key={`${item.type}-${item.id}`}
                  type="button"
                  className="w-full text-left"
                  onClick={() => goToObligations(item.type === 'loan' ? 'loans' : item.type === 'item' ? 'items' : 'subscriptions')}
                >
                  <Card className="flex items-center justify-between gap-3 p-3 active:bg-zinc-50 dark:active:bg-zinc-800">
                    <div className="flex items-center gap-3">
                      <span className="grid h-10 w-10 place-items-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-200">
                        <CalendarClock size={18} />
                      </span>
                      <div>
                        <p className="font-bold text-zinc-900 dark:text-zinc-50">{item.title}</p>
                        <p className="text-xs text-zinc-500">{formatShortDate(item.dueDate)}</p>
                      </div>
                    </div>
                    <Badge tone={item.overdue ? 'danger' : 'warn'}>{item.overdue ? 'Overdue' : 'Due soon'}</Badge>
                  </Card>
                </button>
              ))
            ) : (
              <EmptyState title="No due items" body="Upcoming reminders will appear here when dates get close." />
            )}
          </div>
        </section>

        <section>
          <SectionHeader title="Recent activity" />
          <div className="space-y-2">
            {activities.slice(0, 6).map((activity) => (
              <Card key={activity.id} className="p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-zinc-900 dark:text-zinc-50">{activity.title}</p>
                    {activity.detail ? <p className="text-sm text-zinc-500">{activity.detail}</p> : null}
                  </div>
                  <p className="shrink-0 text-[0.7rem] font-semibold text-zinc-400">{formatRelativeDateTime(activity.createdAt)}</p>
                </div>
              </Card>
            ))}
          </div>
        </section>

        <p className="pt-2 text-center text-[0.7rem] font-semibold text-zinc-400">
          Today net · {formatMoney(todayNet, preferences.currency)}
        </p>
      </div>
    </PullToRefresh>
  );
}

function BalanceHero({
  currency,
  income,
  expense,
  net,
  periodLabel,
  liquidBalance,
}: {
  currency: string;
  income: number;
  expense: number;
  net: number;
  periodLabel: string;
  liquidBalance?: number;
}) {
  return (
    <Card className="gradient-balance text-white">
      <div className="flex items-baseline justify-between">
        <p className="text-xs font-bold uppercase tracking-wider text-white/70">{periodLabel} · Net</p>
        {liquidBalance != null ? (
          <p className="text-[0.7rem] font-semibold text-white/70">
            Wallets <span className="font-black tabular-nums text-white">{formatMoney(liquidBalance, currency as 'BDT')}</span>
          </p>
        ) : null}
      </div>
      <p className="mt-1 text-4xl font-black tracking-tight tabular-nums">{formatMoney(net, currency as 'BDT')}</p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2 rounded-xl bg-white/10 p-3 backdrop-blur">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-emerald-500/20 text-emerald-300">
            <ArrowUpRight size={18} />
          </span>
          <div>
            <p className="text-[0.65rem] font-bold uppercase tracking-wide text-white/70">Income</p>
            <p className="text-base font-black tabular-nums">{formatMoney(income, currency as 'BDT')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-white/10 p-3 backdrop-blur">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-rose-500/20 text-rose-300">
            <ArrowDownRight size={18} />
          </span>
          <div>
            <p className="text-[0.65rem] font-bold uppercase tracking-wide text-white/70">Expense</p>
            <p className="text-base font-black tabular-nums">{formatMoney(expense, currency as 'BDT')}</p>
          </div>
        </div>
      </div>
    </Card>
  );
}

function SummaryCard({
  label,
  value,
  icon,
  tone,
  onClick,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone: 'emerald' | 'rose' | 'indigo' | 'amber';
  onClick?: () => void;
}) {
  const toneClass = {
    emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200',
    rose: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-200',
    indigo: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-200',
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-200',
  }[tone];
  const inner = (
    <>
      <div className={`mb-3 grid h-9 w-9 place-items-center rounded-full ${toneClass}`}>{icon}</div>
      <p className="text-[0.7rem] font-bold uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-1 text-lg font-black tabular-nums tracking-tight text-zinc-950 dark:text-zinc-50">{value}</p>
      {onClick ? <p className="mt-1 text-xs font-semibold text-zinc-400">Tap to view →</p> : null}
    </>
  );
  if (onClick) {
    return (
      <button type="button" className="w-full text-left" onClick={onClick}>
        <Card className="p-3 active:bg-zinc-50 dark:active:bg-zinc-800">{inner}</Card>
      </button>
    );
  }
  return <Card className="p-3">{inner}</Card>;
}

function LaunchpadTile({
  label,
  subtitle,
  icon,
  tone,
  onClick,
}: {
  label: string;
  subtitle?: string;
  icon: React.ReactNode;
  tone: 'emerald' | 'indigo' | 'pink' | 'violet';
  onClick: () => void;
}) {
  const toneClass = {
    emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200',
    indigo: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-200',
    pink: 'bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-200',
    violet: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-200',
  }[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-20 flex-col items-center justify-center gap-1.5 rounded-2xl border border-zinc-200 bg-white p-2 text-center transition active:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:active:bg-zinc-800"
    >
      <span className={`grid h-9 w-9 place-items-center rounded-xl ${toneClass}`}>{icon}</span>
      <span className="text-[0.7rem] font-bold tracking-tight text-zinc-700 dark:text-zinc-200">{label}</span>
      {subtitle ? <span className="line-clamp-1 text-[0.6rem] text-zinc-500">{subtitle}</span> : null}
    </button>
  );
}

function QuickAction({ tone, label, onClick }: { tone: 'rose' | 'emerald' | 'sky'; label: string; onClick: () => void }) {
  const toneClass = {
    rose: 'bg-rose-100 text-rose-700 ring-rose-200 dark:bg-rose-950 dark:text-rose-200 dark:ring-rose-900',
    emerald: 'bg-emerald-100 text-emerald-700 ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-200 dark:ring-emerald-900',
    sky: 'bg-sky-100 text-sky-700 ring-sky-200 dark:bg-sky-950 dark:text-sky-200 dark:ring-sky-900',
  }[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-12 items-center justify-center gap-1.5 rounded-xl text-sm font-bold ring-1 active:scale-[0.98] ${toneClass}`}
    >
      <Plus size={16} strokeWidth={2.6} /> {label}
    </button>
  );
}
