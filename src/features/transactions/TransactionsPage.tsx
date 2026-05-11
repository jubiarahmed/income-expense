import { useMemo, useState } from 'react';
import { format, parseISO, subDays } from 'date-fns';
import { ArrowLeftRight, ArrowUpRight, Copy, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { Button } from '../../components/ui/Button';
import { Card, SectionHeader } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { Field, SelectInput, TextInput } from '../../components/ui/Form';
import { PullToRefresh } from '../../components/ui/PullToRefresh';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { SwipeRow } from '../../components/ui/SwipeRow';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../../domain/constants';
import { getExpenseCategoryStyle, getIncomeCategoryStyle } from '../../domain/categoryIcons';
import {
  CURRENT_USER_ID,
  type Expense,
  type ExpenseCategory,
  type Income,
  type IncomeCategory,
  type SharedExpense,
  type Transfer,
} from '../../domain/models';
import { clsx } from 'clsx';
import { getExpenseTotals, getIncomeTotals, getSharedBalances } from '../../lib/calculations';
import { formatFullDate } from '../../lib/date';
import { formatMoney } from '../../lib/money';
import { useFinanceStore } from '../../state/useFinanceStore';
import { useToastStore } from '../../state/useToastStore';
import { useUiStore } from '../../state/useUiStore';
import { ExpenseForm } from './ExpenseForm';
import { IncomeForm } from './IncomeForm';
import { TransferForm } from './TransferForm';
import { SharedExpenseForm } from './SharedExpenseForm';
import { SharedGroupForm } from './SharedGroupForm';
import { AdvancedSearchPanel } from './AdvancedSearchPanel';
import type { SavedFilterQuery, SavedFilterScope } from '../../domain/models';

type TransactionMode = 'expense' | 'income' | 'transfer' | 'shared';

function dateLabel(dateStr: string): string {
  const today = format(new Date(), 'yyyy-MM-dd');
  if (dateStr === today) return 'Today';
  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
  if (dateStr === yesterday) return 'Yesterday';
  return format(parseISO(dateStr), 'MMMM d');
}

export function TransactionsPage() {
  const reload = useFinanceStore((state) => state.reload);
  const expenses = useFinanceStore((state) => state.expenses);
  const incomes = useFinanceStore((state) => state.incomes);
  const transfers = useFinanceStore((state) => state.transfers);
  const [mode, setMode] = useState<TransactionMode>('expense');
  const [search, setSearch] = useState('');
  const [filterQuery, setFilterQuery] = useState<SavedFilterQuery>({});
  const [filterScope, setFilterScope] = useState<SavedFilterScope>('all');
  const trimmed = search.trim();
  const hasStructuredFilters = Object.values(filterQuery).some(
    (value) => value != null && !(Array.isArray(value) && value.length === 0) && value !== '',
  );
  const searching = trimmed.length > 0 || hasStructuredFilters || filterScope !== 'all';

  function clearAll() {
    setSearch('');
    setFilterQuery({});
    setFilterScope('all');
  }

  return (
    <PullToRefresh onRefresh={reload}>
      <div className="space-y-5">
        <SearchBar value={search} onChange={setSearch} />
        <AdvancedSearchPanel
          query={filterQuery}
          scope={filterScope}
          expenses={expenses}
          incomes={incomes}
          transfers={transfers}
          onChange={setFilterQuery}
          onScopeChange={setFilterScope}
          onClear={clearAll}
        />
        {searching ? (
          <UnifiedSearchResults
            query={trimmed}
            filter={filterQuery}
            scope={filterScope}
            onClear={clearAll}
          />
        ) : (
          <>
            <SegmentedControl
              value={mode}
              onChange={setMode}
              tone={mode === 'income' ? 'income' : mode === 'transfer' ? 'transfer' : 'expense'}
              options={[
                { label: 'Expense', value: 'expense' },
                { label: 'Income', value: 'income' },
                { label: 'Transfer', value: 'transfer' },
                { label: 'Shared', value: 'shared' },
              ]}
            />
            {mode === 'expense' ? <DailyExpensesPanel /> : null}
            {mode === 'income' ? <IncomePanel /> : null}
            {mode === 'transfer' ? <TransferPanel /> : null}
            {mode === 'shared' ? <SharedExpensesPanel /> : null}
          </>
        )}
      </div>
    </PullToRefresh>
  );
}

function SearchBar({ value, onChange }: { value: string; onChange: (next: string) => void }) {
  return (
    <div className="relative">
      <Search
        size={18}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
      />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search all records (income, expense, transfer)…"
        className={clsx(
          'min-h-12 w-full rounded-xl border border-zinc-200 bg-white pl-10 pr-10 text-base outline-none transition placeholder:text-zinc-400',
          'focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50',
        )}
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-zinc-100 text-zinc-600 active:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"
        >
          <X size={14} />
        </button>
      ) : null}
    </div>
  );
}

type UnifiedHit =
  | { kind: 'expense'; item: Expense }
  | { kind: 'income'; item: Income }
  | { kind: 'transfer'; item: Transfer };

function matchesQuery(haystacks: (string | number | undefined)[], q: string) {
  const needle = q.toLowerCase();
  return haystacks.some((value) => {
    if (value == null) return false;
    return String(value).toLowerCase().includes(needle);
  });
}

function UnifiedSearchResults({
  query,
  filter,
  scope,
  onClear,
}: {
  query: string;
  filter: SavedFilterQuery;
  scope: SavedFilterScope;
  onClear: () => void;
}) {
  const { expenses, incomes, transfers, preferences } = useFinanceStore();
  const pushToast = useToastStore((state) => state.push);
  const deleteExpense = useFinanceStore((state) => state.deleteExpense);
  const addExpense = useFinanceStore((state) => state.addExpense);
  const deleteIncome = useFinanceStore((state) => state.deleteIncome);
  const addIncome = useFinanceStore((state) => state.addIncome);
  const deleteTransfer = useFinanceStore((state) => state.deleteTransfer);
  const addTransfer = useFinanceStore((state) => state.addTransfer);
  const [editingExpense, setEditingExpense] = useState<Expense | undefined>();
  const [editingIncome, setEditingIncome] = useState<Income | undefined>();
  const [editingTransfer, setEditingTransfer] = useState<Transfer | undefined>();

  const hits = useMemo<UnifiedHit[]>(() => {
    const list: UnifiedHit[] = [];
    const wantExpense = scope === 'all' || scope === 'expense';
    const wantIncome = scope === 'all' || scope === 'income';
    const wantTransfer = scope === 'all' || scope === 'transfer';

    function passesAmount(amount: number) {
      if (filter.minAmount != null && amount < filter.minAmount) return false;
      if (filter.maxAmount != null && amount > filter.maxAmount) return false;
      return true;
    }
    function passesDate(date: string) {
      if (filter.startDate && date < filter.startDate) return false;
      if (filter.endDate && date > filter.endDate) return false;
      return true;
    }

    if (wantExpense) {
      for (const expense of expenses) {
        if (!passesAmount(expense.amount)) continue;
        if (!passesDate(expense.date)) continue;
        if (filter.categories?.length && !filter.categories.includes(expense.category)) continue;
        if (filter.paymentMethods?.length && !filter.paymentMethods.includes(expense.paymentMethod)) continue;
        if (filter.tag && !expense.tags.includes(filter.tag)) continue;
        if (filter.merchant && expense.merchant !== filter.merchant) continue;
        if (filter.hasReceipt === true && !expense.receiptImage) continue;
        if (filter.hasReceipt === false && expense.receiptImage) continue;
        if (query && !matchesQuery([expense.note, expense.merchant, expense.category, expense.paymentMethod, expense.amount, expense.tags?.join(' ')], query)) {
          continue;
        }
        list.push({ kind: 'expense', item: expense });
      }
    }
    if (wantIncome) {
      for (const income of incomes) {
        if (!passesAmount(income.amount)) continue;
        if (!passesDate(income.date)) continue;
        if (filter.categories?.length && !filter.categories.includes(income.category)) continue;
        if (filter.paymentMethods?.length && !filter.paymentMethods.includes(income.paymentMethod)) continue;
        if (filter.tag) continue; // incomes don't have tags
        if (filter.merchant) continue; // incomes don't have merchants
        if (filter.hasReceipt != null) continue; // incomes don't have receipts
        if (query && !matchesQuery([income.note, income.source, income.category, income.paymentMethod, income.amount], query)) {
          continue;
        }
        list.push({ kind: 'income', item: income });
      }
    }
    if (wantTransfer) {
      for (const transfer of transfers) {
        if (!passesAmount(transfer.amount)) continue;
        if (!passesDate(transfer.date)) continue;
        if (filter.categories?.length) continue; // transfers don't carry a category
        if (
          filter.paymentMethods?.length &&
          !filter.paymentMethods.includes(transfer.fromMethod) &&
          !filter.paymentMethods.includes(transfer.toMethod)
        ) {
          continue;
        }
        if (filter.tag || filter.merchant || filter.hasReceipt != null) continue;
        if (query && !matchesQuery([transfer.note, transfer.fromMethod, transfer.toMethod, transfer.amount, transfer.fee], query)) {
          continue;
        }
        list.push({ kind: 'transfer', item: transfer });
      }
    }
    return list.sort((a, b) => b.item.date.localeCompare(a.item.date));
  }, [expenses, incomes, transfers, query, filter, scope]);

  async function handleDeleteExpense(expense: Expense) {
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
        action: { label: 'Undo', onClick: () => addExpense(captured) },
      });
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Could not delete.', { tone: 'danger' });
    }
  }
  async function handleDeleteIncome(income: Income) {
    const captured = {
      amount: income.amount,
      category: income.category,
      source: income.source,
      note: income.note,
      date: income.date,
      paymentMethod: income.paymentMethod,
    };
    try {
      await deleteIncome(income.id);
      pushToast('Income deleted.', {
        action: { label: 'Undo', onClick: () => addIncome(captured) },
      });
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Could not delete.', { tone: 'danger' });
    }
  }
  async function handleDeleteTransfer(transfer: Transfer) {
    const captured = {
      amount: transfer.amount,
      fromMethod: transfer.fromMethod,
      toMethod: transfer.toMethod,
      fee: transfer.fee,
      date: transfer.date,
      note: transfer.note,
    };
    try {
      await deleteTransfer(transfer.id);
      pushToast('Transfer deleted.', {
        action: { label: 'Undo', onClick: () => addTransfer(captured) },
      });
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Could not delete.', { tone: 'danger' });
    }
  }

  const totalAmount = useMemo(() => {
    let total = 0;
    for (const hit of hits) {
      if (hit.kind === 'expense') total -= hit.item.amount;
      else if (hit.kind === 'income') total += hit.item.amount;
    }
    return total;
  }, [hits]);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold tracking-tight text-zinc-700 dark:text-zinc-200">
            {hits.length} result{hits.length === 1 ? '' : 's'}
            {query ? ` for "${query}"` : ''}
          </p>
          {hits.length ? (
            <p className="text-xs text-zinc-500">
              Net {totalAmount < 0 ? '−' : '+'}
              {formatMoney(Math.abs(totalAmount), preferences.currency)} (excluding transfers)
            </p>
          ) : null}
        </div>
        <Button variant="ghost" className="min-h-9 px-3" onClick={onClear}>
          Clear
        </Button>
      </div>

      {hits.length ? (
        <div className="space-y-2">
          {hits.map((hit) => {
            if (hit.kind === 'expense') {
              const style = getExpenseCategoryStyle(hit.item.category);
              const Icon = style.icon;
              return (
                <Card key={`e-${hit.item.id}`} className="p-3">
                  <div className="flex items-start gap-3">
                    <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${style.bg} ${style.fg}`}>
                      <Icon size={20} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <Badge tone="danger">Expense</Badge>
                        <p className="truncate text-sm font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
                          {hit.item.note || hit.item.category}
                        </p>
                      </div>
                      <p className="mt-0.5 text-xs text-zinc-500">
                        {hit.item.category} · {hit.item.paymentMethod} · {formatFullDate(hit.item.date)}
                      </p>
                    </div>
                    <p className="shrink-0 font-black tabular-nums text-rose-600 dark:text-rose-400">
                      −{formatMoney(hit.item.amount, preferences.currency)}
                    </p>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <Button variant="ghost" className="min-h-9 flex-1 px-2" icon={<Pencil size={16} />} onClick={() => setEditingExpense(hit.item)}>
                      Edit
                    </Button>
                    <Button variant="ghost" className="min-h-9 px-3 text-rose-600" icon={<Trash2 size={16} />} onClick={() => void handleDeleteExpense(hit.item)}>
                      Delete
                    </Button>
                  </div>
                </Card>
              );
            }
            if (hit.kind === 'income') {
              const style = getIncomeCategoryStyle(hit.item.category);
              const Icon = style.icon;
              return (
                <Card key={`i-${hit.item.id}`} className="p-3">
                  <div className="flex items-start gap-3">
                    <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${style.bg} ${style.fg}`}>
                      <Icon size={20} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <Badge tone="good">Income</Badge>
                        <p className="truncate text-sm font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
                          {hit.item.source || hit.item.note || hit.item.category}
                        </p>
                      </div>
                      <p className="mt-0.5 text-xs text-zinc-500">
                        {hit.item.category} · {hit.item.paymentMethod} · {formatFullDate(hit.item.date)}
                      </p>
                    </div>
                    <p className="shrink-0 font-black tabular-nums text-emerald-600 dark:text-emerald-400">
                      +{formatMoney(hit.item.amount, preferences.currency)}
                    </p>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <Button variant="ghost" className="min-h-9 flex-1 px-2" icon={<Pencil size={16} />} onClick={() => setEditingIncome(hit.item)}>
                      Edit
                    </Button>
                    <Button variant="ghost" className="min-h-9 px-3 text-rose-600" icon={<Trash2 size={16} />} onClick={() => void handleDeleteIncome(hit.item)}>
                      Delete
                    </Button>
                  </div>
                </Card>
              );
            }
            return (
              <Card key={`t-${hit.item.id}`} className="p-3">
                <div className="flex items-start gap-3">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                    <ArrowLeftRight size={20} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <Badge tone="info">Transfer</Badge>
                      <p className="truncate text-sm font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
                        {hit.item.fromMethod} → {hit.item.toMethod}
                      </p>
                    </div>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {hit.item.note || formatFullDate(hit.item.date)}
                      {hit.item.fee > 0 ? ` · fee ${formatMoney(hit.item.fee, preferences.currency)}` : ''}
                    </p>
                  </div>
                  <p className="shrink-0 font-black tabular-nums text-sky-700 dark:text-sky-300">
                    {formatMoney(hit.item.amount, preferences.currency)}
                  </p>
                </div>
                <div className="mt-2 flex gap-2">
                  <Button variant="ghost" className="min-h-9 flex-1 px-2" icon={<Pencil size={16} />} onClick={() => setEditingTransfer(hit.item)}>
                    Edit
                  </Button>
                  <Button variant="ghost" className="min-h-9 px-3 text-rose-600" icon={<Trash2 size={16} />} onClick={() => void handleDeleteTransfer(hit.item)}>
                    Delete
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title="No matches"
          body="Try a different note, category, source, amount, or payment method."
          icon={<Search size={22} />}
        />
      )}

      <BottomSheet open={Boolean(editingExpense)} title="Edit Expense" onClose={() => setEditingExpense(undefined)}>
        {editingExpense ? <ExpenseForm expense={editingExpense} onDone={() => setEditingExpense(undefined)} /> : null}
      </BottomSheet>
      <BottomSheet open={Boolean(editingIncome)} title="Edit Income" onClose={() => setEditingIncome(undefined)}>
        {editingIncome ? <IncomeForm income={editingIncome} onDone={() => setEditingIncome(undefined)} /> : null}
      </BottomSheet>
      <BottomSheet open={Boolean(editingTransfer)} title="Edit Transfer" onClose={() => setEditingTransfer(undefined)}>
        {editingTransfer ? <TransferForm transfer={editingTransfer} onDone={() => setEditingTransfer(undefined)} /> : null}
      </BottomSheet>
    </section>
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
          <p className="text-[0.7rem] font-bold uppercase tracking-wide text-zinc-500">{hasFilter ? 'Filtered · today' : 'Today'}</p>
          <p className="mt-1 text-lg font-black tabular-nums">{formatMoney(displayedToday, preferences.currency)}</p>
        </Card>
        <Card className="p-3">
          <p className="text-[0.7rem] font-bold uppercase tracking-wide text-zinc-500">{hasFilter ? 'Filtered total' : 'This month'}</p>
          <p className="mt-1 text-lg font-black tabular-nums">{formatMoney(displayedMonth, preferences.currency)}</p>
        </Card>
      </div>

      <Card className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="From">
            <TextInput
              type="date"
              value={startDate}
              max={endDate || undefined}
              onChange={(event) => setStartDate(event.target.value)}
            />
          </Field>
          <Field label="To">
            <TextInput
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={(event) => {
                const next = event.target.value;
                if (startDate && next && next < startDate) return;
                setEndDate(next);
              }}
            />
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
          <Button variant="danger" className="min-h-9 px-3" icon={<Plus size={16} />} onClick={() => openAddFlow('expense')}>
            Add
          </Button>
        }
      />

      <p className="-mt-2 px-1 text-xs text-zinc-500">Swipe a row left to delete · undo is available.</p>

      <div className="space-y-4">
        {grouped.length ? (
          grouped.map(([dateStr, groupExpenses]) => (
            <div key={dateStr} className="space-y-2">
              <p className="px-1 text-[0.7rem] font-bold uppercase tracking-wide text-zinc-500">{dateLabel(dateStr)}</p>
              {groupExpenses.map((expense) => {
                const style = getExpenseCategoryStyle(expense.category);
                const Icon = style.icon;
                return (
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
                              className="h-12 w-12 rounded-xl object-cover ring-1 ring-zinc-200 dark:ring-zinc-800"
                            />
                          </button>
                        ) : (
                          <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${style.bg} ${style.fg}`}>
                            <Icon size={20} />
                          </span>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-bold tracking-tight text-zinc-950 dark:text-zinc-50">{expense.note || expense.category}</p>
                          <p className="mt-0.5 text-xs text-zinc-500">
                            {expense.category} · {expense.paymentMethod} · {formatFullDate(expense.date)}
                          </p>
                        </div>
                        <p className="shrink-0 font-black tabular-nums text-rose-600 dark:text-rose-400">
                          −{formatMoney(expense.amount, preferences.currency)}
                        </p>
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
                );
              })}
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

function IncomePanel() {
  const { incomes, preferences, deleteIncome, addIncome } = useFinanceStore();
  const pushToast = useToastStore((state) => state.push);
  const openAddFlow = useUiStore((state) => state.openAddFlow);
  const [editing, setEditing] = useState<Income | undefined>();
  const [category, setCategory] = useState<IncomeCategory | 'All'>('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const totals = getIncomeTotals(incomes);

  const filtered = useMemo(
    () =>
      incomes.filter((income) => {
        const categoryMatch = category === 'All' || income.category === category;
        const startMatch = !startDate || income.date >= startDate;
        const endMatch = !endDate || income.date <= endDate;
        return categoryMatch && startMatch && endMatch;
      }),
    [category, endDate, incomes, startDate],
  );

  const hasFilter = category !== 'All' || Boolean(startDate) || Boolean(endDate);
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const displayedToday = hasFilter
    ? filtered.filter((i) => i.date === todayStr).reduce((sum, i) => sum + i.amount, 0)
    : totals.today;
  const displayedMonth = hasFilter ? filtered.reduce((sum, i) => sum + i.amount, 0) : totals.month;

  const grouped = useMemo(() => {
    const map = new Map<string, Income[]>();
    const sorted = [...filtered].sort((a, b) => b.date.localeCompare(a.date));
    for (const income of sorted) {
      if (!map.has(income.date)) map.set(income.date, []);
      map.get(income.date)!.push(income);
    }
    return [...map.entries()];
  }, [filtered]);

  async function handleDelete(income: Income) {
    const captured = {
      amount: income.amount,
      category: income.category,
      source: income.source,
      note: income.note,
      date: income.date,
      paymentMethod: income.paymentMethod,
    };
    try {
      await deleteIncome(income.id);
      pushToast('Income deleted.', {
        action: {
          label: 'Undo',
          onClick: async () => {
            try {
              await addIncome(captured);
            } catch (err) {
              pushToast(err instanceof Error ? err.message : 'Could not undo.', { tone: 'danger' });
            }
          },
        },
      });
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Could not delete income.', { tone: 'danger' });
    }
  }

  return (
    <section className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-3">
          <p className="text-[0.7rem] font-bold uppercase tracking-wide text-zinc-500">{hasFilter ? 'Filtered · today' : 'Today'}</p>
          <p className="mt-1 text-lg font-black tabular-nums text-emerald-700 dark:text-emerald-400">
            {formatMoney(displayedToday, preferences.currency)}
          </p>
        </Card>
        <Card className="p-3">
          <p className="text-[0.7rem] font-bold uppercase tracking-wide text-zinc-500">{hasFilter ? 'Filtered total' : 'This month'}</p>
          <p className="mt-1 text-lg font-black tabular-nums text-emerald-700 dark:text-emerald-400">
            {formatMoney(displayedMonth, preferences.currency)}
          </p>
        </Card>
      </div>

      <Card className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="From">
            <TextInput
              type="date"
              value={startDate}
              max={endDate || undefined}
              onChange={(event) => setStartDate(event.target.value)}
            />
          </Field>
          <Field label="To">
            <TextInput
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={(event) => {
                const next = event.target.value;
                if (startDate && next && next < startDate) return;
                setEndDate(next);
              }}
            />
          </Field>
        </div>
        <Field label="Category">
          <SelectInput value={category} onChange={(event) => setCategory(event.target.value as IncomeCategory | 'All')}>
            <option value="All">All categories</option>
            {INCOME_CATEGORIES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </SelectInput>
        </Field>
      </Card>

      <SectionHeader
        title="Income"
        action={
          <Button variant="income" className="min-h-9 px-3" icon={<Plus size={16} />} onClick={() => openAddFlow('income')}>
            Add
          </Button>
        }
      />

      <p className="-mt-2 px-1 text-xs text-zinc-500">Swipe a row left to delete · undo is available.</p>

      <div className="space-y-4">
        {grouped.length ? (
          grouped.map(([dateStr, groupIncomes]) => (
            <div key={dateStr} className="space-y-2">
              <p className="px-1 text-[0.7rem] font-bold uppercase tracking-wide text-zinc-500">{dateLabel(dateStr)}</p>
              {groupIncomes.map((income) => {
                const style = getIncomeCategoryStyle(income.category);
                const Icon = style.icon;
                return (
                  <SwipeRow key={income.id} onDelete={() => void handleDelete(income)}>
                    <Card className="p-3">
                      <div className="flex items-start gap-3">
                        <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${style.bg} ${style.fg}`}>
                          <Icon size={20} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
                            {income.source || income.note || income.category}
                          </p>
                          <p className="mt-0.5 text-xs text-zinc-500">
                            {income.category} · {income.paymentMethod} · {formatFullDate(income.date)}
                          </p>
                        </div>
                        <p className="shrink-0 font-black tabular-nums text-emerald-600 dark:text-emerald-400">
                          +{formatMoney(income.amount, preferences.currency)}
                        </p>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <Button variant="ghost" className="min-h-9 flex-1 px-2" icon={<Pencil size={16} />} onClick={() => setEditing(income)}>
                          Edit
                        </Button>
                        <Button variant="ghost" className="min-h-9 px-3 text-rose-600" icon={<Trash2 size={16} />} onClick={() => void handleDelete(income)}>
                          Delete
                        </Button>
                      </div>
                    </Card>
                  </SwipeRow>
                );
              })}
            </div>
          ))
        ) : (
          <EmptyState
            title="No income recorded"
            body="Tap +Income to log salary, freelance work, refunds, gifts, or any incoming money."
            icon={<ArrowUpRight size={28} />}
          />
        )}
      </div>

      <BottomSheet open={Boolean(editing)} title="Edit Income" onClose={() => setEditing(undefined)}>
        {editing ? <IncomeForm income={editing} onDone={() => setEditing(undefined)} /> : null}
      </BottomSheet>
    </section>
  );
}

function TransferPanel() {
  const { transfers, preferences, deleteTransfer, addTransfer } = useFinanceStore();
  const pushToast = useToastStore((state) => state.push);
  const openAddFlow = useUiStore((state) => state.openAddFlow);
  const [editing, setEditing] = useState<Transfer | undefined>();

  const grouped = useMemo(() => {
    const map = new Map<string, Transfer[]>();
    const sorted = [...transfers].sort((a, b) => b.date.localeCompare(a.date));
    for (const transfer of sorted) {
      if (!map.has(transfer.date)) map.set(transfer.date, []);
      map.get(transfer.date)!.push(transfer);
    }
    return [...map.entries()];
  }, [transfers]);

  async function handleDelete(transfer: Transfer) {
    const captured = {
      amount: transfer.amount,
      fromMethod: transfer.fromMethod,
      toMethod: transfer.toMethod,
      fee: transfer.fee,
      date: transfer.date,
      note: transfer.note,
    };
    try {
      await deleteTransfer(transfer.id);
      pushToast('Transfer deleted.', {
        action: {
          label: 'Undo',
          onClick: async () => {
            try {
              await addTransfer(captured);
            } catch (err) {
              pushToast(err instanceof Error ? err.message : 'Could not undo.', { tone: 'danger' });
            }
          },
        },
      });
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Could not delete transfer.', { tone: 'danger' });
    }
  }

  const monthTotal = useMemo(() => {
    const monthKey = format(new Date(), 'yyyy-MM');
    return transfers
      .filter((transfer) => transfer.date.startsWith(monthKey))
      .reduce((sum, transfer) => sum + transfer.amount, 0);
  }, [transfers]);
  const feesTotal = useMemo(() => {
    const monthKey = format(new Date(), 'yyyy-MM');
    return transfers
      .filter((transfer) => transfer.date.startsWith(monthKey))
      .reduce((sum, transfer) => sum + transfer.fee, 0);
  }, [transfers]);

  return (
    <section className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-3">
          <p className="text-[0.7rem] font-bold uppercase tracking-wide text-zinc-500">Moved this month</p>
          <p className="mt-1 text-lg font-black tabular-nums text-sky-700 dark:text-sky-300">{formatMoney(monthTotal, preferences.currency)}</p>
        </Card>
        <Card className="p-3">
          <p className="text-[0.7rem] font-bold uppercase tracking-wide text-zinc-500">Fees paid</p>
          <p className="mt-1 text-lg font-black tabular-nums text-zinc-700 dark:text-zinc-200">{formatMoney(feesTotal, preferences.currency)}</p>
        </Card>
      </div>

      <SectionHeader
        title="Transfers"
        action={
          <Button variant="transfer" className="min-h-9 px-3" icon={<Plus size={16} />} onClick={() => openAddFlow('transfer')}>
            Add
          </Button>
        }
      />

      <p className="-mt-2 px-1 text-xs text-zinc-500">Swipe a row left to delete · undo is available.</p>

      <div className="space-y-4">
        {grouped.length ? (
          grouped.map(([dateStr, groupTransfers]) => (
            <div key={dateStr} className="space-y-2">
              <p className="px-1 text-[0.7rem] font-bold uppercase tracking-wide text-zinc-500">{dateLabel(dateStr)}</p>
              {groupTransfers.map((transfer) => (
                <SwipeRow key={transfer.id} onDelete={() => void handleDelete(transfer)}>
                  <Card className="p-3">
                    <div className="flex items-start gap-3">
                      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                        <ArrowLeftRight size={20} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
                          {transfer.fromMethod} → {transfer.toMethod}
                        </p>
                        <p className="mt-0.5 text-xs text-zinc-500">
                          {formatFullDate(transfer.date)}
                          {transfer.note ? ` · ${transfer.note}` : ''}
                          {transfer.fee > 0 ? ` · fee ${formatMoney(transfer.fee, preferences.currency)}` : ''}
                        </p>
                      </div>
                      <p className="shrink-0 font-black tabular-nums text-sky-700 dark:text-sky-300">
                        {formatMoney(transfer.amount, preferences.currency)}
                      </p>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button variant="ghost" className="min-h-9 flex-1 px-2" icon={<Pencil size={16} />} onClick={() => setEditing(transfer)}>
                        Edit
                      </Button>
                      <Button variant="ghost" className="min-h-9 px-3 text-rose-600" icon={<Trash2 size={16} />} onClick={() => void handleDelete(transfer)}>
                        Delete
                      </Button>
                    </div>
                  </Card>
                </SwipeRow>
              ))}
            </div>
          ))
        ) : (
          <EmptyState
            title="No transfers yet"
            body="Record movements between Cash, bKash, Nagad, Card, and Bank to keep balances accurate."
            icon={<ArrowLeftRight size={28} />}
          />
        )}
      </div>

      <BottomSheet open={Boolean(editing)} title="Edit Transfer" onClose={() => setEditing(undefined)}>
        {editing ? <TransferForm transfer={editing} onDone={() => setEditing(undefined)} /> : null}
      </BottomSheet>
    </section>
  );
}

function ReceiptViewer({ image, onClose }: { image: string | null; onClose: () => void }) {
  if (!image) return null;
  return (
    <div className="fixed inset-0 z-[55] grid place-items-center bg-zinc-950/90 p-4" role="dialog" aria-modal="true">
      <button className="absolute inset-0 cursor-default" aria-label="Close receipt" onClick={onClose} />
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white text-zinc-900"
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
                    <p className="font-bold text-zinc-950 dark:text-zinc-50">{group.name}</p>
                    <p className="text-xs text-zinc-500">
                      {group.participantIds.length + 1} people · {formatMoney(total, preferences.currency)}
                    </p>
                  </div>
                  <Badge tone={groupExpenses.some((expense) => !expense.settled) ? 'warn' : 'good'}>
                    {groupExpenses.filter((expense) => !expense.settled).length} open
                  </Badge>
                </div>
                {confirmDeleteGroupId === group.id ? (
                  <div className="mt-3 flex items-center gap-2">
                    <p className="flex-1 text-sm font-semibold text-zinc-700 dark:text-zinc-300">Delete this group?</p>
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
        <p className="text-sm font-bold text-zinc-700 dark:text-zinc-200">Settlement snapshot</p>
        <div className="mt-3 space-y-2">
          {[...balances.entries()].length ? (
            [...balances.entries()].map(([contactId, balance]) => (
              <div key={contactId} className="flex items-center justify-between rounded-xl bg-zinc-50 p-3 dark:bg-zinc-900">
                <span className="font-semibold">{displayName(contactId)}</span>
                <span className={balance >= 0 ? 'font-black text-emerald-700' : 'font-black text-rose-600'}>
                  {balance >= 0 ? 'owes me ' : 'I owe '}
                  {formatMoney(Math.abs(balance), preferences.currency)}
                </span>
              </div>
            ))
          ) : (
            <p className="text-sm text-zinc-500">No unsettled shared balances.</p>
          )}
        </div>
      </Card>

      <p className="-mt-2 px-1 text-xs text-zinc-500">Swipe a row left to delete · undo is available.</p>

      <div className="space-y-2">
        {sharedExpenses.length ? (
          sharedExpenses.map((expense) => (
            <SwipeRow key={expense.id} onDelete={() => void handleDelete(expense)}>
              <Card className="p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold">{expense.note}</p>
                    <p className="text-xs text-zinc-500">
                      {formatFullDate(expense.date)} · {sharedGroups.find((group) => group.id === expense.groupId)?.name ?? 'Group'} · paid by {displayName(expense.payerId)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-black tabular-nums">{formatMoney(expense.amount, preferences.currency)}</p>
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
