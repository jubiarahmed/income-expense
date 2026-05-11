import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowDownRight, ArrowLeft, ArrowUpRight, BarChart3, Calendar, ChevronRight, Percent, Sparkles, TrendingDown, TrendingUp } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, SectionHeader } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { PullToRefresh } from '../../components/ui/PullToRefresh';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { formatFullDate } from '../../lib/date';
import { formatMoney, roundMoney } from '../../lib/money';
import {
  getAverageDailySpend,
  getMonthlyTrend,
  getMonthOverMonthChange,
  getPaymentMethodUsage,
  getSmartInsights,
  getTopMerchants,
  getTopSpendingDays,
  getWalletBalances,
} from '../../lib/moneyAnalytics';
import { useFinanceStore } from '../../state/useFinanceStore';
import { clsx } from 'clsx';

const pieColors = ['#4f46e5', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#8b5cf6', '#f43f5e', '#84cc16'];

type TrendRange = '3m' | '6m' | '12m';

export function ReportsPage() {
  const navigate = useNavigate();
  const reload = useFinanceStore((state) => state.reload);
  const { preferences, expenses, incomes, transfers, wallets, budgets } = useFinanceStore();
  const [range, setRange] = useState<TrendRange>('6m');

  const months = range === '3m' ? 3 : range === '6m' ? 6 : 12;
  const trend = useMemo(() => getMonthlyTrend(expenses, incomes, months), [expenses, incomes, months]);
  const mom = useMemo(() => getMonthOverMonthChange(expenses, incomes), [expenses, incomes]);
  const dailyAvg = useMemo(() => getAverageDailySpend(expenses), [expenses]);
  const topMerchants = useMemo(() => getTopMerchants(expenses, new Date(), 5), [expenses]);
  const topDays = useMemo(() => getTopSpendingDays(expenses, new Date(), 5), [expenses]);
  const paymentUsage = useMemo(() => getPaymentMethodUsage(expenses), [expenses]);
  const walletBalances = useMemo(() => getWalletBalances(wallets, expenses, incomes, transfers), [wallets, expenses, incomes, transfers]);
  const insights = useMemo(() => getSmartInsights(expenses, incomes, budgets, walletBalances), [expenses, incomes, budgets, walletBalances]);

  const trendIncomeTotal = trend.reduce((sum, b) => sum + b.income, 0);
  const trendExpenseTotal = trend.reduce((sum, b) => sum + b.expense, 0);
  const savingsRate =
    trendIncomeTotal > 0 ? Math.round(((trendIncomeTotal - trendExpenseTotal) / trendIncomeTotal) * 100) : 0;

  const hasAnyData = expenses.length + incomes.length > 0;

  return (
    <PullToRefresh onRefresh={reload}>
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <Button variant="secondary" icon={<ArrowLeft size={16} />} onClick={() => navigate(-1)}>
            Back
          </Button>
          <div className="flex flex-1 items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-violet-100 text-violet-600 dark:bg-violet-950 dark:text-violet-300">
              <BarChart3 size={18} />
            </span>
            <div>
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-violet-600 dark:text-violet-400">Reports</p>
              <p className="text-sm font-bold tracking-tight text-zinc-700 dark:text-zinc-200">Personal analytics</p>
            </div>
          </div>
        </div>

        {!hasAnyData ? (
          <EmptyState
            title="No data yet"
            body="Log a few expenses, incomes, or transfers, then come back to see trends, savings rate, top merchants, and month-over-month comparisons."
            icon={<BarChart3 size={22} />}
          />
        ) : (
          <>
            {/* Headline metrics */}
            <section className="grid grid-cols-2 gap-3">
              <MetricCard
                label="This month income"
                value={formatMoney(mom.income.current, preferences.currency)}
                deltaPct={mom.income.pct}
                deltaPositiveIsGood
                icon={<ArrowUpRight size={16} />}
                tone="emerald"
              />
              <MetricCard
                label="This month expense"
                value={formatMoney(mom.expense.current, preferences.currency)}
                deltaPct={mom.expense.pct}
                deltaPositiveIsGood={false}
                icon={<ArrowDownRight size={16} />}
                tone="rose"
              />
              <MetricCard
                label="Daily avg"
                value={formatMoney(dailyAvg, preferences.currency)}
                icon={<Calendar size={16} />}
                tone="indigo"
              />
              <MetricCard
                label={`Savings rate ${range}`}
                value={`${savingsRate}%`}
                icon={<Percent size={16} />}
                tone={savingsRate >= 20 ? 'emerald' : savingsRate < 0 ? 'rose' : 'amber'}
              />
            </section>

            {/* Smart insights */}
            {insights.length ? (
              <section className="space-y-2">
                <SectionHeader title="Smart insights" />
                <div className="space-y-2">
                  {insights.slice(0, 6).map((insight) => {
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
                </div>
              </section>
            ) : null}

            {/* Income vs Expense chart */}
            <section>
              <SectionHeader
                title="Income vs Expense"
                action={
                  <SegmentedControl
                    value={range}
                    onChange={setRange}
                    options={[
                      { label: '3m', value: '3m' },
                      { label: '6m', value: '6m' },
                      { label: '12m', value: '12m' },
                    ]}
                  />
                }
              />
              <Card className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trend} margin={{ top: 8, right: 4, left: -24, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} />
                    <YAxis tickLine={false} axisLine={false} fontSize={11} />
                    <Tooltip formatter={(value) => formatMoney(Number(value), preferences.currency)} />
                    <Bar dataKey="income" fill="#10b981" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="expense" fill="#f43f5e" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </section>

            {/* Top merchants */}
            <section>
              <SectionHeader title="Top notes / merchants — this month" />
              {topMerchants.length ? (
                <div className="space-y-2">
                  {topMerchants.map((merchant) => (
                    <Card key={merchant.merchant} className="p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-bold tracking-tight text-zinc-950 dark:text-zinc-50 capitalize">
                            {merchant.merchant}
                          </p>
                          <p className="text-xs text-zinc-500">
                            {merchant.count} entr{merchant.count === 1 ? 'y' : 'ies'} · {merchant.category}
                          </p>
                        </div>
                        <p className="font-black tabular-nums">{formatMoney(merchant.total, preferences.currency)}</p>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-zinc-500">No expenses this month yet.</p>
              )}
            </section>

            {/* Top spending days */}
            <section>
              <SectionHeader title="Highest spending days" />
              {topDays.length ? (
                <div className="space-y-2">
                  {topDays.map((day) => (
                    <Card key={day.date} className="p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-bold tracking-tight text-zinc-950 dark:text-zinc-50">{formatFullDate(day.date)}</p>
                        <p className="font-black tabular-nums text-rose-600 dark:text-rose-400">−{formatMoney(day.total, preferences.currency)}</p>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-zinc-500">No expenses this month yet.</p>
              )}
            </section>

            {/* Payment method usage */}
            <section>
              <SectionHeader title="Payment method usage — this month" />
              {paymentUsage.length ? (
                <Card className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={paymentUsage}
                        dataKey="total"
                        nameKey="method"
                        innerRadius={50}
                        outerRadius={86}
                        paddingAngle={3}
                      >
                        {paymentUsage.map((entry, index) => (
                          <Cell key={entry.method} fill={pieColors[index % pieColors.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatMoney(Number(value), preferences.currency)} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-[-4px] grid grid-cols-2 gap-1 text-xs">
                    {paymentUsage.map((entry, index) => (
                      <div key={entry.method} className="flex items-center justify-between gap-2 px-1">
                        <span className="flex items-center gap-1.5 truncate">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: pieColors[index % pieColors.length] }} />
                          <span className="truncate font-semibold text-zinc-700 dark:text-zinc-200">{entry.method}</span>
                        </span>
                        <span className="font-bold tabular-nums">{formatMoney(entry.total, preferences.currency)}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              ) : (
                <p className="text-sm text-zinc-500">No expenses this month yet.</p>
              )}
            </section>

            {/* MoM net */}
            <Card>
              <SectionHeader title="Month-over-month net" />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">This month</p>
                  <p
                    className={clsx(
                      'mt-1 text-2xl font-black tabular-nums',
                      mom.net.current >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400',
                    )}
                  >
                    {formatMoney(mom.net.current, preferences.currency)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">Last month</p>
                  <p
                    className={clsx(
                      'mt-1 text-2xl font-black tabular-nums',
                      mom.net.previous >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400',
                    )}
                  >
                    {formatMoney(mom.net.previous, preferences.currency)}
                  </p>
                </div>
              </div>
              <p className="mt-3 text-xs text-zinc-500">
                Net = income − expense. Positive = saving, negative = withdrawing from savings.
              </p>
            </Card>
          </>
        )}
      </div>
    </PullToRefresh>
  );
}

function MetricCard({
  label,
  value,
  deltaPct,
  deltaPositiveIsGood,
  icon,
  tone,
}: {
  label: string;
  value: string;
  deltaPct?: number;
  deltaPositiveIsGood?: boolean;
  icon: React.ReactNode;
  tone: 'emerald' | 'rose' | 'indigo' | 'amber';
}) {
  const toneClass = {
    emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200',
    rose: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-200',
    indigo: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-200',
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-200',
  }[tone];
  const positive = deltaPct != null && deltaPct >= 0;
  const goodDirection = deltaPositiveIsGood ? positive : !positive;
  return (
    <Card className="p-3">
      <div className="flex items-center justify-between">
        <span className={`grid h-8 w-8 place-items-center rounded-full ${toneClass}`}>{icon}</span>
        {deltaPct != null && Number.isFinite(deltaPct) ? (
          <Badge tone={goodDirection ? 'good' : 'danger'}>
            <span className="inline-flex items-center gap-0.5">
              {positive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
              {Math.abs(deltaPct)}%
            </span>
          </Badge>
        ) : null}
      </div>
      <p className="mt-3 text-[0.7rem] font-bold uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-0.5 text-lg font-black tabular-nums tracking-tight text-zinc-950 dark:text-zinc-50">{value}</p>
    </Card>
  );
}

void ChevronRight;
void roundMoney;
