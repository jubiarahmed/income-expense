import { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { ContactSelect } from '../../components/ui/ContactSelect';
import { EmptyState } from '../../components/ui/EmptyState';
import { ChipButton, Field, TextArea, TextInput } from '../../components/ui/Form';
import type { Segment } from '../transactions/types';
import type { ItemDirection, ItemRecord } from '../../domain/models';
import { todayISO } from '../../lib/date';
import { useFinanceStore } from '../../state/useFinanceStore';

const directionOptions: Segment<ItemDirection>[] = [
  { label: 'I lent', value: 'lent' },
  { label: 'I borrowed', value: 'borrowed' },
];

export function ItemForm({ item, onDone }: { item?: ItemRecord; onDone?: () => void }) {
  const contacts = useFinanceStore((state) => state.contacts);
  const addItem = useFinanceStore((state) => state.addItem);
  const updateItem = useFinanceStore((state) => state.updateItem);
  const [itemName, setItemName] = useState(item?.itemName ?? '');
  const [personId, setPersonId] = useState(item?.personId ?? contacts[0]?.id ?? '');
  const [direction, setDirection] = useState<ItemDirection>(item?.direction ?? 'lent');
  const [date, setDate] = useState(item?.date ?? todayISO());
  const [dueDate, setDueDate] = useState(item?.dueDate ?? '');
  const [note, setNote] = useState(item?.note ?? '');
  const [status, setStatus] = useState(item?.status ?? 'active');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const input = { itemName, personId, direction, date, dueDate, note, status, returnedDate: item?.returnedDate };
      if (item) {
        await updateItem(item.id, input);
      } else {
        await addItem(input);
      }
      onDone?.();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to save item');
    } finally {
      setSaving(false);
    }
  }

  if (!contacts.length) {
    return <EmptyState title="Add people first" body="Item lending needs a person so it can appear on their profile." />;
  }

  return (
    <form className="space-y-4" onSubmit={submit}>
      <Field label="Item">
        <TextInput value={itemName} onChange={(event) => setItemName(event.target.value)} placeholder="Power bank, book, document" required />
      </Field>
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
      <Field label="Note">
        <TextArea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Condition or return context" />
      </Field>
      {item ? (
        <label className="flex min-h-12 items-center gap-3 rounded-xl bg-white px-3 font-semibold dark:bg-slate-900">
          <input type="checkbox" checked={status === 'returned'} onChange={(event) => setStatus(event.target.checked ? 'returned' : 'active')} className="h-5 w-5 accent-teal-700" />
          Mark returned
        </label>
      ) : null}
      {error ? <p className="text-sm font-semibold text-rose-600">{error}</p> : null}
      <Button className="w-full" type="submit" disabled={saving}>
        {saving ? 'Saving...' : item ? 'Save item' : 'Add item'}
      </Button>
    </form>
  );
}
