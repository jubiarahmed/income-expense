import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, CheckCircle2, Pencil, Plus, Target, Trash2 } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { ChipButton, Field, SelectInput, TextInput } from '../../components/ui/Form';
import { PullToRefresh } from '../../components/ui/PullToRefresh';
import { getExpenseCategoryStyle } from '../../domain/categoryIcons';
import { getAllExpenseCategories } from '../../domain/customCategories';
import type { Budget } from '../../domain/models';
import { formatMoney } from '../../lib/money';
import { getBudgetUsage } from '../../lib/moneyAnalytics';
import { useFinanceStore } from '../../state/useFinanceStore';
import { clsx } from 'clsx';

export function BudgetsPage() {
  const navigate = useNavigate();
  const reload = useFinanceStore((state) => state.reload);
  const budgets = useFinanceStore((state) => state.budgets);
  const expenses = useFinanceStore((state) => state.expenses);
  const preferences = useFinanceStore((state) => state.preferences);
  const deleteBudget = useFinanceStore((state) => state.deleteBudget);

  const [editing, setEditing] = useState<Budget | undefined>();
  const [adding, setAdding] = useState(false);

  const usage = useMemo(() => getBudgetUsage(budgets, expenses), [budgets, expenses]);
  const totalLimit = usage.reduce((sum, u) => sum + u.budget.monthlyLimit, 0);
  const totalSpent = usage.reduce((sum, u) => sum + u.spent, 0);
  const overall = totalLimit > 0 ? Math.round((totalSpent / totalLimit) * 100) : 0;

  return (
    <PullToRefresh onRefresh={reload}>
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <Button variant="secondary" icon={<ArrowLeft size={16} />} onClick={() => navigate(-1)}>
            Back
          </Button>
          <div className="flex flex-1 items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300">
              <Target size={18} />
            </span>
            <div>
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-400">Budgets</p>
              <p className="text-sm font-bold tracking-tight text-zinc-700 dark:text-zinc-200">
                {usage.length} categor{usage.length === 1 ? 'y' : 'ies'} tracked
              </p>
            </div>
          </div>
          <Button variant="primary" icon={<Plus size={16} />} onClick={() => setAdding(true)}>
            Add
          </Button>
        </div>

        {totalLimit > 0 ? (
          <Card className="space-y-3">
            <div className="flex items-baseline justify-between">
              <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">Overall this month</p>
              <p className="text-sm font-black tabular-nums">
                {formatMoney(totalSpent, preferences.currency)} / {formatMoney(totalLimit, preferences.currency)}
              </p>
            </div>
            <ProgressBar pct={overall} status={overall >= 100 ? 'over' : overall >= 80 ? 'warning' : 'on-track'} />
            <p className="text-xs text-zinc-500">{overall}% of total monthly budget used</p>
          </Card>
        ) : null}

        {usage.length ? (
          <div className="space-y-2">
            {usage.map((entry) => {
              const style = getExpenseCategoryStyle(entry.budget.category);
              const Icon = style.icon;
              return (
                <Card key={entry.budget.id} className="space-y-3">
                  <div className="flex items-start gap-3">
                    <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${style.bg} ${style.fg}`}>
                      <Icon size={20} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold tracking-tight text-zinc-950 dark:text-zinc-50">{entry.budget.category}</p>
                      <p className="mt-0.5 text-xs text-zinc-500">
                        Limit {formatMoney(entry.budget.monthlyLimit, preferences.currency)} · warn at {entry.budget.notifyAt}%
                      </p>
                    </div>
                    <StatusBadge status={entry.status} />
                  </div>
                  <ProgressBar pct={Math.min(entry.pctUsed, 130)} status={entry.status} />
                  <div className="flex items-center justify-between text-sm">
                    <p className="font-semibold text-zinc-600 dark:text-zinc-300">
                      Spent <span className="tabular-nums text-zinc-950 dark:text-zinc-50">{formatMoney(entry.spent, preferences.currency)}</span>
                    </p>
                    <p className="font-semibold text-zinc-600 dark:text-zinc-300">
                      {entry.remaining >= 0 ? 'Left ' : 'Over '}
                      <span
                        className={clsx(
                          'tabular-nums font-black',
                          entry.remaining >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400',
                        )}
                      >
                        {formatMoney(Math.abs(entry.remaining), preferences.currency)}
                      </span>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" className="min-h-9 flex-1 px-2" icon={<Pencil size={16} />} onClick={() => setEditing(entry.budget)}>
                      Edit
                    </Button>
                    <Button variant="ghost" className="min-h-9 px-3 text-rose-600" icon={<Trash2 size={16} />} onClick={() => void deleteBudget(entry.budget.id)}>
                      Delete
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title="No budgets yet"
            body="Set monthly spending limits per category. You'll see progress bars and get warnings before you overspend."
            icon={<Target size={22} />}
          />
        )}

        <BottomSheet open={adding || Boolean(editing)} title={editing ? 'Edit Budget' : 'Add Budget'} onClose={() => { setAdding(false); setEditing(undefined); }}>
          <BudgetForm
            budget={editing}
            onDone={() => {
              setAdding(false);
              setEditing(undefined);
            }}
          />
        </BottomSheet>
      </div>
    </PullToRefresh>
  );
}

function StatusBadge({ status }: { status: 'on-track' | 'warning' | 'over' }) {
  if (status === 'over') {
    return (
      <Badge tone="danger">
        <span className="inline-flex items-center gap-1">
          <AlertTriangle size={12} /> Over
        </span>
      </Badge>
    );
  }
  if (status === 'warning') {
    return (
      <Badge tone="warn">
        <span className="inline-flex items-center gap-1">
          <AlertTriangle size={12} /> Warning
        </span>
      </Badge>
    );
  }
  return (
    <Badge tone="good">
      <span className="inline-flex items-center gap-1">
        <CheckCircle2 size={12} /> On track
      </span>
    </Badge>
  );
}

function ProgressBar({ pct, status }: { pct: number; status: 'on-track' | 'warning' | 'over' }) {
  const color =
    status === 'over' ? 'bg-rose-500' : status === 'warning' ? 'bg-amber-500' : 'bg-emerald-500';
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
      <div className={clsx('h-full rounded-full transition-all', color)} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  );
}

function BudgetForm({ budget, onDone }: { budget?: Budget; onDone: () => void }) {
  const expenses = useFinanceStore((state) => state.expenses);
  const addBudget = useFinanceStore((state) => state.addBudget);
  const updateBudget = useFinanceStore((state) => state.updateBudget);
  const [category, setCategory] = useState(budget?.category ?? 'Food');
  const [monthlyLimit, setMonthlyLimit] = useState(budget?.monthlyLimit.toString() ?? '');
  const [notifyAt, setNotifyAt] = useState(String(budget?.notifyAt ?? 80));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const allCategories = useMemo(() => {
    const list = getAllExpenseCategories(expenses);
    if (category && !list.includes(category)) list.push(category);
    return list;
  }, [expenses, category]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const input = { category, monthlyLimit: Number(monthlyLimit), notifyAt: Number(notifyAt) };
      if (budget) {
        await updateBudget(budget.id, input);
      } else {
        await addBudget(input);
      }
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save budget');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={submit}>
      <div className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Category</p>
        <div className="flex flex-wrap gap-2">
          {allCategories.map((cat) => (
            <ChipButton key={cat} active={category === cat} onClick={() => setCategory(cat)} tone="expense">
              {cat}
            </ChipButton>
          ))}
        </div>
      </div>
      <Field label="Monthly limit">
        <TextInput
          value={monthlyLimit}
          onChange={(event) => setMonthlyLimit(event.target.value)}
          inputMode="decimal"
          placeholder="0"
          required
          autoFocus
        />
      </Field>
      <Field label="Warn when usage reaches">
        <SelectInput value={notifyAt} onChange={(event) => setNotifyAt(event.target.value)}>
          <option value="50">50%</option>
          <option value="70">70%</option>
          <option value="80">80%</option>
          <option value="90">90%</option>
          <option value="100">Only when over</option>
        </SelectInput>
      </Field>
      {error ? <p className="text-sm font-semibold text-rose-600">{error}</p> : null}
      <Button className="w-full" type="submit" disabled={saving}>
        {saving ? 'Saving…' : budget ? 'Save budget' : 'Add budget'}
      </Button>
    </form>
  );
}
