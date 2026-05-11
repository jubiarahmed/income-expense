import { CURRENT_USER_ID } from '../domain/models';
import type { Contact, SharedExpense, SharedGroup } from '../domain/models';
import { roundMoney } from './money';

export interface GroupBalance {
  participantId: string;
  displayName: string;
  netAmount: number; // > 0 means group owes them; < 0 means they owe the group
}

export interface SuggestedSettlement {
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  amount: number;
}

export interface GroupSettlementSummary {
  group: SharedGroup;
  balances: GroupBalance[];
  settlements: SuggestedSettlement[];
  openExpenses: SharedExpense[];
  totalShared: number;
  totalOpen: number;
}

function displayNameFor(participantId: string, contacts: Contact[]): string {
  if (participantId === CURRENT_USER_ID) return 'Me';
  return contacts.find((contact) => contact.id === participantId)?.name ?? 'Unknown';
}

// Greedy minimum-payments algorithm. For N participants with net balances summing
// to ~0 it produces at most N-1 transactions and is usually optimal in practice.
function simplifySettlement(balances: GroupBalance[]): SuggestedSettlement[] {
  const debtors = balances.filter((b) => b.netAmount < -0.01).map((b) => ({ ...b, netAmount: Math.abs(b.netAmount) }));
  const creditors = balances.filter((b) => b.netAmount > 0.01).map((b) => ({ ...b }));
  const settlements: SuggestedSettlement[] = [];
  debtors.sort((a, b) => b.netAmount - a.netAmount);
  creditors.sort((a, b) => b.netAmount - a.netAmount);

  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    const transfer = roundMoney(Math.min(debtor.netAmount, creditor.netAmount));
    if (transfer > 0) {
      settlements.push({
        fromId: debtor.participantId,
        fromName: debtor.displayName,
        toId: creditor.participantId,
        toName: creditor.displayName,
        amount: transfer,
      });
      debtor.netAmount = roundMoney(debtor.netAmount - transfer);
      creditor.netAmount = roundMoney(creditor.netAmount - transfer);
    }
    if (debtor.netAmount <= 0.01) i += 1;
    if (creditor.netAmount <= 0.01) j += 1;
  }
  return settlements;
}

export function getGroupSettlement(
  group: SharedGroup,
  sharedExpenses: SharedExpense[],
  contacts: Contact[],
): GroupSettlementSummary {
  const expenses = sharedExpenses.filter((expense) => expense.groupId === group.id);
  const openExpenses = expenses.filter((expense) => !expense.settled);
  const allParticipants = new Set<string>([CURRENT_USER_ID, ...group.participantIds]);
  // Compute net for each participant across only OPEN expenses.
  const netByParticipant = new Map<string, number>();
  for (const id of allParticipants) netByParticipant.set(id, 0);

  for (const expense of openExpenses) {
    const payer = expense.payerId;
    netByParticipant.set(payer, (netByParticipant.get(payer) ?? 0) + expense.amount);
    for (const share of expense.shares) {
      netByParticipant.set(share.contactId, (netByParticipant.get(share.contactId) ?? 0) - share.amount);
    }
  }

  const balances: GroupBalance[] = [...netByParticipant.entries()]
    .map(([participantId, netAmount]) => ({
      participantId,
      displayName: displayNameFor(participantId, contacts),
      netAmount: roundMoney(netAmount),
    }))
    .filter((entry) => Math.abs(entry.netAmount) > 0.01)
    .sort((a, b) => b.netAmount - a.netAmount);

  const settlements = simplifySettlement(balances);
  const totalShared = roundMoney(expenses.reduce((sum, expense) => sum + expense.amount, 0));
  const totalOpen = roundMoney(openExpenses.reduce((sum, expense) => sum + expense.amount, 0));

  return { group, balances, settlements, openExpenses, totalShared, totalOpen };
}

export function buildGroupSettlementText(
  summary: GroupSettlementSummary,
  currencySymbol: string,
): string {
  const lines: string[] = [];
  lines.push(`📒 ${summary.group.name} — settlement summary`);
  lines.push('');
  lines.push(`Total spent: ${currencySymbol}${summary.totalShared}`);
  lines.push(`Open balance: ${currencySymbol}${summary.totalOpen}`);
  lines.push('');
  if (summary.balances.length === 0) {
    lines.push('Everyone is settled ✅');
    return lines.join('\n');
  }
  lines.push('Balances:');
  for (const entry of summary.balances) {
    const verb = entry.netAmount > 0 ? 'is owed' : 'owes';
    lines.push(`  • ${entry.displayName} ${verb} ${currencySymbol}${Math.abs(entry.netAmount)}`);
  }
  lines.push('');
  lines.push('Suggested payments to settle:');
  if (summary.settlements.length === 0) lines.push('  (already settled)');
  else {
    for (const settle of summary.settlements) {
      lines.push(`  • ${settle.fromName} → ${settle.toName}: ${currencySymbol}${settle.amount}`);
    }
  }
  return lines.join('\n');
}
