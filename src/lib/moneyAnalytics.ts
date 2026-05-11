import { differenceInCalendarDays, endOfMonth, format, parseISO, startOfMonth, subMonths } from 'date-fns';
import { PAYMENT_METHODS } from '../domain/constants';
import type {
  Budget,
  Expense,
  Goal,
  Income,
  PaymentMethod,
  Transfer,
  Wallet,
} from '../domain/models';
import { roundMoney } from './money';

export interface WalletBalance {
  method: PaymentMethod;
  name: string;
  openingBalance: number;
  income: number;
  expense: number;
  transfersIn: number;
  transfersOut: number;
  fees: number;
  balance: number;
  walletId?: string;
}

export function getWalletBalances(
  wallets: Wallet[],
  expenses: Expense[],
  incomes: Income[],
  transfers: Transfer[],
): WalletBalance[] {
  const byMethod = new Map<PaymentMethod, WalletBalance>();
  for (const method of PAYMENT_METHODS) {
    const wallet = wallets.find((w) => w.method === method);
    byMethod.set(method, {
      method,
      name: wallet?.name ?? method,
      openingBalance: wallet?.openingBalance ?? 0,
      income: 0,
      expense: 0,
      transfersIn: 0,
      transfersOut: 0,
      fees: 0,
      balance: wallet?.openingBalance ?? 0,
      walletId: wallet?.id,
    });
  }
  for (const expense of expenses) {
    const entry = byMethod.get(expense.paymentMethod);
    if (entry) entry.expense += expense.amount;
  }
  for (const income of incomes) {
    const entry = byMethod.get(income.paymentMethod);
    if (entry) entry.income += income.amount;
  }
  for (const transfer of transfers) {
    const from = byMethod.get(transfer.fromMethod);
    const to = byMethod.get(transfer.toMethod);
    if (from) {
      from.transfersOut += transfer.amount;
      from.fees += transfer.fee || 0;
    }
    if (to) to.transfersIn += transfer.amount;
  }
  for (const entry of byMethod.values()) {
    entry.balance = roundMoney(
      entry.openingBalance + entry.income - entry.expense + entry.transfersIn - entry.transfersOut - entry.fees,
    );
    entry.income = roundMoney(entry.income);
    entry.expense = roundMoney(entry.expense);
    entry.transfersIn = roundMoney(entry.transfersIn);
    entry.transfersOut = roundMoney(entry.transfersOut);
    entry.fees = roundMoney(entry.fees);
  }
  return [...byMethod.values()];
}

export function getTotalLiquidBalance(balances: WalletBalance[]): number {
  return roundMoney(balances.reduce((sum, entry) => sum + entry.balance, 0));
}

export interface BudgetUsage {
  budget: Budget;
  spent: number;
  remaining: number;
  pctUsed: number;
  status: 'on-track' | 'warning' | 'over';
}

export function getBudgetUsage(budgets: Budget[], expenses: Expense[], reference = new Date()): BudgetUsage[] {
  const monthStart = format(startOfMonth(reference), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(reference), 'yyyy-MM-dd');
  return budgets.map((budget) => {
    const spent = roundMoney(
      expenses
        .filter((expense) => expense.category === budget.category && expense.date >= monthStart && expense.date <= monthEnd)
        .reduce((sum, expense) => sum + expense.amount, 0),
    );
    const remaining = roundMoney(budget.monthlyLimit - spent);
    const pctUsed = budget.monthlyLimit > 0 ? Math.round((spent / budget.monthlyLimit) * 100) : 0;
    const status: BudgetUsage['status'] =
      pctUsed >= 100 ? 'over' : pctUsed >= budget.notifyAt ? 'warning' : 'on-track';
    return { budget, spent, remaining, pctUsed, status };
  });
}

export interface GoalProgress {
  goal: Goal;
  pctSaved: number;
  remaining: number;
  daysUntilDeadline?: number;
  dailyTargetRemaining?: number;
}

export function getGoalProgress(goals: Goal[]): GoalProgress[] {
  return goals.map((goal) => {
    const pctSaved = goal.targetAmount > 0 ? Math.round((goal.savedAmount / goal.targetAmount) * 100) : 0;
    const remaining = roundMoney(Math.max(0, goal.targetAmount - goal.savedAmount));
    let daysUntilDeadline: number | undefined;
    let dailyTargetRemaining: number | undefined;
    if (goal.deadline) {
      daysUntilDeadline = differenceInCalendarDays(parseISO(goal.deadline), new Date());
      if (daysUntilDeadline > 0 && remaining > 0) {
        dailyTargetRemaining = roundMoney(remaining / daysUntilDeadline);
      }
    }
    return { goal, pctSaved, remaining, daysUntilDeadline, dailyTargetRemaining };
  });
}

export type InsightTone = 'positive' | 'warning' | 'info';

export interface SmartInsight {
  id: string;
  tone: InsightTone;
  title: string;
  detail: string;
  amount?: number;
}

const HOUR_MS = 1000 * 60 * 60 * 24;

export function getSmartInsights(
  expenses: Expense[],
  incomes: Income[],
  budgets: Budget[],
  walletBalances: WalletBalance[],
): SmartInsight[] {
  const insights: SmartInsight[] = [];
  const now = new Date();
  const thisMonthStart = format(startOfMonth(now), 'yyyy-MM-dd');
  const thisMonthEnd = format(endOfMonth(now), 'yyyy-MM-dd');
  const lastMonth = subMonths(now, 1);
  const lastMonthStart = format(startOfMonth(lastMonth), 'yyyy-MM-dd');
  const lastMonthEnd = format(endOfMonth(lastMonth), 'yyyy-MM-dd');

  const thisMonthExpenses = expenses.filter((e) => e.date >= thisMonthStart && e.date <= thisMonthEnd);
  const lastMonthExpenses = expenses.filter((e) => e.date >= lastMonthStart && e.date <= lastMonthEnd);
  const thisMonthIncome = incomes.filter((i) => i.date >= thisMonthStart && i.date <= thisMonthEnd);
  const lastMonthIncome = incomes.filter((i) => i.date >= lastMonthStart && i.date <= lastMonthEnd);

  const thisExpenseTotal = thisMonthExpenses.reduce((sum, e) => sum + e.amount, 0);
  const lastExpenseTotal = lastMonthExpenses.reduce((sum, e) => sum + e.amount, 0);
  const thisIncomeTotal = thisMonthIncome.reduce((sum, e) => sum + e.amount, 0);
  const lastIncomeTotal = lastMonthIncome.reduce((sum, e) => sum + e.amount, 0);

  // Predicted month-end based on daily average so far this month
  const daysElapsed = Math.max(1, differenceInCalendarDays(now, parseISO(thisMonthStart)) + 1);
  const daysInMonth = differenceInCalendarDays(parseISO(thisMonthEnd), parseISO(thisMonthStart)) + 1;
  const dailyAvg = thisExpenseTotal / daysElapsed;
  const projected = dailyAvg * daysInMonth;

  if (lastExpenseTotal > 0 && projected > lastExpenseTotal * 1.1) {
    insights.push({
      id: 'pace-up',
      tone: 'warning',
      title: 'You’re spending faster than last month',
      detail: `Projected month-end: ${roundMoney(projected)} vs last month ${roundMoney(lastExpenseTotal)}.`,
      amount: roundMoney(projected - lastExpenseTotal),
    });
  } else if (lastExpenseTotal > 0 && projected < lastExpenseTotal * 0.9) {
    insights.push({
      id: 'pace-down',
      tone: 'positive',
      title: 'Spending pace is lower than last month',
      detail: `Projected ${roundMoney(projected)} vs last month ${roundMoney(lastExpenseTotal)}.`,
      amount: roundMoney(lastExpenseTotal - projected),
    });
  }

  // Income drop check
  if (lastIncomeTotal > 0 && thisIncomeTotal < lastIncomeTotal * 0.6 && daysElapsed > 15) {
    insights.push({
      id: 'income-drop',
      tone: 'warning',
      title: 'Income has dropped this month',
      detail: `${roundMoney(thisIncomeTotal)} so far vs ${roundMoney(lastIncomeTotal)} last month.`,
      amount: roundMoney(lastIncomeTotal - thisIncomeTotal),
    });
  }

  // Savings rate
  if (thisIncomeTotal > 0) {
    const savingsRate = Math.round(((thisIncomeTotal - thisExpenseTotal) / thisIncomeTotal) * 100);
    if (savingsRate >= 20) {
      insights.push({
        id: 'savings-rate-good',
        tone: 'positive',
        title: `${savingsRate}% savings rate this month`,
        detail: 'Solid pace — keep going.',
      });
    } else if (savingsRate < 0) {
      insights.push({
        id: 'spending-over-income',
        tone: 'warning',
        title: 'Spending exceeds income this month',
        detail: `You’re ${Math.abs(savingsRate)}% over income so far.`,
        amount: roundMoney(thisExpenseTotal - thisIncomeTotal),
      });
    }
  }

  // Unusual category spike vs last month
  const byCategoryThis = new Map<string, number>();
  for (const e of thisMonthExpenses) byCategoryThis.set(e.category, (byCategoryThis.get(e.category) ?? 0) + e.amount);
  const byCategoryLast = new Map<string, number>();
  for (const e of lastMonthExpenses) byCategoryLast.set(e.category, (byCategoryLast.get(e.category) ?? 0) + e.amount);
  let topSpike: { category: string; thisAmt: number; lastAmt: number; pct: number } | undefined;
  for (const [category, thisAmt] of byCategoryThis) {
    const lastAmt = byCategoryLast.get(category) ?? 0;
    if (lastAmt < 200) continue; // ignore tiny last-month bases
    const pct = ((thisAmt - lastAmt) / lastAmt) * 100;
    if (pct >= 30 && (!topSpike || pct > topSpike.pct)) topSpike = { category, thisAmt, lastAmt, pct };
  }
  if (topSpike) {
    insights.push({
      id: `spike-${topSpike.category}`,
      tone: 'warning',
      title: `${topSpike.category} spending is up`,
      detail: `${Math.round(topSpike.pct)}% higher than last month (${roundMoney(topSpike.thisAmt)} vs ${roundMoney(topSpike.lastAmt)}).`,
      amount: roundMoney(topSpike.thisAmt - topSpike.lastAmt),
    });
  }

  // Possible duplicate within last 48h
  const recentCutoffMs = Date.now() - HOUR_MS / 12; // last 2 days
  const recent = expenses.filter((e) => Date.parse(e.createdAt) > recentCutoffMs);
  const seenKey = new Map<string, Expense>();
  for (const e of recent) {
    const key = `${e.amount}|${e.category}|${(e.note || '').toLowerCase().trim().slice(0, 20)}`;
    const existing = seenKey.get(key);
    if (existing) {
      insights.push({
        id: `dup-${e.id}`,
        tone: 'info',
        title: 'Possible duplicate expense',
        detail: `${e.category} · ${e.note || 'no note'} on ${e.date} matches another recent entry.`,
        amount: e.amount,
      });
      break;
    } else {
      seenKey.set(key, e);
    }
  }

  // Over-budget alert
  const usage = getBudgetUsage(budgets, expenses, now);
  const worstBudget = usage.filter((u) => u.status !== 'on-track').sort((a, b) => b.pctUsed - a.pctUsed)[0];
  if (worstBudget) {
    insights.push({
      id: `budget-${worstBudget.budget.category}`,
      tone: worstBudget.status === 'over' ? 'warning' : 'info',
      title: worstBudget.status === 'over' ? `Over budget: ${worstBudget.budget.category}` : `Approaching budget: ${worstBudget.budget.category}`,
      detail: `${worstBudget.pctUsed}% of ${worstBudget.budget.monthlyLimit} used (${worstBudget.spent} spent).`,
      amount: worstBudget.spent,
    });
  }

  // Predicted month-end balance
  if (walletBalances.length) {
    const liquid = walletBalances.reduce((sum, w) => sum + w.balance, 0);
    const remainingDays = Math.max(0, daysInMonth - daysElapsed);
    const projectedSpend = dailyAvg * remainingDays;
    const projectedBalance = roundMoney(liquid - projectedSpend);
    insights.push({
      id: 'projected-balance',
      tone: projectedBalance < 0 ? 'warning' : 'info',
      title: 'Projected month-end balance',
      detail: `At current pace, you’ll end the month with ${projectedBalance} (current ${roundMoney(liquid)}).`,
      amount: projectedBalance,
    });
  }

  return insights;
}

export interface ReportTrendPoint {
  monthKey: string;
  label: string;
  income: number;
  expense: number;
  net: number;
}

export function getMonthlyTrend(
  expenses: Expense[],
  incomes: Income[],
  months = 6,
  reference = new Date(),
): ReportTrendPoint[] {
  const buckets: ReportTrendPoint[] = [];
  for (let offset = months - 1; offset >= 0; offset -= 1) {
    const ref = subMonths(reference, offset);
    buckets.push({
      monthKey: format(startOfMonth(ref), 'yyyy-MM'),
      label: format(ref, 'MMM'),
      income: 0,
      expense: 0,
      net: 0,
    });
  }
  for (const expense of expenses) {
    const bucket = buckets.find((b) => b.monthKey === expense.date.slice(0, 7));
    if (bucket) bucket.expense += expense.amount;
  }
  for (const income of incomes) {
    const bucket = buckets.find((b) => b.monthKey === income.date.slice(0, 7));
    if (bucket) bucket.income += income.amount;
  }
  for (const bucket of buckets) {
    bucket.income = roundMoney(bucket.income);
    bucket.expense = roundMoney(bucket.expense);
    bucket.net = roundMoney(bucket.income - bucket.expense);
  }
  return buckets;
}

export function getPaymentMethodUsage(expenses: Expense[], reference = new Date()) {
  const monthStart = format(startOfMonth(reference), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(reference), 'yyyy-MM-dd');
  const counts = new Map<string, { count: number; total: number }>();
  for (const expense of expenses) {
    if (expense.date < monthStart || expense.date > monthEnd) continue;
    const entry = counts.get(expense.paymentMethod) ?? { count: 0, total: 0 };
    entry.count += 1;
    entry.total += expense.amount;
    counts.set(expense.paymentMethod, entry);
  }
  return [...counts.entries()]
    .map(([method, { count, total }]) => ({ method, count, total: roundMoney(total) }))
    .sort((a, b) => b.total - a.total);
}

export function getTopMerchants(expenses: Expense[], reference = new Date(), top = 5) {
  const monthStart = format(startOfMonth(reference), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(reference), 'yyyy-MM-dd');
  const counts = new Map<string, { count: number; total: number; category: string }>();
  for (const expense of expenses) {
    if (expense.date < monthStart || expense.date > monthEnd) continue;
    const merchant = expense.note?.trim() || expense.category;
    const key = merchant.toLowerCase();
    const entry = counts.get(key) ?? { count: 0, total: 0, category: expense.category };
    entry.count += 1;
    entry.total += expense.amount;
    counts.set(key, entry);
  }
  return [...counts.entries()]
    .map(([key, value]) => ({ merchant: key, ...value, total: roundMoney(value.total) }))
    .sort((a, b) => b.total - a.total)
    .slice(0, top);
}

export function getTopSpendingDays(expenses: Expense[], reference = new Date(), top = 5) {
  const monthStart = format(startOfMonth(reference), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(reference), 'yyyy-MM-dd');
  const totals = new Map<string, number>();
  for (const expense of expenses) {
    if (expense.date < monthStart || expense.date > monthEnd) continue;
    totals.set(expense.date, (totals.get(expense.date) ?? 0) + expense.amount);
  }
  return [...totals.entries()]
    .map(([date, total]) => ({ date, total: roundMoney(total) }))
    .sort((a, b) => b.total - a.total)
    .slice(0, top);
}

export function getAverageDailySpend(expenses: Expense[], reference = new Date()) {
  const monthStart = format(startOfMonth(reference), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(reference), 'yyyy-MM-dd');
  const total = expenses
    .filter((expense) => expense.date >= monthStart && expense.date <= monthEnd)
    .reduce((sum, expense) => sum + expense.amount, 0);
  const days = Math.max(1, differenceInCalendarDays(reference, parseISO(monthStart)) + 1);
  return roundMoney(total / days);
}

export function getMonthOverMonthChange(expenses: Expense[], incomes: Income[], reference = new Date()) {
  const lastMonth = subMonths(reference, 1);
  const thisStart = format(startOfMonth(reference), 'yyyy-MM-dd');
  const thisEnd = format(endOfMonth(reference), 'yyyy-MM-dd');
  const lastStart = format(startOfMonth(lastMonth), 'yyyy-MM-dd');
  const lastEnd = format(endOfMonth(lastMonth), 'yyyy-MM-dd');
  const sum = <T extends { date: string; amount: number }>(list: T[], start: string, end: string) =>
    list.filter((entry) => entry.date >= start && entry.date <= end).reduce((acc, entry) => acc + entry.amount, 0);
  const thisExpense = sum(expenses, thisStart, thisEnd);
  const lastExpense = sum(expenses, lastStart, lastEnd);
  const thisIncome = sum(incomes, thisStart, thisEnd);
  const lastIncome = sum(incomes, lastStart, lastEnd);
  const change = (current: number, prev: number) => {
    if (prev === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - prev) / prev) * 100);
  };
  return {
    expense: { current: roundMoney(thisExpense), previous: roundMoney(lastExpense), pct: change(thisExpense, lastExpense) },
    income: { current: roundMoney(thisIncome), previous: roundMoney(lastIncome), pct: change(thisIncome, lastIncome) },
    net: {
      current: roundMoney(thisIncome - thisExpense),
      previous: roundMoney(lastIncome - lastExpense),
    },
  };
}
