import { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { ContactSelect } from '../../components/ui/ContactSelect';
import { EmptyState } from '../../components/ui/EmptyState';
import { ChipButton, Field, TextArea, TextInput } from '../../components/ui/Form';
import type { Segment } from '../transactions/types';
import type { Loan, LoanDirection } from '../../domain/models';
import { todayISO } from '../../lib/date';
import { useFinanceStore } from '../../state/useFinanceStore';

const directionOptions: Segment<LoanDirection>[] = [
  { label: 'I lent', value: 'lent' },
  { label: 'I borrowed', value: 'borrowed' },
];

export function LoanForm({ loan, onDone }: { loan?: Loan; onDone?: () => void }) {
  const contacts = useFinanceStore((state) => state.contacts);
  const addLoan = useFinanceStore((state) => state.addLoan);
  const updateLoan = useFinanceStore((state) => state.updateLoan);
  const [personId, setPersonId] = useState(loan?.personId ?? contacts[0]?.id ?? '');
  const [direction, setDirection] = useState<LoanDirection>(loan?.direction ?? 'lent');
  const [amount, setAmount] = useState(loan?.amount.toString() ?? '');
  const [date, setDate] = useState(loan?.date ?? todayISO());
  const [dueDate, setDueDate] = useState(loan?.dueDate ?? '');
  const [notes, setNotes] = useState(loan?.notes ?? '');
  const [status, setStatus] = useState(loan?.status ?? 'active');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const input = { personId, direction, amount: Number(amount), date, dueDate, notes, status };
      if (loan) {
        await updateLoan(loan.id, input);
      } else {
        await addLoan(input);
      }
      onDone?.();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to save loan');
    } finally {
      setSaving(false);
    }
  }

  if (!contacts.length) {
    return <EmptyState title="Add people first" body="Loans need a person so balances can be aggregated." />;
  }

  return (
    <form className="space-y-4" onSubmit={submit}>
      <Field label="Person">
        <ContactSelect contacts={contacts} value={personId} onChange={setPersonId} />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        {directionOptions.map((option) => (
          <ChipButton key={option.value} active={direction === option.value} onClick={() => setDirection(option.value)}>
            {option.label}
          </ChipButton>
        ))}
      </div>
      <Field label="Amount">
        <TextInput value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" placeholder="0" required />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Date">
          <TextInput
            type="date"
            value={date}
            max={dueDate || undefined}
            onChange={(event) => setDate(event.target.value)}
            required
          />
        </Field>
        <Field label="Due date">
          <TextInput
            type="date"
            value={dueDate}
            min={date || undefined}
            onChange={(event) => {
              const next = event.target.value;
              if (date && next && next < date) return;
              setDueDate(next);
            }}
          />
        </Field>
      </div>
      <Field label="Notes">
        <TextArea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Reason or context" />
      </Field>
      {loan ? (
        <label className="flex min-h-12 items-center gap-3 rounded-xl bg-white px-3 font-semibold dark:bg-slate-900">
          <input type="checkbox" checked={status === 'settled'} onChange={(event) => setStatus(event.target.checked ? 'settled' : 'active')} className="h-5 w-5 accent-teal-700" />
          Mark settled
        </label>
      ) : null}
      {error ? <p className="text-sm font-semibold text-rose-600">{error}</p> : null}
      <Button className="w-full" type="submit" disabled={saving}>
        {saving ? 'Saving...' : loan ? 'Save loan' : 'Add loan'}
      </Button>
    </form>
  );
}

export function LoanPaymentForm({ loan, onDone }: { loan: Loan; onDone?: () => void }) {
  const addLoanPayment = useFinanceStore((state) => state.addLoanPayment);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await addLoanPayment({ loanId: loan.id, amount: Number(amount), date, note });
      onDone?.();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to save repayment');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={submit}>
      <Field label="Amount paid">
        <TextInput value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" placeholder="0" required />
      </Field>
      <Field label="Date">
        <TextInput type="date" value={date} onChange={(event) => setDate(event.target.value)} required />
      </Field>
      <Field label="Note">
        <TextInput value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional note" />
      </Field>
      {error ? <p className="text-sm font-semibold text-rose-600">{error}</p> : null}
      <Button className="w-full" type="submit" disabled={saving}>
        {saving ? 'Saving...' : 'Record repayment'}
      </Button>
    </form>
  );
}
