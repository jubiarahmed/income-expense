import { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { ChipButton, Field, SelectInput, TextArea, TextInput } from '../../components/ui/Form';
import { SUBSCRIPTION_CYCLES } from '../../domain/constants';
import type { Subscription, SubscriptionCycle, SubscriptionStatus } from '../../domain/models';
import { todayISO } from '../../lib/date';
import { useFinanceStore } from '../../state/useFinanceStore';

export function SubscriptionForm({ subscription, onDone }: { subscription?: Subscription; onDone?: () => void }) {
  const addSubscription = useFinanceStore((state) => state.addSubscription);
  const updateSubscription = useFinanceStore((state) => state.updateSubscription);
  const [name, setName] = useState(subscription?.name ?? '');
  const [amount, setAmount] = useState(subscription?.amount.toString() ?? '');
  const [cycle, setCycle] = useState<SubscriptionCycle>(subscription?.cycle ?? 'monthly');
  const [category, setCategory] = useState(subscription?.category ?? 'Bills');
  const [nextDueDate, setNextDueDate] = useState(subscription?.nextDueDate ?? todayISO());
  const [autoRenew, setAutoRenew] = useState(subscription?.autoRenew ?? true);
  const [notes, setNotes] = useState(subscription?.notes ?? '');
  const [status, setStatus] = useState<SubscriptionStatus>(subscription?.status ?? 'active');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const input = { name, amount: Number(amount), cycle, category, nextDueDate, autoRenew, notes, status };
      if (subscription) {
        await updateSubscription(subscription.id, input);
      } else {
        await addSubscription(input);
      }
      onDone?.();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to save subscription');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={submit}>
      <Field label="Name">
        <TextInput value={name} onChange={(event) => setName(event.target.value)} placeholder="Internet, Netflix, hosting" required />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Amount">
          <TextInput value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" placeholder="0" required />
        </Field>
        <Field label="Cycle">
          <SelectInput value={cycle} onChange={(event) => setCycle(event.target.value as SubscriptionCycle)}>
            {SUBSCRIPTION_CYCLES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </SelectInput>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Category">
          <TextInput value={category} onChange={(event) => setCategory(event.target.value)} placeholder="Bills" required />
        </Field>
        <Field label="Next due">
          <TextInput type="date" value={nextDueDate} onChange={(event) => setNextDueDate(event.target.value)} required />
        </Field>
      </div>
      <div className="space-y-2">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Status</p>
        <div className="grid grid-cols-3 gap-2">
          {(['active', 'paused', 'cancelled'] as SubscriptionStatus[]).map((item) => (
            <ChipButton key={item} active={status === item} onClick={() => setStatus(item)}>
              {item}
            </ChipButton>
          ))}
        </div>
      </div>
      <label className="flex min-h-12 items-center gap-3 rounded-xl bg-white px-3 font-semibold dark:bg-slate-900">
        <input type="checkbox" checked={autoRenew} onChange={(event) => setAutoRenew(event.target.checked)} className="h-5 w-5 accent-teal-700" />
        Auto-renews
      </label>
      <Field label="Notes">
        <TextArea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional details" />
      </Field>
      {error ? <p className="text-sm font-semibold text-rose-600">{error}</p> : null}
      <Button className="w-full" type="submit" disabled={saving}>
        {saving ? 'Saving...' : subscription ? 'Save subscription' : 'Add subscription'}
      </Button>
    </form>
  );
}
