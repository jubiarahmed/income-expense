import { useMemo, useRef, useState } from 'react';
import { Camera, Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { ChipButton, Field, SelectInput, TextArea, TextInput } from '../../components/ui/Form';
import { EXPENSE_CATEGORIES, PAYMENT_METHODS } from '../../domain/constants';
import type { Expense, ExpenseCategory, PaymentMethod } from '../../domain/models';
import { compressImageToDataUrl } from '../../lib/compressImage';
import { todayISO } from '../../lib/date';
import { useFinanceStore } from '../../state/useFinanceStore';

export function ExpenseForm({ expense, onDone }: { expense?: Expense; onDone?: () => void }) {
  const addExpense = useFinanceStore((state) => state.addExpense);
  const updateExpense = useFinanceStore((state) => state.updateExpense);
  const expenses = useFinanceStore((state) => state.expenses);
  const [amount, setAmount] = useState(expense?.amount.toString() ?? '');
  const [category, setCategory] = useState<ExpenseCategory>(expense?.category ?? 'Food');
  const [note, setNote] = useState(expense?.note ?? '');
  const [date, setDate] = useState(expense?.date ?? todayISO());
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(expense?.paymentMethod ?? 'Cash');
  const [tags, setTags] = useState(expense?.tags.join(', ') ?? '');
  const [receiptImage, setReceiptImage] = useState<string | undefined>(expense?.receiptImage);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const recentCategories = useMemo(
    () => [...new Set(expenses.slice(0, 8).map((item) => item.category))].slice(0, 4),
    [expenses],
  );

  async function handlePhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setPhotoBusy(true);
    setError('');
    try {
      const dataUrl = await compressImageToDataUrl(file);
      setReceiptImage(dataUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not process the photo.');
    } finally {
      setPhotoBusy(false);
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const input = { amount: Number(amount), category, note, date, paymentMethod, tags, receiptImage };
      if (expense) {
        await updateExpense(expense.id, input);
      } else {
        await addExpense(input);
      }
      onDone?.();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to save expense');
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
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Category</p>
        <div className="flex flex-wrap gap-2">
          {EXPENSE_CATEGORIES.map((item) => (
            <ChipButton key={item} active={category === item} onClick={() => setCategory(item)}>
              {item}
            </ChipButton>
          ))}
        </div>
        {recentCategories.length ? (
          <p className="text-xs text-slate-500">Recent: {recentCategories.join(', ')}</p>
        ) : null}
      </div>

      <Field label="Note">
        <TextArea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Lunch, bus fare, recharge..." />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Date">
          <TextInput type="date" value={date} onChange={(event) => setDate(event.target.value)} required />
        </Field>
        <Field label="Paid with">
          <SelectInput value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}>
            {PAYMENT_METHODS.map((method) => (
              <option key={method} value={method}>
                {method}
              </option>
            ))}
          </SelectInput>
        </Field>
      </div>

      <Field label="Tags">
        <TextInput value={tags} onChange={(event) => setTags(event.target.value)} placeholder="comma, separated" />
      </Field>

      <div className="space-y-2">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Receipt photo</p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handlePhoto}
        />
        {receiptImage ? (
          <div className="relative">
            <img src={receiptImage} alt="Receipt" className="h-40 w-full rounded-xl object-cover ring-1 ring-slate-200 dark:ring-slate-800" />
            <button
              type="button"
              onClick={() => setReceiptImage(undefined)}
              aria-label="Remove receipt"
              className="absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-full bg-slate-900/80 text-white"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ) : (
          <Button
            variant="secondary"
            className="w-full"
            icon={<Camera size={16} />}
            onClick={() => fileInputRef.current?.click()}
            disabled={photoBusy}
          >
            {photoBusy ? 'Processing...' : 'Attach receipt'}
          </Button>
        )}
      </div>

      {error ? <p className="text-sm font-semibold text-rose-600">{error}</p> : null}
      <Button className="w-full" type="submit" disabled={saving || photoBusy}>
        {saving ? 'Saving...' : expense ? 'Save expense' : 'Add expense'}
      </Button>
    </form>
  );
}
