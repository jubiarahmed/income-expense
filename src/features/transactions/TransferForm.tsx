import { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Field, SelectInput, TextArea, TextInput } from '../../components/ui/Form';
import { PAYMENT_METHODS } from '../../domain/constants';
import type { PaymentMethod, Transfer } from '../../domain/models';
import { todayISO } from '../../lib/date';
import { useFinanceStore } from '../../state/useFinanceStore';

export function TransferForm({ transfer, onDone }: { transfer?: Transfer; onDone?: () => void }) {
  const addTransfer = useFinanceStore((state) => state.addTransfer);
  const updateTransfer = useFinanceStore((state) => state.updateTransfer);
  const [amount, setAmount] = useState(transfer?.amount.toString() ?? '');
  const [fromMethod, setFromMethod] = useState<PaymentMethod>(transfer?.fromMethod ?? 'Bank');
  const [toMethod, setToMethod] = useState<PaymentMethod>(transfer?.toMethod ?? 'Cash');
  const [fee, setFee] = useState(transfer?.fee.toString() ?? '0');
  const [date, setDate] = useState(transfer?.date ?? todayISO());
  const [note, setNote] = useState(transfer?.note ?? '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const input = { amount: Number(amount), fromMethod, toMethod, fee: Number(fee || 0), date, note };
      if (transfer) {
        await updateTransfer(transfer.id, input);
      } else {
        await addTransfer(input);
      }
      onDone?.();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to save transfer');
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

      <div className="grid grid-cols-2 gap-3">
        <Field label="From">
          <SelectInput value={fromMethod} onChange={(event) => setFromMethod(event.target.value as PaymentMethod)}>
            {PAYMENT_METHODS.map((method) => (
              <option key={method} value={method}>
                {method}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label="To">
          <SelectInput value={toMethod} onChange={(event) => setToMethod(event.target.value as PaymentMethod)}>
            {PAYMENT_METHODS.map((method) => (
              <option key={method} value={method}>
                {method}
              </option>
            ))}
          </SelectInput>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Date">
          <TextInput type="date" value={date} onChange={(event) => setDate(event.target.value)} required />
        </Field>
        <Field label="Fee">
          <TextInput
            value={fee}
            onChange={(event) => setFee(event.target.value)}
            inputMode="decimal"
            placeholder="0"
          />
        </Field>
      </div>

      <Field label="Note">
        <TextArea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional details" />
      </Field>

      {error ? <p className="text-sm font-semibold text-rose-600">{error}</p> : null}
      <Button variant="transfer" className="w-full" type="submit" disabled={saving}>
        {saving ? 'Saving…' : transfer ? 'Save transfer' : 'Add transfer'}
      </Button>
    </form>
  );
}
