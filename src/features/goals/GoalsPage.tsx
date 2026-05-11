import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Flag, Pencil, Plus, Sparkles, Target, Trash2 } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { Field, SelectInput, TextArea, TextInput } from '../../components/ui/Form';
import { PullToRefresh } from '../../components/ui/PullToRefresh';
import { PAYMENT_METHODS } from '../../domain/constants';
import type { Goal, PaymentMethod } from '../../domain/models';
import { formatFullDate, todayISO } from '../../lib/date';
import { formatMoney } from '../../lib/money';
import { getGoalProgress } from '../../lib/moneyAnalytics';
import { useFinanceStore } from '../../state/useFinanceStore';
import { clsx } from 'clsx';

export function GoalsPage() {
  const navigate = useNavigate();
  const reload = useFinanceStore((state) => state.reload);
  const goals = useFinanceStore((state) => state.goals);
  const preferences = useFinanceStore((state) => state.preferences);
  const deleteGoal = useFinanceStore((state) => state.deleteGoal);

  const [editing, setEditing] = useState<Goal | undefined>();
  const [adding, setAdding] = useState(false);
  const [contributingTo, setContributingTo] = useState<Goal | undefined>();

  const progress = useMemo(() => getGoalProgress(goals), [goals]);
  const totalTarget = progress.reduce((sum, p) => sum + p.goal.targetAmount, 0);
  const totalSaved = progress.reduce((sum, p) => sum + p.goal.savedAmount, 0);

  return (
    <PullToRefresh onRefresh={reload}>
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <Button variant="secondary" icon={<ArrowLeft size={16} />} onClick={() => navigate(-1)}>
            Back
          </Button>
          <div className="flex flex-1 items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-pink-100 text-pink-600 dark:bg-pink-950 dark:text-pink-300">
              <Flag size={18} />
            </span>
            <div>
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-pink-600 dark:text-pink-400">Goals</p>
              <p className="text-sm font-bold tracking-tight text-zinc-700 dark:text-zinc-200">
                {progress.length} goal{progress.length === 1 ? '' : 's'}
              </p>
            </div>
          </div>
          <Button variant="primary" icon={<Plus size={16} />} onClick={() => setAdding(true)}>
            Add
          </Button>
        </div>

        {progress.length ? (
          <Card className="space-y-2">
            <div className="flex items-baseline justify-between">
              <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">Overall progress</p>
              <p className="text-sm font-black tabular-nums">
                {formatMoney(totalSaved, preferences.currency)} / {formatMoney(totalTarget, preferences.currency)}
              </p>
            </div>
            <ProgressBar pct={totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0} />
          </Card>
        ) : null}

        {progress.length ? (
          <div className="space-y-2">
            {progress.map((entry) => (
              <Card key={entry.goal.id} className="space-y-3">
                <div className="flex items-start gap-3">
                  <span
                    className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${
                      entry.goal.status === 'completed'
                        ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-pink-100 text-pink-600 dark:bg-pink-950 dark:text-pink-300'
                    }`}
                  >
                    {entry.goal.status === 'completed' ? <CheckCircle2 size={20} /> : <Target size={20} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold tracking-tight text-zinc-950 dark:text-zinc-50">{entry.goal.name}</p>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      Target {formatMoney(entry.goal.targetAmount, preferences.currency)}
                      {entry.goal.walletMethod ? ` · in ${entry.goal.walletMethod}` : ''}
                      {entry.goal.deadline ? ` · by ${formatFullDate(entry.goal.deadline)}` : ''}
                    </p>
                  </div>
                  <Badge tone={entry.goal.status === 'completed' ? 'good' : 'info'}>{entry.goal.status}</Badge>
                </div>
                <ProgressBar pct={entry.pctSaved} status={entry.goal.status === 'completed' ? 'complete' : undefined} />
                <div className="flex items-baseline justify-between text-sm">
                  <p className="font-semibold text-zinc-600 dark:text-zinc-300">
                    Saved <span className="tabular-nums font-black text-emerald-600 dark:text-emerald-400">{formatMoney(entry.goal.savedAmount, preferences.currency)}</span>
                  </p>
                  <p className="font-semibold text-zinc-600 dark:text-zinc-300">
                    Remaining{' '}
                    <span className="tabular-nums font-black text-zinc-950 dark:text-zinc-50">
                      {formatMoney(entry.remaining, preferences.currency)}
                    </span>
                  </p>
                </div>
                {entry.dailyTargetRemaining && entry.daysUntilDeadline ? (
                  <p className="flex items-center gap-1.5 rounded-xl bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
                    <Sparkles size={12} />
                    Save {formatMoney(entry.dailyTargetRemaining, preferences.currency)}/day for {entry.daysUntilDeadline} days to hit the deadline.
                  </p>
                ) : null}
                <div className="flex gap-2">
                  <Button
                    variant="income"
                    className="min-h-9 flex-1 px-2"
                    icon={<Plus size={16} />}
                    disabled={entry.goal.status === 'completed'}
                    onClick={() => setContributingTo(entry.goal)}
                  >
                    Add money
                  </Button>
                  <Button variant="ghost" className="min-h-9 flex-1 px-2" icon={<Pencil size={16} />} onClick={() => setEditing(entry.goal)}>
                    Edit
                  </Button>
                  <Button variant="ghost" className="min-h-9 px-3 text-rose-600" icon={<Trash2 size={16} />} onClick={() => void deleteGoal(entry.goal.id)}>
                    Delete
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No goals yet"
            body="Add a savings goal like a new laptop, an emergency fund, or a trip. Set a target and a deadline, then watch progress."
            icon={<Flag size={22} />}
          />
        )}

        <BottomSheet
          open={adding || Boolean(editing)}
          title={editing ? 'Edit Goal' : 'New Goal'}
          onClose={() => {
            setAdding(false);
            setEditing(undefined);
          }}
        >
          <GoalForm
            goal={editing}
            onDone={() => {
              setAdding(false);
              setEditing(undefined);
            }}
          />
        </BottomSheet>

        <BottomSheet open={Boolean(contributingTo)} title="Add to Goal" onClose={() => setContributingTo(undefined)}>
          {contributingTo ? (
            <ContributionForm goal={contributingTo} onDone={() => setContributingTo(undefined)} />
          ) : null}
        </BottomSheet>
      </div>
    </PullToRefresh>
  );
}

function ProgressBar({ pct, status }: { pct: number; status?: 'complete' }) {
  const color = status === 'complete' ? 'bg-emerald-500' : 'bg-indigo-500';
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
      <div className={clsx('h-full rounded-full transition-all', color)} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  );
}

function GoalForm({ goal, onDone }: { goal?: Goal; onDone: () => void }) {
  const addGoal = useFinanceStore((state) => state.addGoal);
  const updateGoal = useFinanceStore((state) => state.updateGoal);
  const [name, setName] = useState(goal?.name ?? '');
  const [targetAmount, setTargetAmount] = useState(goal?.targetAmount.toString() ?? '');
  const [savedAmount, setSavedAmount] = useState(goal?.savedAmount.toString() ?? '0');
  const [walletMethod, setWalletMethod] = useState<PaymentMethod | ''>(goal?.walletMethod ?? '');
  const [deadline, setDeadline] = useState(goal?.deadline ?? '');
  const [notes, setNotes] = useState(goal?.notes ?? '');
  const [status, setStatus] = useState<Goal['status']>(goal?.status ?? 'active');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const input = {
        name: name.trim(),
        targetAmount: Number(targetAmount),
        savedAmount: Number(savedAmount || 0),
        walletMethod: walletMethod || undefined,
        deadline: deadline || undefined,
        notes,
        status,
      };
      if (goal) await updateGoal(goal.id, input);
      else await addGoal(input);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save goal');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={submit}>
      <Field label="Name">
        <TextInput
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Buy laptop"
          required
          autoFocus
          maxLength={60}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Target">
          <TextInput
            value={targetAmount}
            onChange={(event) => setTargetAmount(event.target.value)}
            inputMode="decimal"
            placeholder="0"
            required
          />
        </Field>
        <Field label="Already saved">
          <TextInput
            value={savedAmount}
            onChange={(event) => setSavedAmount(event.target.value)}
            inputMode="decimal"
            placeholder="0"
          />
        </Field>
      </div>
      <Field label="Linked wallet (optional)">
        <SelectInput value={walletMethod} onChange={(event) => setWalletMethod(event.target.value as PaymentMethod | '')}>
          <option value="">No specific wallet</option>
          {PAYMENT_METHODS.map((method) => (
            <option key={method} value={method}>
              {method}
            </option>
          ))}
        </SelectInput>
      </Field>
      <Field label="Deadline (optional)">
        <TextInput type="date" value={deadline} onChange={(event) => setDeadline(event.target.value)} min={todayISO()} />
      </Field>
      <Field label="Notes">
        <TextArea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Why is this important?" />
      </Field>
      {goal ? (
        <Field label="Status">
          <SelectInput value={status} onChange={(event) => setStatus(event.target.value as Goal['status'])}>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
          </SelectInput>
        </Field>
      ) : null}
      {error ? <p className="text-sm font-semibold text-rose-600">{error}</p> : null}
      <Button className="w-full" type="submit" disabled={saving}>
        {saving ? 'Saving…' : goal ? 'Save goal' : 'Add goal'}
      </Button>
    </form>
  );
}

function ContributionForm({ goal, onDone }: { goal: Goal; onDone: () => void }) {
  const contributeToGoal = useFinanceStore((state) => state.contributeToGoal);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await contributeToGoal({ goalId: goal.id, amount: Number(amount), date, note });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not record contribution');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={submit}>
      <p className="rounded-xl bg-indigo-50 p-3 text-sm font-semibold text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
        {goal.name} · need {goal.targetAmount - goal.savedAmount} more
      </p>
      <Field label="Amount to add">
        <TextInput
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          inputMode="decimal"
          placeholder="0"
          required
          autoFocus
        />
      </Field>
      <Field label="Date">
        <TextInput type="date" value={date} onChange={(event) => setDate(event.target.value)} required />
      </Field>
      <Field label="Note">
        <TextInput value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional" />
      </Field>
      {error ? <p className="text-sm font-semibold text-rose-600">{error}</p> : null}
      <Button variant="income" className="w-full" type="submit" disabled={saving}>
        {saving ? 'Saving…' : 'Add money'}
      </Button>
    </form>
  );
}
