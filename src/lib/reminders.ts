import { addDays, addMonths, differenceInCalendarDays, format, parseISO, startOfDay } from 'date-fns';
import type {
  Expense,
  ItemRecord,
  Loan,
  LoanPayment,
  Subscription,
} from '../domain/models';
import { getDerivedItemStatus, getDerivedLoanStatus, getLoanRemaining } from './calculations';

export type ReminderUrgency = 'overdue' | 'today' | 'soon' | 'upcoming';

export interface UpcomingReminder {
  id: string;
  type: 'loan' | 'item' | 'subscription';
  title: string;
  detail?: string;
  dueDate: string;
  amount?: number;
  urgency: ReminderUrgency;
  daysUntil: number;
  personId?: string;
}

export interface RecurringExpensePrediction {
  id: string;
  category: string;
  note: string;
  paymentMethod: string;
  averageAmount: number;
  lastDate: string;
  predictedDate: string;
  daysUntil: number;
  urgency: ReminderUrgency;
  occurrences: number;
}

function urgencyFor(daysUntil: number): ReminderUrgency {
  if (daysUntil < 0) return 'overdue';
  if (daysUntil === 0) return 'today';
  if (daysUntil <= 3) return 'soon';
  return 'upcoming';
}

export function getUpcomingReminders(
  loans: Loan[],
  loanPayments: LoanPayment[],
  items: ItemRecord[],
  subscriptions: Subscription[],
  windowDays = 30,
): UpcomingReminder[] {
  const today = startOfDay(new Date());
  const horizon = addDays(today, windowDays);
  const reminders: UpcomingReminder[] = [];

  for (const loan of loans) {
    if (!loan.dueDate) continue;
    const status = getDerivedLoanStatus(loan, loanPayments);
    if (status === 'settled') continue;
    const due = parseISO(loan.dueDate);
    if (due > horizon && status !== 'overdue') continue;
    const daysUntil = differenceInCalendarDays(due, today);
    reminders.push({
      id: `loan-${loan.id}`,
      type: 'loan',
      title: loan.direction === 'lent' ? 'Loan due to you' : 'Loan you owe',
      detail: loan.notes || undefined,
      dueDate: loan.dueDate,
      amount: getLoanRemaining(loan, loanPayments),
      urgency: urgencyFor(daysUntil),
      daysUntil,
      personId: loan.personId,
    });
  }

  for (const item of items) {
    if (item.status === 'returned' || !item.dueDate) continue;
    const due = parseISO(item.dueDate);
    const status = getDerivedItemStatus(item);
    if (due > horizon && status !== 'overdue') continue;
    const daysUntil = differenceInCalendarDays(due, today);
    reminders.push({
      id: `item-${item.id}`,
      type: 'item',
      title: item.direction === 'lent' ? `${item.itemName} to come back` : `Return ${item.itemName}`,
      detail: item.note || undefined,
      dueDate: item.dueDate,
      urgency: urgencyFor(daysUntil),
      daysUntil,
      personId: item.personId,
    });
  }

  for (const subscription of subscriptions) {
    if (subscription.status !== 'active') continue;
    const due = parseISO(subscription.nextDueDate);
    if (due > horizon) continue;
    const daysUntil = differenceInCalendarDays(due, today);
    reminders.push({
      id: `subscription-${subscription.id}`,
      type: 'subscription',
      title: subscription.name,
      detail: `${subscription.cycle} · ${subscription.category}`,
      dueDate: subscription.nextDueDate,
      amount: subscription.amount,
      urgency: urgencyFor(daysUntil),
      daysUntil,
    });
  }

  return reminders.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

// Predict recurring expenses based on the last 90 days of history. Groups expenses
// by a (category|note|paymentMethod) key, requires at least 2 occurrences in the
// trailing window, then predicts the next occurrence by averaging the days between
// consecutive occurrences and adding that to the last seen date.
export function predictRecurringExpenses(expenses: Expense[], lookaheadDays = 14): RecurringExpensePrediction[] {
  const today = startOfDay(new Date());
  const cutoff = format(addMonths(today, -3), 'yyyy-MM-dd');

  const buckets = new Map<string, Expense[]>();
  for (const expense of expenses) {
    if (expense.date < cutoff) continue;
    const key = `${expense.category.toLowerCase()}|${(expense.note || '').toLowerCase().trim()}|${expense.paymentMethod}`;
    const list = buckets.get(key) ?? [];
    list.push(expense);
    buckets.set(key, list);
  }

  const predictions: RecurringExpensePrediction[] = [];
  for (const [key, list] of buckets) {
    if (list.length < 2) continue;
    const sorted = [...list].sort((a, b) => a.date.localeCompare(b.date));
    let gapSum = 0;
    for (let i = 1; i < sorted.length; i += 1) {
      gapSum += differenceInCalendarDays(parseISO(sorted[i].date), parseISO(sorted[i - 1].date));
    }
    const averageGap = Math.round(gapSum / (sorted.length - 1));
    if (averageGap < 5 || averageGap > 45) continue; // skip very erratic patterns

    const last = sorted[sorted.length - 1];
    const predicted = addDays(parseISO(last.date), averageGap);
    const daysUntil = differenceInCalendarDays(predicted, today);
    // Only show items predicted to land in the lookahead window or already overdue by a little
    if (daysUntil > lookaheadDays || daysUntil < -7) continue;

    const averageAmount = list.reduce((sum, item) => sum + item.amount, 0) / list.length;
    predictions.push({
      id: `recurring-${key}`,
      category: last.category,
      note: last.note || '',
      paymentMethod: last.paymentMethod,
      averageAmount,
      lastDate: last.date,
      predictedDate: format(predicted, 'yyyy-MM-dd'),
      daysUntil,
      urgency: urgencyFor(daysUntil),
      occurrences: list.length,
    });
  }

  return predictions.sort((a, b) => a.predictedDate.localeCompare(b.predictedDate));
}
