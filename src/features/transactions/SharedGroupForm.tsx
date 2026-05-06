import { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Field, TextArea, TextInput } from '../../components/ui/Form';
import { EmptyState } from '../../components/ui/EmptyState';
import type { ID, SharedGroup } from '../../domain/models';
import { useFinanceStore } from '../../state/useFinanceStore';

export function SharedGroupForm({ group, onDone }: { group?: SharedGroup; onDone?: () => void }) {
  const contacts = useFinanceStore((state) => state.contacts);
  const addGroup = useFinanceStore((state) => state.addSharedGroup);
  const updateGroup = useFinanceStore((state) => state.updateSharedGroup);
  const [name, setName] = useState(group?.name ?? '');
  const [description, setDescription] = useState(group?.description ?? '');
  const [participantIds, setParticipantIds] = useState<ID[]>(group?.participantIds ?? contacts.slice(0, 2).map((contact) => contact.id));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function toggleParticipant(id: ID) {
    setParticipantIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (group) {
        await updateGroup(group.id, { name, description, participantIds });
      } else {
        await addGroup({ name, description, participantIds });
      }
      onDone?.();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to save group');
    } finally {
      setSaving(false);
    }
  }

  if (!contacts.length) {
    return <EmptyState title="Add people first" body="Shared groups need at least one person from the People tab." />;
  }

  return (
    <form className="space-y-4" onSubmit={submit}>
      <Field label="Group name">
        <TextInput value={name} onChange={(event) => setName(event.target.value)} placeholder="Office Lunch" required />
      </Field>
      <Field label="Description">
        <TextArea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Optional context" />
      </Field>
      <div className="space-y-2">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Participants</p>
        <div className="space-y-2">
          {contacts.map((contact) => (
            <label
              key={contact.id}
              className="flex min-h-12 items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 dark:border-slate-700 dark:bg-slate-900"
            >
              <input
                type="checkbox"
                checked={participantIds.includes(contact.id)}
                onChange={() => toggleParticipant(contact.id)}
                className="h-5 w-5 accent-teal-700"
              />
              <span className="font-semibold text-slate-800 dark:text-slate-100">{contact.name}</span>
            </label>
          ))}
        </div>
      </div>
      {error ? <p className="text-sm font-semibold text-rose-600">{error}</p> : null}
      <Button className="w-full" type="submit" disabled={saving}>
        {saving ? 'Saving...' : group ? 'Save group' : 'Create group'}
      </Button>
    </form>
  );
}
