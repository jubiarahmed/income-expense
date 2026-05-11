import { useMemo, useState } from 'react';
import { BookmarkPlus, Filter, Trash2, X } from 'lucide-react';
import { clsx } from 'clsx';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Field, SelectInput, TextInput } from '../../components/ui/Form';
import { PAYMENT_METHODS } from '../../domain/constants';
import { getAllExpenseCategories } from '../../domain/customCategories';
import type {
  Expense,
  Income,
  PaymentMethod,
  SavedFilter,
  SavedFilterQuery,
  SavedFilterScope,
  Transfer,
} from '../../domain/models';
import { useFinanceStore } from '../../state/useFinanceStore';
import { useToastStore } from '../../state/useToastStore';

interface Props {
  query: SavedFilterQuery;
  scope: SavedFilterScope;
  expenses: Expense[];
  incomes: Income[];
  transfers: Transfer[];
  onChange: (next: SavedFilterQuery) => void;
  onScopeChange: (scope: SavedFilterScope) => void;
  onClear: () => void;
}

export function AdvancedSearchPanel({ query, scope, expenses, incomes, transfers, onChange, onScopeChange, onClear }: Props) {
  const savedFilters = useFinanceStore((state) => state.savedFilters);
  const addSavedFilter = useFinanceStore((state) => state.addSavedFilter);
  const deleteSavedFilter = useFinanceStore((state) => state.deleteSavedFilter);
  const pushToast = useToastStore((state) => state.push);
  const [open, setOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState('');

  const allCategories = useMemo(() => getAllExpenseCategories(expenses), [expenses]);
  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const expense of expenses) for (const tag of expense.tags) if (tag) set.add(tag);
    return [...set].sort();
  }, [expenses]);
  const allMerchants = useMemo(() => {
    const set = new Set<string>();
    for (const expense of expenses) if (expense.merchant) set.add(expense.merchant);
    return [...set].sort();
  }, [expenses]);

  function update<K extends keyof SavedFilterQuery>(key: K, value: SavedFilterQuery[K]) {
    onChange({ ...query, [key]: value });
  }

  function toggleCategory(category: string) {
    const current = query.categories ?? [];
    const next = current.includes(category) ? current.filter((c) => c !== category) : [...current, category];
    update('categories', next.length ? next : undefined);
  }

  function togglePaymentMethod(method: PaymentMethod) {
    const current = query.paymentMethods ?? [];
    const next = current.includes(method) ? current.filter((m) => m !== method) : [...current, method];
    update('paymentMethods', next.length ? next : undefined);
  }

  const activeFilterCount = [
    query.minAmount != null,
    query.maxAmount != null,
    !!query.startDate,
    !!query.endDate,
    !!query.tag,
    !!query.merchant,
    query.hasReceipt != null,
    (query.categories?.length ?? 0) > 0,
    (query.paymentMethods?.length ?? 0) > 0,
  ].filter(Boolean).length;

  async function saveCurrent() {
    if (!saveName.trim()) return;
    try {
      await addSavedFilter({ name: saveName.trim(), scope, query });
      setSaveOpen(false);
      setSaveName('');
      pushToast(`Saved filter "${saveName.trim()}".`);
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Could not save filter.', { tone: 'danger' });
    }
  }

  function applyFilter(filter: SavedFilter) {
    onScopeChange(filter.scope);
    onChange(filter.query);
    setOpen(true);
  }

  // Hide income/transfer counts for empty pulls
  void incomes;
  void transfers;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen((s) => !s)}
          className={clsx(
            'inline-flex min-h-11 items-center gap-2 rounded-xl border px-3 text-sm font-bold transition',
            open || activeFilterCount > 0
              ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:border-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300'
              : 'border-zinc-200 bg-white text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200',
          )}
        >
          <Filter size={16} />
          Filters
          {activeFilterCount > 0 ? (
            <span className="grid h-5 min-w-5 place-items-center rounded-full bg-indigo-600 px-1 text-[0.65rem] font-black text-white">
              {activeFilterCount}
            </span>
          ) : null}
        </button>
        {activeFilterCount > 0 ? (
          <Button variant="ghost" className="min-h-11 px-3 text-sm" icon={<X size={14} />} onClick={onClear}>
            Clear
          </Button>
        ) : null}
        <div className="ml-auto">
          <Button
            variant="ghost"
            className="min-h-11 px-3 text-sm"
            icon={<BookmarkPlus size={14} />}
            disabled={activeFilterCount === 0 && !query.q}
            onClick={() => setSaveOpen(true)}
          >
            Save
          </Button>
        </div>
      </div>

      {savedFilters.length ? (
        <div className="flex flex-wrap gap-2">
          {savedFilters.map((filter) => (
            <div
              key={filter.id}
              className="group inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-bold text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
            >
              <button type="button" onClick={() => applyFilter(filter)} className="flex items-center gap-1">
                <span>{filter.name}</span>
                <Badge tone="info" className="ml-1 normal-case">
                  {filter.scope}
                </Badge>
              </button>
              <button
                type="button"
                onClick={() => void deleteSavedFilter(filter.id)}
                aria-label={`Delete ${filter.name}`}
                className="grid h-5 w-5 place-items-center rounded-full text-zinc-400 hover:text-rose-600"
              >
                <Trash2 size={11} />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {saveOpen ? (
        <Card className="space-y-3">
          <Field label="Name this filter">
            <TextInput
              value={saveName}
              onChange={(event) => setSaveName(event.target.value)}
              placeholder="Food last 30 days"
              maxLength={60}
              autoFocus
            />
          </Field>
          <div className="flex gap-2">
            <Button variant="primary" className="flex-1" onClick={() => void saveCurrent()} disabled={!saveName.trim()}>
              Save filter
            </Button>
            <Button variant="ghost" onClick={() => { setSaveOpen(false); setSaveName(''); }}>
              Cancel
            </Button>
          </div>
        </Card>
      ) : null}

      {open ? (
        <Card className="space-y-4">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-zinc-500">Scope</p>
            <div className="grid grid-cols-5 gap-1 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-900">
              {(['all', 'expense', 'income', 'transfer', 'shared'] as SavedFilterScope[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => onScopeChange(option)}
                  className={clsx(
                    'min-h-9 rounded-lg px-2 text-xs font-bold transition',
                    scope === option
                      ? 'bg-white text-indigo-700 shadow-sm dark:bg-zinc-800 dark:text-indigo-300'
                      : 'text-zinc-500 dark:text-zinc-400',
                  )}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Min amount">
              <TextInput
                inputMode="decimal"
                value={query.minAmount?.toString() ?? ''}
                placeholder="0"
                onChange={(event) => update('minAmount', event.target.value ? Number(event.target.value) : undefined)}
              />
            </Field>
            <Field label="Max amount">
              <TextInput
                inputMode="decimal"
                value={query.maxAmount?.toString() ?? ''}
                placeholder="No limit"
                onChange={(event) => update('maxAmount', event.target.value ? Number(event.target.value) : undefined)}
              />
            </Field>
            <Field label="From">
              <TextInput
                type="date"
                value={query.startDate ?? ''}
                max={query.endDate || undefined}
                onChange={(event) => update('startDate', event.target.value || undefined)}
              />
            </Field>
            <Field label="To">
              <TextInput
                type="date"
                value={query.endDate ?? ''}
                min={query.startDate || undefined}
                onChange={(event) => {
                  const next = event.target.value || undefined;
                  if (query.startDate && next && next < query.startDate) return;
                  update('endDate', next);
                }}
              />
            </Field>
          </div>

          <Field label="Tag">
            <SelectInput value={query.tag ?? ''} onChange={(event) => update('tag', event.target.value || undefined)}>
              <option value="">Any tag</option>
              {allTags.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </SelectInput>
          </Field>

          <Field label="Merchant / Payee">
            <SelectInput value={query.merchant ?? ''} onChange={(event) => update('merchant', event.target.value || undefined)}>
              <option value="">Any merchant</option>
              {allMerchants.map((merchant) => (
                <option key={merchant} value={merchant}>
                  {merchant}
                </option>
              ))}
            </SelectInput>
          </Field>

          <Field label="Receipt">
            <SelectInput
              value={query.hasReceipt == null ? '' : query.hasReceipt ? 'yes' : 'no'}
              onChange={(event) => {
                const v = event.target.value;
                update('hasReceipt', v === '' ? undefined : v === 'yes');
              }}
            >
              <option value="">Any</option>
              <option value="yes">With receipt</option>
              <option value="no">Without receipt</option>
            </SelectInput>
          </Field>

          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-zinc-500">Categories</p>
            <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pr-1">
              {allCategories.map((category) => {
                const active = (query.categories ?? []).includes(category);
                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => toggleCategory(category)}
                    className={clsx(
                      'min-h-8 rounded-full border px-3 text-xs font-bold transition',
                      active
                        ? 'border-rose-600 bg-rose-600 text-white'
                        : 'border-zinc-200 bg-white text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300',
                    )}
                  >
                    {category}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-zinc-500">Payment methods</p>
            <div className="flex flex-wrap gap-1.5">
              {PAYMENT_METHODS.map((method) => {
                const active = (query.paymentMethods ?? []).includes(method);
                return (
                  <button
                    key={method}
                    type="button"
                    onClick={() => togglePaymentMethod(method)}
                    className={clsx(
                      'min-h-8 rounded-full border px-3 text-xs font-bold transition',
                      active
                        ? 'border-indigo-600 bg-indigo-600 text-white'
                        : 'border-zinc-200 bg-white text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300',
                    )}
                  >
                    {method}
                  </button>
                );
              })}
            </div>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
