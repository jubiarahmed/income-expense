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
export type PredictionConfidence = 'low' | 'medium' | 'high';

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
  confidence: PredictionConfidence;
  reason: string;
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

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? Math.round((sorted[mid - 1] + sorted[mid]) / 2) : sorted[mid];
}

function clampDayOfMonth(year: number, month0: number, dayOfMonth: number) {
  const daysInMonth = new Date(year, month0 + 1, 0).getDate();
  return Math.min(dayOfMonth, daysInMonth);
}

// Smarter prediction that handles:
// - Multi-occurrence series with widely-varying intervals (5–95 day gaps OK, uses median).
// - Single-occurrence monthly cycle: if seen exactly once 25–35 days ago, predict same day-of-month this month.
// - Single-occurrence quarterly/bi-monthly cycle: if seen once 50–95 days ago, predict same day-of-month after that interval.
// - Annual cycle: if seen once 11–13 months ago, predict the same day-of-month this year.
//
// Output is ranked by predicted date and tagged with a confidence level.
export function predictRecurringExpenses(expenses: Expense[], lookaheadDays = 14): RecurringExpensePrediction[] {
  if (expenses.length === 0) return [];

  const today = startOfDay(new Date());
  const oneYearAgo = format(addMonths(today, -13), 'yyyy-MM-dd');

  // Normalize key: category + first 24 chars of note (case-insensitive, trimmed).
  // We intentionally do NOT include payment method so people switching payment methods don't break the pattern.
  const keyOf = (expense: Expense) =>
    `${expense.category.toLowerCase()}|${(expense.note || '').toLowerCase().trim().slice(0, 24)}`;

  const buckets = new Map<string, Expense[]>();
  for (const expense of expenses) {
    if (expense.date < oneYearAgo) continue;
    const key = keyOf(expense);
    const list = buckets.get(key) ?? [];
    list.push(expense);
    buckets.set(key, list);
  }

  const predictions: RecurringExpensePrediction[] = [];

  for (const [key, list] of buckets) {
    const sorted = [...list].sort((a, b) => a.date.localeCompare(b.date));
    const last = sorted[sorted.length - 1];
    const averageAmount = list.reduce((sum, item) => sum + item.amount, 0) / list.length;
    const lastDate = parseISO(last.date);
    const daysSinceLast = differenceInCalendarDays(today, lastDate);

    if (sorted.length >= 2) {
      // Compute gaps between consecutive occurrences.
      const gaps: number[] = [];
      for (let i = 1; i < sorted.length; i += 1) {
        gaps.push(differenceInCalendarDays(parseISO(sorted[i].date), parseISO(sorted[i - 1].date)));
      }
      const gap = median(gaps);
      if (gap >= 5 && gap <= 95) {
        const predicted = addDays(lastDate, gap);
        const daysUntil = differenceInCalendarDays(predicted, today);
        if (daysUntil <= lookaheadDays && daysUntil >= -7) {
          const variance = gaps.reduce((sum, g) => sum + Math.abs(g - gap), 0) / gaps.length;
          const confidence: PredictionConfidence =
            sorted.length >= 3 && variance <= 5 ? 'high' : sorted.length >= 3 ? 'medium' : 'medium';
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
            occurrences: sorted.length,
            confidence,
            reason: `Seen ${sorted.length}× · usually every ${gap} day${gap === 1 ? '' : 's'}`,
          });
          continue; // Skip single-occurrence fallback below.
        }
      }
    }

    // Single-occurrence cycle inference. We only emit a prediction if the
    // expense looks like it could be a routine bill that recurs on a calendar
    // cadence (monthly / bi-monthly / quarterly / yearly).
    if (sorted.length === 1) {
      const dayOfMonth = lastDate.getDate();
      const candidates: { months: number; reason: string; confidence: PredictionConfidence }[] = [];

      if (daysSinceLast >= 22 && daysSinceLast <= 38) {
        candidates.push({ months: 1, reason: 'Logged about a month ago', confidence: 'low' });
      } else if (daysSinceLast >= 50 && daysSinceLast <= 70) {
        candidates.push({ months: 2, reason: 'Logged about two months ago', confidence: 'low' });
      } else if (daysSinceLast >= 80 && daysSinceLast <= 100) {
        candidates.push({ months: 3, reason: 'Logged about a quarter ago', confidence: 'low' });
      } else if (daysSinceLast >= 330 && daysSinceLast <= 395) {
        candidates.push({ months: 12, reason: 'Logged about a year ago', confidence: 'low' });
      }

      for (const candidate of candidates) {
        const target = addMonths(lastDate, candidate.months);
        const predictedYear = target.getFullYear();
        const predictedMonth = target.getMonth();
        const clampedDay = clampDayOfMonth(predictedYear, predictedMonth, dayOfMonth);
        const predicted = new Date(predictedYear, predictedMonth, clampedDay);
        const daysUntil = differenceInCalendarDays(predicted, today);
        if (daysUntil > lookaheadDays || daysUntil < -7) continue;
        predictions.push({
          id: `recurring-${key}-cycle-${candidate.months}`,
          category: last.category,
          note: last.note || '',
          paymentMethod: last.paymentMethod,
          averageAmount,
          lastDate: last.date,
          predictedDate: format(predicted, 'yyyy-MM-dd'),
          daysUntil,
          urgency: urgencyFor(daysUntil),
          occurrences: 1,
          confidence: candidate.confidence,
          reason: candidate.reason,
        });
      }
    }
  }

  // Dedupe by id (occasionally the same key generates two candidates from
  // different paths) and sort: confidence first, then nearest predicted date.
  const seen = new Set<string>();
  const deduped: RecurringExpensePrediction[] = [];
  for (const prediction of predictions) {
    if (seen.has(prediction.id)) continue;
    seen.add(prediction.id);
    deduped.push(prediction);
  }
  const confidenceWeight: Record<PredictionConfidence, number> = { high: 3, medium: 2, low: 1 };
  deduped.sort((a, b) => {
    if (a.urgency !== b.urgency) {
      const urgencyOrder: Record<ReminderUrgency, number> = { overdue: 0, today: 1, soon: 2, upcoming: 3 };
      return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
    }
    if (a.confidence !== b.confidence) return confidenceWeight[b.confidence] - confidenceWeight[a.confidence];
    return a.predictedDate.localeCompare(b.predictedDate);
  });
  return deduped;
}
