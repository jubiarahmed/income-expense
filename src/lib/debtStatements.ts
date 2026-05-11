import type { Contact, Loan, LoanPayment } from '../domain/models';
import { getLoanInterest, getLoanRemaining } from './calculations';
import { formatFullDate } from './date';

export function buildLoanStatement(loan: Loan, payments: LoanPayment[], contact: Contact | undefined, currencySymbol: string): string {
  const interest = getLoanInterest(loan);
  const remaining = getLoanRemaining(loan, payments);
  const relevantPayments = payments
    .filter((payment) => payment.loanId === loan.id)
    .sort((a, b) => a.date.localeCompare(b.date));
  const totalPaid = relevantPayments.reduce((sum, payment) => sum + payment.amount, 0);

  const lines: string[] = [];
  lines.push(`📒 Loan statement — ${contact?.name ?? 'Unknown'}`);
  lines.push('');
  lines.push(`Direction: ${loan.direction === 'lent' ? 'I lent (they owe me)' : 'I borrowed (I owe them)'}`);
  lines.push(`Principal: ${currencySymbol}${loan.amount}`);
  lines.push(`Started: ${formatFullDate(loan.date)}`);
  if (loan.dueDate) lines.push(`Due: ${formatFullDate(loan.dueDate)}`);
  if (loan.interestType !== 'none' && loan.interestRate > 0) {
    lines.push(`Interest: ${loan.interestRate}% (${loan.interestType === 'apr' ? 'per year' : 'flat'}) — accrued ${currencySymbol}${interest}`);
  }
  if (loan.installmentsCount) lines.push(`Installments: ${loan.installmentsCount} planned`);
  lines.push('');
  if (relevantPayments.length) {
    lines.push('Payments:');
    for (const payment of relevantPayments) {
      lines.push(`  • ${formatFullDate(payment.date)} — ${currencySymbol}${payment.amount}${payment.note ? ` · ${payment.note}` : ''}`);
    }
    lines.push(`  Total paid: ${currencySymbol}${totalPaid}`);
  } else {
    lines.push('No payments recorded yet.');
  }
  lines.push('');
  lines.push(`Outstanding: ${currencySymbol}${remaining}`);
  if (loan.notes) lines.push(`\nNotes: ${loan.notes}`);
  return lines.join('\n');
}

export function buildLoanReminderMessage(loan: Loan, payments: LoanPayment[], contact: Contact | undefined, currencySymbol: string): string {
  const remaining = getLoanRemaining(loan, payments);
  const name = contact?.name?.split(' ')[0] ?? 'there';
  if (loan.direction === 'lent') {
    return `Hi ${name}, just a friendly reminder about ${currencySymbol}${remaining} you still owe me from ${formatFullDate(loan.date)}${loan.dueDate ? ` (due ${formatFullDate(loan.dueDate)})` : ''}. Whenever you can — no rush 🙏`;
  }
  return `Hi ${name}, I haven't forgotten — I still owe you ${currencySymbol}${remaining} from ${formatFullDate(loan.date)}. Will settle it soon.`;
}

export function buildContactLedger(
  contact: Contact,
  loans: Loan[],
  payments: LoanPayment[],
  currencySymbol: string,
): string {
  const relevantLoans = loans.filter((loan) => loan.personId === contact.id);
  if (!relevantLoans.length) return `No loan history with ${contact.name}.`;
  const lines: string[] = [];
  lines.push(`📒 Loan ledger — ${contact.name}`);
  if (contact.phone) lines.push(`Phone: ${contact.phone}`);
  lines.push('');
  let totalOwedToMe = 0;
  let totalIOwe = 0;
  for (const loan of relevantLoans) {
    const remaining = getLoanRemaining(loan, payments);
    const interest = getLoanInterest(loan);
    lines.push(`${loan.direction === 'lent' ? 'I lent' : 'I borrowed'} ${currencySymbol}${loan.amount} on ${formatFullDate(loan.date)}`);
    if (loan.interestType !== 'none' && loan.interestRate > 0) {
      lines.push(`  Interest accrued: ${currencySymbol}${interest} @ ${loan.interestRate}%`);
    }
    lines.push(`  Remaining: ${currencySymbol}${remaining} (${loan.status})`);
    if (loan.direction === 'lent') totalOwedToMe += remaining;
    else totalIOwe += remaining;
    lines.push('');
  }
  lines.push('Summary:');
  lines.push(`  They owe me: ${currencySymbol}${Math.round(totalOwedToMe * 100) / 100}`);
  lines.push(`  I owe them: ${currencySymbol}${Math.round(totalIOwe * 100) / 100}`);
  lines.push(`  Net: ${currencySymbol}${Math.round((totalOwedToMe - totalIOwe) * 100) / 100}`);
  return lines.join('\n');
}
