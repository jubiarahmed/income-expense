import { useMemo } from 'react';
import { Activity, ArrowDownRight, ArrowLeft, ArrowLeftRight, ArrowUpRight, HandCoins, Mail, PackageOpen, Phone, ReceiptText, Repeat, StickyNote, Users } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import type { CurrencyCode, ID } from '../../domain/models';
import { formatFullDate } from '../../lib/date';
import { formatMoney } from '../../lib/money';
import { useAdminStore } from '../../state/useAdminStore';

export function UserSnapshotView() {
  const snapshot = useAdminStore((state) => state.selectedUserSnapshot);
  const loading = useAdminStore((state) => state.selectedUserLoading);
  const error = useAdminStore((state) => state.selectedUserError);
  const clearSelectedUser = useAdminStore((state) => state.clearSelectedUser);

  const currency: CurrencyCode = snapshot?.preferences?.currency ?? 'BDT';
  const account = snapshot?.account;

  const contactById = useMemo(() => {
    const map = new Map<ID, string>();
    snapshot?.contacts.forEach((contact) => map.set(contact.id, contact.name));
    return map;
  }, [snapshot]);

  const groupById = useMemo(() => {
    const map = new Map<ID, string>();
    snapshot?.sharedGroups.forEach((group) => map.set(group.id, group.name));
    return map;
  }, [snapshot]);

  const totals = useMemo(() => {
    if (!snapshot) return { expenses: 0, incomes: 0, transfers: 0, lent: 0, borrowed: 0, subsMonthly: 0 };
    return {
      expenses: snapshot.expenses.reduce((sum, item) => sum + item.amount, 0),
      incomes: snapshot.incomes.reduce((sum, item) => sum + item.amount, 0),
      transfers: snapshot.transfers.reduce((sum, item) => sum + item.amount, 0),
      lent: snapshot.loans.filter((l) => l.direction === 'lent').reduce((sum, l) => sum + l.amount, 0),
      borrowed: snapshot.loans.filter((l) => l.direction === 'borrowed').reduce((sum, l) => sum + l.amount, 0),
      subsMonthly: snapshot.subscriptions
        .filter((s) => s.status === 'active')
        .reduce((sum, s) => {
          if (s.cycle === 'monthly') return sum + s.amount;
          if (s.cycle === 'weekly') return sum + s.amount * 4;
          if (s.cycle === 'yearly') return sum + s.amount / 12;
          return sum;
        }, 0),
    };
  }, [snapshot]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="secondary" icon={<ArrowLeft size={16} />} onClick={clearSelectedUser}>
          Back
        </Button>
        <p className="text-sm font-bold text-slate-700 dark:text-slate-200">User data</p>
      </div>

      {account ? (
        <Card className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-black text-slate-950 dark:text-slate-50">{account.name}</h2>
            <Badge tone={account.status === 'held' ? 'danger' : 'good'}>{account.status}</Badge>
            <Badge tone="neutral">{account.role}</Badge>
          </div>
          <p className="break-all text-sm text-slate-500">{account.email}</p>
          <p className="text-xs text-slate-500">Joined {formatFullDate(account.createdAt.slice(0, 10))}</p>
          {account.holdReason ? (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{account.holdReason}</p>
          ) : null}
        </Card>
      ) : null}

      {error ? <p className="rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p> : null}
      {loading && !snapshot ? <EmptyState title="Loading data..." body="Fetching user snapshot." /> : null}

      {snapshot ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            <SummaryCard label="Total income" value={formatMoney(totals.incomes, currency)} icon={<ArrowUpRight size={18} />} />
            <SummaryCard label="Total expenses" value={formatMoney(totals.expenses, currency)} icon={<ArrowDownRight size={18} />} />
            <SummaryCard label="Total transfers" value={formatMoney(totals.transfers, currency)} icon={<ArrowLeftRight size={18} />} />
            <SummaryCard label="Subs / mo" value={formatMoney(totals.subsMonthly, currency)} icon={<Repeat size={18} />} />
            <SummaryCard label="Money lent" value={formatMoney(totals.lent, currency)} icon={<HandCoins size={18} />} />
            <SummaryCard label="Money borrowed" value={formatMoney(totals.borrowed, currency)} icon={<HandCoins size={18} />} />
          </div>

          <Section icon={<Users size={16} />} title={`Contacts (${snapshot.contacts.length})`}>
            {snapshot.contacts.length ? (
              <div className="space-y-2">
                {snapshot.contacts.map((contact) => (
                  <div key={contact.id} className="space-y-1 rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-900">
                    <p className="text-sm font-bold text-slate-950 dark:text-slate-50">{contact.name}</p>
                    {contact.phone ? (
                      <p className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Phone size={12} />
                        {contact.phone}
                      </p>
                    ) : null}
                    {contact.notes ? (
                      <p className="flex items-start gap-1.5 text-xs text-slate-500">
                        <StickyNote size={12} className="mt-0.5 shrink-0" />
                        <span className="break-words">{contact.notes}</span>
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No contacts.</p>
            )}
          </Section>

          <Section icon={<ArrowUpRight size={16} />} title={`Incomes (${snapshot.incomes.length})`}>
            {snapshot.incomes.length ? (
              <div className="space-y-2">
                {snapshot.incomes.slice(0, 50).map((income) => (
                  <Row
                    key={income.id}
                    title={`${income.category}${income.source ? ` — ${income.source}` : ''}`}
                    subtitle={`${formatFullDate(income.date)} · ${income.paymentMethod}${income.note ? ` · ${income.note}` : ''}`}
                    amount={formatMoney(income.amount, currency)}
                  />
                ))}
                {snapshot.incomes.length > 50 ? (
                  <p className="text-xs text-zinc-500">Showing latest 50 of {snapshot.incomes.length}.</p>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-zinc-500">No income records.</p>
            )}
          </Section>

          <Section icon={<ArrowLeftRight size={16} />} title={`Transfers (${snapshot.transfers.length})`}>
            {snapshot.transfers.length ? (
              <div className="space-y-2">
                {snapshot.transfers.slice(0, 50).map((transfer) => (
                  <Row
                    key={transfer.id}
                    title={`${transfer.fromMethod} → ${transfer.toMethod}`}
                    subtitle={`${formatFullDate(transfer.date)}${transfer.fee ? ` · fee ${formatMoney(transfer.fee, currency)}` : ''}${transfer.note ? ` · ${transfer.note}` : ''}`}
                    amount={formatMoney(transfer.amount, currency)}
                  />
                ))}
                {snapshot.transfers.length > 50 ? (
                  <p className="text-xs text-zinc-500">Showing latest 50 of {snapshot.transfers.length}.</p>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-zinc-500">No transfers.</p>
            )}
          </Section>

          <Section icon={<ReceiptText size={16} />} title={`Expenses (${snapshot.expenses.length})`}>
            {snapshot.expenses.length ? (
              <div className="space-y-2">
                {snapshot.expenses.slice(0, 50).map((expense) => (
                  <Row
                    key={expense.id}
                    title={expense.category}
                    subtitle={`${formatFullDate(expense.date)} · ${expense.paymentMethod}${expense.note ? ` · ${expense.note}` : ''}`}
                    amount={formatMoney(expense.amount, currency)}
                  />
                ))}
                {snapshot.expenses.length > 50 ? (
                  <p className="text-xs text-slate-500">Showing latest 50 of {snapshot.expenses.length}.</p>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No expenses.</p>
            )}
          </Section>

          <Section icon={<HandCoins size={16} />} title={`Loans (${snapshot.loans.length})`}>
            {snapshot.loans.length ? (
              <div className="space-y-2">
                {snapshot.loans.map((loan) => (
                  <Row
                    key={loan.id}
                    title={`${loan.direction === 'lent' ? 'Lent to' : 'Borrowed from'} ${contactById.get(loan.personId) ?? 'Unknown'}`}
                    subtitle={`${formatFullDate(loan.date)}${loan.dueDate ? ` · due ${formatFullDate(loan.dueDate)}` : ''} · ${loan.status}${loan.notes ? ` · ${loan.notes}` : ''}`}
                    amount={formatMoney(loan.amount, currency)}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No loans.</p>
            )}
          </Section>

          <Section icon={<PackageOpen size={16} />} title={`Items (${snapshot.items.length})`}>
            {snapshot.items.length ? (
              <div className="space-y-2">
                {snapshot.items.map((item) => (
                  <Row
                    key={item.id}
                    title={`${item.itemName} — ${item.direction === 'lent' ? 'Lent to' : 'Borrowed from'} ${contactById.get(item.personId) ?? 'Unknown'}`}
                    subtitle={`${formatFullDate(item.date)} · ${item.status}${item.returnedDate ? ` on ${formatFullDate(item.returnedDate)}` : ''}${item.note ? ` · ${item.note}` : ''}`}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No item records.</p>
            )}
          </Section>

          <Section icon={<Repeat size={16} />} title={`Subscriptions (${snapshot.subscriptions.length})`}>
            {snapshot.subscriptions.length ? (
              <div className="space-y-2">
                {snapshot.subscriptions.map((sub) => (
                  <Row
                    key={sub.id}
                    title={`${sub.name} (${sub.cycle})`}
                    subtitle={`Next ${formatFullDate(sub.nextDueDate)} · ${sub.status}${sub.notes ? ` · ${sub.notes}` : ''}`}
                    amount={formatMoney(sub.amount, currency)}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No subscriptions.</p>
            )}
          </Section>

          <Section icon={<Users size={16} />} title={`Shared expenses (${snapshot.sharedExpenses.length})`}>
            {snapshot.sharedExpenses.length ? (
              <div className="space-y-2">
                {snapshot.sharedExpenses.slice(0, 30).map((shared) => (
                  <Row
                    key={shared.id}
                    title={`${groupById.get(shared.groupId) ?? 'Group'} — ${shared.note || 'Shared expense'}`}
                    subtitle={`${formatFullDate(shared.date)} · payer ${contactById.get(shared.payerId) ?? 'Unknown'} · ${shared.settled ? 'settled' : 'open'}`}
                    amount={formatMoney(shared.amount, currency)}
                  />
                ))}
                {snapshot.sharedExpenses.length > 30 ? (
                  <p className="text-xs text-slate-500">Showing latest 30 of {snapshot.sharedExpenses.length}.</p>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No shared expenses.</p>
            )}
          </Section>

          <Section icon={<Activity size={16} />} title={`Activity (${snapshot.activities.length})`}>
            {snapshot.activities.length ? (
              <div className="space-y-2">
                {snapshot.activities.slice(0, 50).map((activity) => (
                  <Row
                    key={activity.id}
                    title={activity.title}
                    subtitle={`${formatFullDate(activity.createdAt.slice(0, 10))}${activity.detail ? ` · ${activity.detail}` : ''}`}
                    amount={activity.amount != null ? formatMoney(activity.amount, currency) : undefined}
                  />
                ))}
                {snapshot.activities.length > 50 ? (
                  <p className="text-xs text-slate-500">Showing latest 50 of {snapshot.activities.length}.</p>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No activity recorded.</p>
            )}
          </Section>

          {snapshot.preferences ? (
            <Section icon={<Mail size={16} />} title="Preferences">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <PreferenceCell label="Currency" value={snapshot.preferences.currency} />
                <PreferenceCell label="Theme" value={snapshot.preferences.theme} />
                <PreferenceCell label="Reminder lead time" value={`${snapshot.preferences.reminderDaysBefore} day(s)`} />
                <PreferenceCell label="Notifications" value={snapshot.preferences.notificationsEnabled ? 'On' : 'Off'} />
              </div>
            </Section>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function SummaryCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <Card className="space-y-2">
      <div className="flex items-center justify-between text-slate-500">
        <span className="text-xs font-bold uppercase tracking-wide">{label}</span>
        {icon}
      </div>
      <p className="text-lg font-black text-slate-950 dark:text-slate-50">{value}</p>
    </Card>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card className="space-y-3">
      <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
        {icon}
        <h3 className="text-sm font-bold">{title}</h3>
      </div>
      {children}
    </Card>
  );
}

function Row({ title, subtitle, amount }: { title: string; subtitle?: string; amount?: string }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-900">
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-slate-950 dark:text-slate-50">{title}</p>
        {subtitle ? <p className="truncate text-xs text-slate-500">{subtitle}</p> : null}
      </div>
      {amount ? <p className="shrink-0 text-sm font-black text-slate-950 dark:text-slate-50">{amount}</p> : null}
    </div>
  );
}

function PreferenceCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-900">
      <p className="text-[0.65rem] uppercase tracking-wide text-slate-500">{label}</p>
      <p className="font-black text-slate-950 dark:text-slate-50">{value}</p>
    </div>
  );
}
