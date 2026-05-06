import { useMemo, useState } from 'react';
import { Check, Pencil, Plus, RotateCcw, Search, Trash2 } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { Button } from '../../components/ui/Button';
import { Card, SectionHeader } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { TextInput } from '../../components/ui/Form';
import type { Contact, Loan } from '../../domain/models';
import { getDerivedItemStatus, getDerivedLoanStatus, getLoanRemaining, getPersonSummaries } from '../../lib/calculations';
import { formatFullDate, formatShortDate } from '../../lib/date';
import { formatMoney } from '../../lib/money';
import { useFinanceStore } from '../../state/useFinanceStore';
import { useUiStore } from '../../state/useUiStore';
import { LoanPaymentForm } from '../obligations/LoanForm';
import { ContactForm } from './ContactForm';

export function PeoplePage() {
  const { contacts, loans, loanPayments, sharedExpenses, items, activities, preferences, deleteContact } = useFinanceStore();
  const openAddFlow = useUiStore((state) => state.openAddFlow);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Contact | undefined>();
  const [editing, setEditing] = useState<Contact | undefined>();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const summaries = useMemo(
    () => getPersonSummaries(contacts, loans, loanPayments, sharedExpenses, items),
    [contacts, items, loanPayments, loans, sharedExpenses],
  );
  const filtered = summaries.filter((summary) => summary.contact.name.toLowerCase().includes(query.toLowerCase()));

  async function remove(contact: Contact) {
    setError('');
    try {
      await deleteContact(contact.id);
      setConfirmDeleteId(null);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Unable to delete person');
    }
  }

  return (
    <div className="space-y-5">
      <Card className="p-3">
        <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 dark:bg-slate-900">
          <Search size={18} className="text-slate-400" />
          <TextInput
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search people"
            className="border-0 bg-transparent px-0 focus:ring-0 dark:bg-transparent"
          />
        </div>
      </Card>

      <SectionHeader
        title="Relationships"
        action={
          <Button variant="secondary" className="min-h-9 px-3" icon={<Plus size={16} />} onClick={() => openAddFlow('contact')}>
            Person
          </Button>
        }
      />
      {error ? <p className="rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p> : null}
      <div className="space-y-2">
        {filtered.length ? (
          filtered.map((summary) => (
            <Card key={summary.contact.id} className="p-3">
              <button type="button" className="w-full text-left" onClick={() => setSelected(summary.contact)}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-base font-black text-slate-950 dark:text-slate-50">{summary.contact.name}</p>
                    <p className="text-xs text-slate-500">{summary.contact.phone || 'No phone saved'}</p>
                  </div>
                  <div className="text-right">
                    <p className={summary.netBalance >= 0 ? 'font-black text-emerald-700' : 'font-black text-rose-600'}>
                      {formatMoney(Math.abs(summary.netBalance), preferences.currency)}
                    </p>
                    <p className="text-xs text-slate-500">{summary.netBalance >= 0 ? 'owes me' : 'I owe'}</p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-900">
                    <p className="font-black">{formatMoney(summary.moneyLent, preferences.currency)}</p>
                    <p className="text-slate-500">lent</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-900">
                    <p className="font-black">{formatMoney(summary.moneyBorrowed, preferences.currency)}</p>
                    <p className="text-slate-500">borrowed</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-900">
                    <p className="font-black">{summary.activeItems}</p>
                    <p className="text-slate-500">items</p>
                  </div>
                </div>
              </button>
              {confirmDeleteId === summary.contact.id ? (
                <div className="mt-3 flex items-center gap-2">
                  <p className="flex-1 text-sm font-semibold text-slate-700 dark:text-slate-300">Delete {summary.contact.name}?</p>
                  <Button variant="ghost" className="min-h-9 px-3" onClick={() => setConfirmDeleteId(null)}>
                    Cancel
                  </Button>
                  <Button
                    variant="ghost"
                    className="min-h-9 px-3 text-rose-600"
                    icon={<Trash2 size={16} />}
                    onClick={() => void remove(summary.contact)}
                  >
                    Delete
                  </Button>
                </div>
              ) : (
                <div className="mt-3 flex gap-2">
                  <Button variant="ghost" className="min-h-9 flex-1 px-2" icon={<Pencil size={16} />} onClick={() => setEditing(summary.contact)}>
                    Edit
                  </Button>
                  <Button variant="ghost" className="min-h-9 px-3 text-rose-600" icon={<Trash2 size={16} />} onClick={() => setConfirmDeleteId(summary.contact.id)}>
                    Delete
                  </Button>
                </div>
              )}
            </Card>
          ))
        ) : (
          <EmptyState title="No people found" body="Add people you split with, lend to, borrow from, or exchange items with." />
        )}
      </div>

      <BottomSheet open={Boolean(selected)} title={selected?.name ?? 'Person'} onClose={() => setSelected(undefined)}>
        {selected ? (
          <PersonDetail
            contact={selected}
            loans={loans.filter((loan) => loan.personId === selected.id)}
            payments={loanPayments}
            items={items.filter((item) => item.personId === selected.id)}
            activities={activities.filter((activity) => activity.personId === selected.id)}
          />
        ) : null}
      </BottomSheet>

      <BottomSheet open={Boolean(editing)} title="Edit Person" onClose={() => setEditing(undefined)}>
        {editing ? <ContactForm contact={editing} onDone={() => setEditing(undefined)} /> : null}
      </BottomSheet>
    </div>
  );
}

function PersonDetail({
  contact,
  loans,
  payments,
  items,
  activities,
}: {
  contact: Contact;
  loans: Loan[];
  payments: ReturnType<typeof useFinanceStore.getState>['loanPayments'];
  items: ReturnType<typeof useFinanceStore.getState>['items'];
  activities: ReturnType<typeof useFinanceStore.getState>['activities'];
}) {
  const { preferences, markItemReturned } = useFinanceStore();
  const [repayingLoan, setRepayingLoan] = useState<Loan | null>(null);

  if (repayingLoan) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setRepayingLoan(null)}
          className="flex items-center gap-1 text-sm font-semibold text-slate-600 dark:text-slate-400"
        >
          ← Back to {contact.name}
        </button>
        <LoanPaymentForm loan={repayingLoan} onDone={() => setRepayingLoan(null)} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Card className="p-3">
        <p className="text-sm font-bold text-slate-500">Contact</p>
        <p className="mt-1 text-lg font-black">{contact.name}</p>
        <p className="text-sm text-slate-500">{contact.phone || 'No phone saved'}</p>
        {contact.notes ? <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{contact.notes}</p> : null}
      </Card>

      <section>
        <SectionHeader title="Loans" />
        <div className="space-y-2">
          {loans.length ? (
            loans.map((loan) => {
              const remaining = getLoanRemaining(loan, payments);
              const status = getDerivedLoanStatus(loan, payments);
              return (
                <Card key={loan.id} className="p-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-bold">{loan.direction === 'lent' ? 'I lent' : 'I borrowed'}</p>
                      <p className="text-xs text-slate-500">{formatFullDate(loan.date)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black">{formatMoney(remaining, preferences.currency)}</p>
                      <Badge tone={status === 'overdue' ? 'danger' : status === 'settled' ? 'good' : 'warn'}>{status}</Badge>
                    </div>
                  </div>
                  {status !== 'settled' ? (
                    <div className="mt-3">
                      <Button variant="ghost" className="min-h-9 w-full px-2" icon={<RotateCcw size={16} />} onClick={() => setRepayingLoan(loan)}>
                        Record Repayment
                      </Button>
                    </div>
                  ) : null}
                </Card>
              );
            })
          ) : (
            <p className="text-sm text-slate-500">No loan records.</p>
          )}
        </div>
      </section>

      <section>
        <SectionHeader title="Items" />
        <div className="space-y-2">
          {items.length ? (
            items.map((item) => {
              const status = getDerivedItemStatus(item);
              return (
                <Card key={item.id} className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold">{item.itemName}</p>
                      <p className="text-xs text-slate-500">
                        {item.direction === 'lent' ? 'Lent' : 'Borrowed'} · due {formatShortDate(item.dueDate)}
                      </p>
                    </div>
                    <Badge tone={status === 'overdue' ? 'danger' : status === 'returned' ? 'good' : 'warn'}>{status}</Badge>
                  </div>
                  {item.status === 'active' ? (
                    <div className="mt-3">
                      <Button variant="ghost" className="min-h-9 w-full px-2" icon={<Check size={16} />} onClick={() => void markItemReturned(item.id)}>
                        Mark Returned
                      </Button>
                    </div>
                  ) : null}
                </Card>
              );
            })
          ) : (
            <p className="text-sm text-slate-500">No borrowed or lent items.</p>
          )}
        </div>
      </section>

      <section>
        <SectionHeader title="Recent Activity" />
        <div className="space-y-2">
          {activities.length ? (
            activities.slice(0, 6).map((activity) => (
              <Card key={activity.id} className="p-3">
                <p className="font-bold">{activity.title}</p>
                <p className="text-sm text-slate-500">{activity.detail}</p>
              </Card>
            ))
          ) : (
            <p className="text-sm text-slate-500">No recent activity involving this person.</p>
          )}
        </div>
      </section>
    </div>
  );
}
