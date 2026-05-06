import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { ChipButton, Field, SelectInput, TextArea, TextInput } from '../../components/ui/Form';
import { PAYMENT_METHODS } from '../../domain/constants';
import { getAllIncomeCategories } from '../../domain/customCategories';
import type { Income, IncomeCategory, PaymentMethod } from '../../domain/models';
import { todayISO } from '../../lib/date';
import { useFinanceStore } from '../../state/useFinanceStore';

export function IncomeForm({
  income,
  initialCategory,
  onDone,
}: {
  income?: Income;
  initialCategory?: IncomeCategory;
  onDone?: () => void;
}) {
  const addIncome = useFinanceStore((state) => state.addIncome);
  const updateIncome = useFinanceStore((state) => state.updateIncome);
  const incomes = useFinanceStore((state) => state.incomes);
  const [amount, setAmount] = useState(income?.amount.toString() ?? '');
  const [category, setCategory] = useState<IncomeCategory>(income?.category ?? initialCategory ?? 'Salary');
  const [source, setSource] = useState(income?.source ?? '');
  const [note, setNote] = useState(income?.note ?? '');
  const [date, setDate] = useState(income?.date ?? todayISO());
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(income?.paymentMethod ?? 'Bank');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [addingCustom, setAddingCustom] = useState(false);
  const [customDraft, setCustomDraft] = useState('');

  const allCategories = useMemo(() => {
    const list = getAllIncomeCategories(incomes);
    if (category && !list.includes(category)) list.push(category);
    return list;
  }, [incomes, category]);

  function commitCustomCategory() {
    const next = customDraft.trim();
    if (!next) return;
    setCategory(next);
    setAddingCustom(false);
    setCustomDraft('');
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const input = { amount: Number(amount), category, source, note, date, paymentMethod };
      if (income) {
        await updateIncome(income.id, input);
      } else {
        await addIncome(input);
      }
      onDone?.();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to save income');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={submit}>
      <Field label="Amount">
        <TextInput
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          inputMode="decimal"
          placeholder="0"
          required
          autoFocus
        />
      </Field>

      <div className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Category</p>
        <div className="flex flex-wrap gap-2">
          {allCategories.map((item) => (
            <ChipButton key={item} active={category === item} onClick={() => setCategory(item)} tone="income">
              {item}
            </ChipButton>
          ))}
          <button
            type="button"
            onClick={() => setAddingCustom(true)}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-dashed border-indigo-300 bg-indigo-50 px-3 text-sm font-semibold text-indigo-700 active:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300"
          >
            <Plus size={14} strokeWidth={2.6} /> Add
          </button>
        </div>
        {addingCustom ? (
          <div className="flex items-center gap-2">
            <TextInput
              autoFocus
              value={customDraft}
              onChange={(event) => setCustomDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  commitCustomCategory();
                }
                if (event.key === 'Escape') {
                  event.preventDefault();
                  setAddingCustom(false);
                  setCustomDraft('');
                }
              }}
              maxLength={40}
              placeholder="e.g. Tuition, Royalty"
            />
            <Button variant="income" className="min-h-12 px-3" onClick={commitCustomCategory}>
              Use
            </Button>
            <Button
              variant="ghost"
              className="min-h-12 px-3"
              onClick={() => {
                setAddingCustom(false);
                setCustomDraft('');
              }}
            >
              Cancel
            </Button>
          </div>
        ) : null}
      </div>

      <Field label="Source">
        <TextInput
          value={source}
          onChange={(event) => setSource(event.target.value)}
          placeholder="Employer, client, platform..."
        />
      </Field>

      <Field label="Note">
        <TextArea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional details" />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Date">
          <TextInput type="date" value={date} onChange={(event) => setDate(event.target.value)} required />
        </Field>
        <Field label="Received in">
          <SelectInput value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}>
            {PAYMENT_METHODS.map((method) => (
              <option key={method} value={method}>
                {method}
              </option>
            ))}
          </SelectInput>
        </Field>
      </div>

      {error ? <p className="text-sm font-semibold text-rose-600">{error}</p> : null}
      <Button variant="income" className="w-full" type="submit" disabled={saving}>
        {saving ? 'Saving…' : income ? 'Save income' : 'Add income'}
      </Button>
    </form>
  );
}
