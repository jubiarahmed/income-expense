import { isWithinInterval, parseISO } from 'date-fns';
import { CURRENT_USER_ID } from '../domain/models';
import type {
  Contact,
  Expense,
  Income,
  ItemRecord,
  Loan,
  LoanPayment,
  SharedExpense,
  Subscription,
} from '../domain/models';
import { getLastNDays, getMonthRange, isDateDueSoon, isDateOverdue } from './date';
import { roundMoney } from './money';

function getAccruedInterest(loan: Loan): number {
  if (!loan.interestType || loan.interestType === 'none' || !loan.interestRate) return 0;
  if (loan.interestType === 'flat') {
    // Flat fee on the principal — simple percentage.
    return roundMoney((loan.amount * loan.interestRate) / 100);
  }
  // APR — accrue daily based on the loan's start date.
  const start = new Date(loan.date);
  const now = new Date();
  const elapsedDays = Math.max(0, (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  const yearlyRate = loan.interestRate / 100;
  return roundMoney((loan.amount * yearlyRate * elapsedDays) / 365);
}

export function getLoanInterest(loan: Loan): number {
  return getAccruedInterest(loan);
}

export function getLoanRemaining(loan: Loan, payments: LoanPayment[]) {
  if (loan.status === 'settled') return 0;
  const paid = payments
    .filter((payment) => payment.loanId === loan.id)
    .reduce((total, payment) => total + payment.amount, 0);
  const interest = getAccruedInterest(loan);
  return Math.max(0, roundMoney(loan.amount + interest - paid));
}

export function getDerivedLoanStatus(loan: Loan, payments: LoanPayment[]) {
  const remaining = getLoanRemaining(loan, payments);
  if (remaining <= 0 || loan.status === 'settled') return 'settled';
  if (isDateOverdue(loan.dueDate)) return 'overdue';
  return 'active';
}

export function getDerivedItemStatus(item: ItemRecord) {
  if (item.status === 'returned') return 'returned';
  if (isDateOverdue(item.dueDate)) return 'overdue';
  return 'active';
}

export function getSubscriptionMonthlyCost(subscription: Subscription) {
  if (subscription.status !== 'active') return 0;
  if (subscription.cycle === 'weekly') return roundMoney((subscription.amount * 52) / 12);
  if (subscription.cycle === 'yearly') return roundMoney(subscription.amount / 12);
  return subscription.amount;
}

export function getExpenseTotals(expenses: Expense[]) {
  const today = new Date();
  const todayISO = today.toISOString().slice(0, 10);
  const range = getMonthRange(today);
  return {
    today: expenses.filter((expense) => expense.date === todayISO).reduce((sum, item) => sum + item.amount, 0),
    month: expenses
      .filter((expense) => expense.date >= range.start && expense.date <= range.end)
      .reduce((sum, item) => sum + item.amount, 0),
  };
}

export function getIncomeTotals(incomes: Income[]) {
  const today = new Date();
  const todayISO = today.toISOString().slice(0, 10);
  const range = getMonthRange(today);
  return {
    today: incomes.filter((income) => income.date === todayISO).reduce((sum, item) => sum + item.amount, 0),
    month: incomes
      .filter((income) => income.date >= range.start && income.date <= range.end)
      .reduce((sum, item) => sum + item.amount, 0),
  };
}

export function getMonthlyCategoryTotals(expenses: Expense[]) {
  const range = getMonthRange();
  const totals = new Map<string, number>();
  expenses
    .filter((expense) => expense.date >= range.start && expense.date <= range.end)
    .forEach((expense) => {
      totals.set(expense.category, (totals.get(expense.category) ?? 0) + expense.amount);
    });
  return [...totals.entries()]
    .map(([name, value]) => ({ name, value: roundMoney(value) }))
    .sort((a, b) => b.value - a.value);
}

export function getLast7DayTrend(expenses: Expense[]) {
  return getLastNDays(7).map((date) => ({
    date,
    label: parseISO(date).toLocaleDateString('en-US', { weekday: 'short' }),
    amount: roundMoney(
      expenses.filter((expense) => expense.date === date).reduce((sum, expense) => sum + expense.amount, 0),
    ),
  }));
}

export function getSharedBalances(sharedExpenses: SharedExpense[]) {
  const balances = new Map<string, number>();

  sharedExpenses
    .filter((expense) => !expense.settled)
    .forEach((expense) => {
      const meParticipates = expense.participantIds.includes(CURRENT_USER_ID);
      if (expense.payerId === CURRENT_USER_ID) {
        expense.shares
          .filter((share) => share.contactId !== CURRENT_USER_ID)
          .forEach((share) => balances.set(share.contactId, roundMoney((balances.get(share.contactId) ?? 0) + share.amount)));
        return;
      }

      if (meParticipates) {
        const myShare = expense.shares.find((share) => share.contactId === CURRENT_USER_ID)?.amount ?? 0;
        balances.set(expense.payerId, roundMoney((balances.get(expense.payerId) ?? 0) - myShare));
      }
    });

  return balances;
}

export function getLoanBalances(loans: Loan[], payments: LoanPayment[]) {
  const balances = new Map<string, number>();
  loans.forEach((loan) => {
    const remaining = getLoanRemaining(loan, payments);
    if (remaining <= 0) return;
    const signed = loan.direction === 'lent' ? remaining : -remaining;
    balances.set(loan.personId, roundMoney((balances.get(loan.personId) ?? 0) + signed));
  });
  return balances;
}

export function getPersonSummaries(
  contacts: Contact[],
  loans: Loan[],
  payments: LoanPayment[],
  sharedExpenses: SharedExpense[],
  items: ItemRecord[],
) {
  const loanBalances = getLoanBalances(loans, payments);
  const sharedBalances = getSharedBalances(sharedExpenses);

  return contacts
    .map((contact) => {
      const contactLoans = loans.filter((loan) => loan.personId === contact.id);
      const moneyLent = contactLoans
        .filter((loan) => loan.direction === 'lent')
        .reduce((sum, loan) => sum + getLoanRemaining(loan, payments), 0);
      const moneyBorrowed = contactLoans
        .filter((loan) => loan.direction === 'borrowed')
        .reduce((sum, loan) => sum + getLoanRemaining(loan, payments), 0);
      const sharedBalance = sharedBalances.get(contact.id) ?? 0;
      const loanBalance = loanBalances.get(contact.id) ?? 0;
      const relatedItems = items.filter((item) => item.personId === contact.id);

      return {
        contact,
        netBalance: roundMoney(loanBalance + sharedBalance),
        moneyLent: roundMoney(moneyLent),
        moneyBorrowed: roundMoney(moneyBorrowed),
        sharedBalance: roundMoney(sharedBalance),
        activeItems: relatedItems.filter((item) => item.status === 'active').length,
        overdueItems: relatedItems.filter((item) => getDerivedItemStatus(item) === 'overdue').length,
      };
    })
    .sort((a, b) => Math.abs(b.netBalance) - Math.abs(a.netBalance));
}

export function getObligationStats(
  contacts: Contact[],
  loans: Loan[],
  payments: LoanPayment[],
  sharedExpenses: SharedExpense[],
  items: ItemRecord[],
  subscriptions: Subscription[],
) {
  const people = getPersonSummaries(contacts, loans, payments, sharedExpenses, items);
  const subscriptionMonthlyTotal = subscriptions.reduce((sum, subscription) => sum + getSubscriptionMonthlyCost(subscription), 0);
  return {
    peopleOweMe: roundMoney(people.filter((person) => person.netBalance > 0).reduce((sum, person) => sum + person.netBalance, 0)),
    iOweOthers: roundMoney(Math.abs(people.filter((person) => person.netBalance < 0).reduce((sum, person) => sum + person.netBalance, 0))),
    overdueItems: items.filter((item) => getDerivedItemStatus(item) === 'overdue').length,
    activeSubscriptions: subscriptions.filter((subscription) => subscription.status === 'active').length,
    subscriptionMonthlyTotal: roundMoney(subscriptionMonthlyTotal),
    subscriptionYearlyEstimate: roundMoney(subscriptionMonthlyTotal * 12),
  };
}

export function getUpcomingObligations(loans: Loan[], payments: LoanPayment[], items: ItemRecord[], subscriptions: Subscription[]) {
  const loanItems = loans
    .filter((loan) => getDerivedLoanStatus(loan, payments) !== 'settled' && (isDateDueSoon(loan.dueDate, 14) || isDateOverdue(loan.dueDate)))
    .map((loan) => ({
      id: loan.id,
      type: 'loan' as const,
      title: loan.direction === 'lent' ? 'Loan due to you' : 'Loan you owe',
      dueDate: loan.dueDate,
      amount: getLoanRemaining(loan, payments),
      overdue: isDateOverdue(loan.dueDate),
      personId: loan.personId,
    }));

  const physicalItems = items
    .filter((item) => item.status === 'active' && (isDateDueSoon(item.dueDate, 14) || isDateOverdue(item.dueDate)))
    .map((item) => ({
      id: item.id,
      type: 'item' as const,
      title: item.direction === 'lent' ? `${item.itemName} should return` : `Return ${item.itemName}`,
      dueDate: item.dueDate,
      overdue: isDateOverdue(item.dueDate),
      personId: item.personId,
    }));

  const subscriptionItems = subscriptions
    .filter(
      (subscription) =>
        subscription.status === 'active' &&
        (isDateDueSoon(subscription.nextDueDate, 14) || isDateOverdue(subscription.nextDueDate)),
    )
    .map((subscription) => ({
      id: subscription.id,
      type: 'subscription' as const,
      title: subscription.name,
      dueDate: subscription.nextDueDate,
      amount: subscription.amount,
      overdue: isDateOverdue(subscription.nextDueDate),
    }));

  return [...loanItems, ...physicalItems, ...subscriptionItems].sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''));
}

export function getExpensesInRange(expenses: Expense[], start?: string, end?: string) {
  if (!start || !end) return expenses;
  return expenses.filter((expense) =>
    isWithinInterval(parseISO(expense.date), {
      start: parseISO(start),
      end: parseISO(end),
    }),
  );
}
