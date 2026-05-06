import { useMemo, useState } from 'react';
import { format, parseISO, subDays } from 'date-fns';
import { Copy, Pencil, Plus, Trash2, X } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { Button } from '../../components/ui/Button';
import { Card, SectionHeader } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { Field, SelectInput, TextInput } from '../../components/ui/Form';
import { PullToRefresh } from '../../components/ui/PullToRefresh';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { SwipeRow } from '../../components/ui/SwipeRow';
import { EXPENSE_CATEGORIES } from '../../domain/constants';
import { CURRENT_USER_ID, type Expense, type ExpenseCategory, type SharedExpense } from '../../domain/models';
import { getExpenseTotals, getSharedBalances } from '../../lib/calculations';
import { formatFullDate } from '../../lib/date';
import { formatMoney } from '../../lib/money';
import { useFinanceStore } from '../../state/useFinanceStore';
import { useToastStore } from '../../state/useToastStore';
import { useUiStore } from '../../state/useUiStore';
import { ExpenseForm } from './ExpenseForm';
import { SharedExpenseForm } from './SharedExpenseForm';
import { SharedGroupForm } from './SharedGroupForm';

type TransactionMode = 'daily' | 'shared';

function dateLabel(dateStr: string): string {
  const today = format(new Date(), 'yyyy-MM-dd');
  if (dateStr === today) return 'Today';
  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
  if (dateStr === yesterday) return 'Yesterday';
  return format(parseISO(dateStr), 'MMMM d');
}

export function TransactionsPage() {
  const reload = useFinanceStore((state) => state.reload);
  const [mode, setMode] = useState<TransactionMode>('daily');

  return (
    <PullToRefresh onRefresh={reload}>
      <div className="space-y-5">
        <SegmentedControl
          value={mode}
          onChange={setMode}
          options={[
            { label: 'Daily', value: 'daily' },
            { label: 'Shared', value: 'shared' },
          ]}
        />
        {mode === 'daily' ? <DailyExpensesPanel /> : <SharedExpensesPanel />}
      </div>
    </PullToRefresh>
  );
}

function DailyExpensesPanel() {
  const { expenses, preferences, deleteExpense, addExpense, duplicateExpense } = useFinanceStore();
  const pushToast = useToastStore((state) => state.push);
  const openAddFlow = useUiStore((state) => state.openAddFlow);
  const [editing, setEditing] = useState<Expense | undefined>();
  const [category, setCategory] = useState<ExpenseCategory | 'All'>('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [viewingReceipt, setViewingReceipt] = useState<string | null>(null);
  const totals = getExpenseTotals(expenses);

  const filtered = useMemo(
    () =>
      expenses.filter((expense) => {
        const categoryMatch = category === 'All' || expense.category === category;
        const startMatch = !startDate || expense.date >= startDate;
        const endMatch = !endDate || expense.date <= endDate;
        return categoryMatch && startMatch && endMatch;
      }),
    [category, endDate, expenses, startDate],
  );

  const hasFilter = category !== 'All' || Boolean(startDate) || Boolean(endDate);
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const displayedToday = hasFilter
    ? filtered.filter((e) => e.date === todayStr).reduce((sum, e) => sum + e.amount, 0)
    : totals.today;
  const displayedMonth = hasFilter ? filtered.reduce((sum, e) => sum + e.amount, 0) : totals.month;

  const grouped = useMemo(() => {
    const map = new Map<string, Expense[]>();
    const sorted = [...filtered].sort((a, b) => b.date.localeCompare(a.date));
    for (const expense of sorted) {
      if (!map.has(expense.date)) map.set(expense.date, []);
      map.get(expense.date)!.push(expense);
    }
    return [...map.entries()];
  }, [filtered]);

  async function handleDelete(expense: Expense) {
    const captured = {
      amount: expense.amount,
      category: expense.category,
      note: expense.note,
      date: expense.date,
      paymentMethod: expense.paymentMethod,
      tags: expense.tags.join(', '),
      receiptImage: expense.receiptImage,
    };
    try {
      await deleteExpense(expense.id);
      pushToast('Expense deleted.', {
        action: {
          label: 'Undo',
          onClick: async () => {
            try {
              await addExpense(captured);
            } catch (err) {
              pushToast(err instanceof Error ? err.message : 'Could not undo.', { tone: 'danger' });
            }
          },
        },
      });
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Could not delete expense.', { tone: 'danger' });
    }
  }

  return (
    <section className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-3">
          <p className="text-xs font-bold text-slate-500">{hasFilter ? 'Filtered · today' : 'Today'}</p>
          <p className="mt-1 text-lg font-black">{formatMoney(displayedToday, preferences.currency)}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs font-bold text-slate-500">{hasFilter ? 'Filtered total' : 'This month'}</p>
          <p className="mt-1 text-lg font-black">{formatMoney(displayedMonth, preferences.currency)}</p>
        </Card>
      </div>

      <Card className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="From">
            <TextInput type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
          </Field>
          <Field label="To">
            <TextInput type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
          </Field>
        </div>
        <Field label="Category">
          <SelectInput value={category} onChange={(event) => setCategory(event.target.value as ExpenseCategory | 'All')}>
            <option value="All">All categories</option>
            {EXPENSE_CATEGORIES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </SelectInput>
        </Field>
      </Card>

      <SectionHeader
        title="Expenses"
        action={
          <Button variant="secondary" className="min-h-9 px-3" icon={<Plus size={16} />} onClick={() => openAddFlow('expense')}>
            Add
          </Button>
        }
      />

      <p className="-mt-2 px-1 text-xs text-slate-500">Swipe a row left to delete · undo is available.</p>

      <div className="space-y-4">
        {grouped.length ? (
          grouped.map(([dateStr, groupExpenses]) => (
            <div key={dateStr} className="space-y-2">
              <p className="px-1 text-xs font-bold text-slate-500">{dateLabel(dateStr)}</p>
              {groupExpenses.map((expense) => (
                <SwipeRow key={expense.id} onDelete={() => void handleDelete(expense)}>
                  <Card className="p-3">
                    <div className="flex items-start gap-3">
                      {expense.receiptImage ? (
                        <button
                          type="button"
                          onClick={() => setViewingReceipt(expense.receiptImage ?? null)}
                          className="shrink-0"
                          aria-label="View receipt"
                        >
                          <img
                            src={expense.receiptImage}
                            alt="Receipt"
                            className="h-14 w-14 rounded-xl object-cover ring-1 ring-slate-200 dark:ring-slate-800"
                          />
                        </button>
                      ) : null}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate font-bold text-slate-950 dark:text-slate-50">{expense.note || expense.category}</p>
                          <Badge tone="info">{expense.category}</Badge>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          {formatFullDate(expense.date)} · {expense.paymentMethod}
                        </p>
                      </div>
                      <p className="shrink-0 font-black">{formatMoney(expense.amount, preferences.currency)}</p>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button variant="ghost" className="min-h-9 flex-1 px-2" icon={<Copy size={16} />} onClick={() => void duplicateExpense(expense.id)}>
                        Duplicate
                      </Button>
                      <Button variant="ghost" className="min-h-9 flex-1 px-2" icon={<Pencil size={16} />} onClick={() => setEditing(expense)}>
                        Edit
                      </Button>
                      <Button variant="ghost" className="min-h-9 px-3 text-rose-600" icon={<Trash2 size={16} />} onClick={() => void handleDelete(expense)}>
                        Delete
                      </Button>
                    </div>
                  </Card>
                </SwipeRow>
              ))}
            </div>
          ))
        ) : (
          <EmptyState title="No expenses found" body="Add daily expenses or loosen the current filters." />
        )}
      </div>

      <BottomSheet open={Boolean(editing)} title="Edit Expense" onClose={() => setEditing(undefined)}>
        {editing ? <ExpenseForm expense={editing} onDone={() => setEditing(undefined)} /> : null}
      </BottomSheet>

      <ReceiptViewer image={viewingReceipt} onClose={() => setViewingReceipt(null)} />
    </section>
  );
}

function ReceiptViewer({ image, onClose }: { image: string | null; onClose: () => void }) {
  if (!image) return null;
  return (
    <div className="fixed inset-0 z-[55] grid place-items-center bg-slate-950/90 p-4" role="dialog" aria-modal="true">
      <button className="absolute inset-0 cursor-default" aria-label="Close receipt" onClick={onClose} />
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white text-slate-900"
        aria-label="Close"
      >
        <X size={20} />
      </button>
      <img src={image} alt="Receipt" className="relative max-h-[88dvh] max-w-full rounded-2xl object-contain" />
    </div>
  );
}

function SharedExpensesPanel() {
  const {
    contacts,
    preferences,
    sharedGroups,
    sharedExpenses,
    toggleSharedExpenseSettled,
    deleteSharedExpense,
    addSharedExpense,
    deleteSharedGroup,
  } = useFinanceStore();
  const pushToast = useToastStore((state) => state.push);
  const openAddFlow = useUiStore((state) => state.openAddFlow);
  const [editing, setEditing] = useState<SharedExpense | undefined>();
  const [editingGroupId, setEditingGroupId] = useState<string | undefined>();
  const [confirmDeleteGroupId, setConfirmDeleteGroupId] = useState<string | null>(null);
  const balances = getSharedBalances(sharedExpenses);

  function displayName(id: string) {
    if (id === CURRENT_USER_ID) return 'Me';
    return contacts.find((contact) => contact.id === id)?.name ?? 'Unknown';
  }

  async function handleDelete(expense: SharedExpense) {
    const captured = {
      groupId: expense.groupId,
      amount: expense.amount,
      note: expense.note,
      date: expense.date,
      payerId: expense.payerId,
      participantIds: expense.participantIds,
      splitType: expense.splitType,
      customShares: Object.fromEntries(expense.shares.map((share) => [share.contactId, share.amount])),
      settled: expense.settled,
    };
    try {
      await deleteSharedExpense(expense.id);
      pushToast('Shared expense deleted.', {
        action: {
          label: 'Undo',
          onClick: async () => {
            try {
              await addSharedExpense(captured);
            } catch (err) {
              pushToast(err instanceof Error ? err.message : 'Could not undo.', { tone: 'danger' });
            }
          },
        },
      });
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Could not delete shared expense.', { tone: 'danger' });
    }
  }

  return (
    <section className="space-y-5">
      <SectionHeader
        title="Groups"
        action={
          <Button variant="secondary" className="min-h-9 px-3" icon={<Plus size={16} />} onClick={() => openAddFlow('sharedGroup')}>
            Group
          </Button>
        }
      />
      <div className="space-y-2">
        {sharedGroups.length ? (
          sharedGroups.map((group) => {
            const groupExpenses = sharedExpenses.filter((expense) => expense.groupId === group.id);
            const total = groupExpenses.reduce((sum, expense) => sum + expense.amount, 0);
            return (
              <Card key={group.id} className="p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-slate-950 dark:text-slate-50">{group.name}</p>
                    <p className="text-xs text-slate-500">
                      {group.participantIds.length + 1} people · {formatMoney(total, preferences.currency)}
                    </p>
                  </div>
                  <Badge tone={groupExpenses.some((expense) => !expense.settled) ? 'warn' : 'good'}>
                    {groupExpenses.filter((expense) => !expense.settled).length} open
                  </Badge>
                </div>
                {confirmDeleteGroupId === group.id ? (
                  <div className="mt-3 flex items-center gap-2">
                    <p className="flex-1 text-sm font-semibold text-slate-700 dark:text-slate-300">Delete this group?</p>
                    <Button variant="ghost" className="min-h-9 px-3" onClick={() => setConfirmDeleteGroupId(null)}>
                      Cancel
                    </Button>
                    <Button
                      variant="ghost"
                      className="min-h-9 px-3 text-rose-600"
                      icon={<Trash2 size={16} />}
                      onClick={() => {
                        void deleteSharedGroup(group.id);
                        setConfirmDeleteGroupId(null);
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                ) : (
                  <div className="mt-3 flex gap-2">
                    <Button variant="ghost" className="min-h-9 flex-1 px-2" onClick={() => setEditingGroupId(group.id)}>
                      Edit
                    </Button>
                    <Button variant="ghost" className="min-h-9 px-3 text-rose-600" icon={<Trash2 size={16} />} onClick={() => setConfirmDeleteGroupId(group.id)}>
                      Delete
                    </Button>
                  </div>
                )}
              </Card>
            );
          })
        ) : (
          <EmptyState title="No shared groups" body="Create groups for lunch, rent, trips, or team snacks." />
        )}
      </div>

      <SectionHeader
        title="Shared Expenses"
        action={
          <Button variant="secondary" className="min-h-9 px-3" icon={<Plus size={16} />} onClick={() => openAddFlow('sharedExpense')}>
            Add
          </Button>
        }
      />

      <Card>
        <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Settlement snapshot</p>
        <div className="mt-3 space-y-2">
          {[...balances.entries()].length ? (
            [...balances.entries()].map(([contactId, balance]) => (
              <div key={contactId} className="flex items-center justify-between rounded-xl bg-slate-50 p-3 dark:bg-slate-900">
                <span className="font-semibold">{displayName(contactId)}</span>
                <span className={balance >= 0 ? 'font-black text-emerald-700' : 'font-black text-rose-600'}>
                  {balance >= 0 ? 'owes me ' : 'I owe '}
                  {formatMoney(Math.abs(balance), preferences.currency)}
                </span>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-500">No unsettled shared balances.</p>
          )}
        </div>
      </Card>

      <p className="-mt-2 px-1 text-xs text-slate-500">Swipe a row left to delete · undo is available.</p>

      <div className="space-y-2">
        {sharedExpenses.length ? (
          sharedExpenses.map((expense) => (
            <SwipeRow key={expense.id} onDelete={() => void handleDelete(expense)}>
              <Card className="p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold">{expense.note}</p>
                    <p className="text-xs text-slate-500">
                      {sharedGroups.find((group) => group.id === expense.groupId)?.name ?? 'Group'} · paid by {displayName(expense.payerId)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-black">{formatMoney(expense.amount, preferences.currency)}</p>
                    <Badge tone={expense.settled ? 'good' : 'warn'}>{expense.settled ? 'Settled' : 'Open'}</Badge>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button variant="ghost" className="min-h-9 flex-1 px-2" onClick={() => void toggleSharedExpenseSettled(expense.id)}>
                    {expense.settled ? 'Reopen' : 'Settle'}
                  </Button>
                  <Button variant="ghost" className="min-h-9 flex-1 px-2" onClick={() => setEditing(expense)}>
                    Edit
                  </Button>
                  <Button variant="ghost" className="min-h-9 px-3 text-rose-600" icon={<Trash2 size={16} />} onClick={() => void handleDelete(expense)}>
                    Delete
                  </Button>
                </div>
              </Card>
            </SwipeRow>
          ))
        ) : (
          <EmptyState title="No shared expenses" body="Add a split to see balances per participant." />
        )}
      </div>

      <BottomSheet open={Boolean(editing)} title="Edit Shared Expense" onClose={() => setEditing(undefined)}>
        {editing ? <SharedExpenseForm sharedExpense={editing} onDone={() => setEditing(undefined)} /> : null}
      </BottomSheet>
      <BottomSheet open={Boolean(editingGroupId)} title="Edit Shared Group" onClose={() => setEditingGroupId(undefined)}>
        {editingGroupId ? (
          <SharedGroupForm group={sharedGroups.find((group) => group.id === editingGroupId)} onDone={() => setEditingGroupId(undefined)} />
        ) : null}
      </BottomSheet>
    </section>
  );
}
