import { useMemo, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { ContactSelect } from '../../components/ui/ContactSelect';
import { EmptyState } from '../../components/ui/EmptyState';
import { ChipButton, Field, SelectInput, TextArea, TextInput } from '../../components/ui/Form';
import type { Segment } from './types';
import { CURRENT_USER_ID, type ID, type SharedExpense, type SplitType } from '../../domain/models';
import { todayISO } from '../../lib/date';
import { roundMoney } from '../../lib/money';
import { useFinanceStore } from '../../state/useFinanceStore';
import { SharedGroupForm } from './SharedGroupForm';

const splitOptions: Segment<SplitType>[] = [
  { label: 'Equal', value: 'equal' },
  { label: 'Custom', value: 'custom' },
];

export function SharedExpenseForm({ sharedExpense, onDone }: { sharedExpense?: SharedExpense; onDone?: () => void }) {
  const contacts = useFinanceStore((state) => state.contacts);
  const groups = useFinanceStore((state) => state.sharedGroups);
  const addSharedExpense = useFinanceStore((state) => state.addSharedExpense);
  const updateSharedExpense = useFinanceStore((state) => state.updateSharedExpense);
  const initialGroupId = sharedExpense?.groupId ?? groups[0]?.id ?? '';
  const [groupId, setGroupId] = useState(initialGroupId);
  const activeGroup = groups.find((group) => group.id === groupId);
  const groupParticipants = useMemo(() => [CURRENT_USER_ID, ...(activeGroup?.participantIds ?? [])], [activeGroup]);
  const [amount, setAmount] = useState(sharedExpense?.amount.toString() ?? '');
  const [note, setNote] = useState(sharedExpense?.note ?? '');
  const [date, setDate] = useState(sharedExpense?.date ?? todayISO());
  const [payerId, setPayerId] = useState(sharedExpense?.payerId ?? CURRENT_USER_ID);
  const [participantIds, setParticipantIds] = useState<ID[]>(sharedExpense?.participantIds ?? groupParticipants);
  const [splitType, setSplitType] = useState<SplitType>(sharedExpense?.splitType ?? 'equal');
  const [customShares, setCustomShares] = useState<Record<ID, string>>(
    Object.fromEntries((sharedExpense?.shares ?? []).map((share) => [share.contactId, share.amount.toString()])),
  );
  const [settled, setSettled] = useState(sharedExpense?.settled ?? false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function displayName(id: ID) {
    if (id === CURRENT_USER_ID) return 'Me';
    return contacts.find((contact) => contact.id === id)?.name ?? 'Unknown';
  }

  function toggleParticipant(id: ID) {
    setParticipantIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function changeGroup(nextGroupId: ID) {
    setGroupId(nextGroupId);
    if (!sharedExpense) {
      const nextGroup = groups.find((group) => group.id === nextGroupId);
      setParticipantIds([CURRENT_USER_ID, ...(nextGroup?.participantIds ?? [])]);
      setPayerId(CURRENT_USER_ID);
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const parsedAmount = Number(amount);
      const input = {
        groupId,
        amount: parsedAmount,
        note,
        date,
        payerId,
        participantIds,
        splitType,
        customShares: Object.fromEntries(Object.entries(customShares).map(([id, value]) => [id, Number(value || 0)])),
        settled,
      };
      if (sharedExpense) {
        await updateSharedExpense(sharedExpense.id, input);
      } else {
        await addSharedExpense(input);
      }
      onDone?.();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to save shared expense');
    } finally {
      setSaving(false);
    }
  }

  if (!groups.length) {
    return (
      <div className="space-y-4">
        <EmptyState title="Create a group first" body="Shared expenses need a group with participants." />
        <SharedGroupForm onDone={onDone} />
      </div>
    );
  }

  const equalShare = participantIds.length ? roundMoney(Number(amount || 0) / participantIds.length) : 0;

  return (
    <form className="space-y-4" onSubmit={submit}>
      <Field label="Group">
        <SelectInput value={groupId} onChange={(event) => changeGroup(event.target.value)}>
          {groups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </SelectInput>
      </Field>
      <Field label="Amount">
        <TextInput value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" placeholder="0" required />
      </Field>
      <Field label="What was paid?">
        <TextArea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Lunch, rent, trip booking..." required />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Date">
          <TextInput type="date" value={date} onChange={(event) => setDate(event.target.value)} required />
        </Field>
        <Field label="Paid by">
          <ContactSelect contacts={contacts.filter((contact) => groupParticipants.includes(contact.id))} value={payerId} onChange={setPayerId} includeMe />
        </Field>
      </div>
      <div className="space-y-2">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Participants</p>
        <div className="flex flex-wrap gap-2">
          {groupParticipants.map((id) => (
            <ChipButton key={id} active={participantIds.includes(id)} onClick={() => toggleParticipant(id)}>
              {displayName(id)}
            </ChipButton>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Split</p>
        <div className="grid grid-cols-2 gap-2">
          {splitOptions.map((option) => (
            <ChipButton key={option.value} active={splitType === option.value} onClick={() => setSplitType(option.value)}>
              {option.label}
            </ChipButton>
          ))}
        </div>
      </div>
      {splitType === 'equal' ? <p className="text-sm text-slate-500">Each selected participant pays about {equalShare}.</p> : null}
      {splitType === 'custom' ? (
        <div className="space-y-3">
          {participantIds.map((id) => (
            <Field key={id} label={displayName(id)}>
              <TextInput
                value={customShares[id] ?? ''}
                onChange={(event) => setCustomShares((current) => ({ ...current, [id]: event.target.value }))}
                inputMode="decimal"
                placeholder="0"
              />
            </Field>
          ))}
        </div>
      ) : null}
      <label className="flex min-h-12 items-center gap-3 rounded-xl bg-white px-3 font-semibold dark:bg-slate-900">
        <input type="checkbox" checked={settled} onChange={(event) => setSettled(event.target.checked)} className="h-5 w-5 accent-teal-700" />
        Already settled
      </label>
      {error ? <p className="text-sm font-semibold text-rose-600">{error}</p> : null}
      <Button className="w-full" type="submit" disabled={saving}>
        {saving ? 'Saving...' : sharedExpense ? 'Save split' : 'Add shared expense'}
      </Button>
    </form>
  );
}
