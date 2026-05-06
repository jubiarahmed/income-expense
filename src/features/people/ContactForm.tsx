import { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Field, TextArea, TextInput } from '../../components/ui/Form';
import type { Contact } from '../../domain/models';
import { useFinanceStore } from '../../state/useFinanceStore';

export function ContactForm({ contact, onDone }: { contact?: Contact; onDone?: () => void }) {
  const addContact = useFinanceStore((state) => state.addContact);
  const updateContact = useFinanceStore((state) => state.updateContact);
  const [name, setName] = useState(contact?.name ?? '');
  const [phone, setPhone] = useState(contact?.phone ?? '');
  const [notes, setNotes] = useState(contact?.notes ?? '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (contact) {
        await updateContact(contact.id, { name, phone, notes });
      } else {
        await addContact({ name, phone, notes });
      }
      onDone?.();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to save person');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={submit}>
      <Field label="Name">
        <TextInput value={name} onChange={(event) => setName(event.target.value)} placeholder="Person name" required />
      </Field>
      <Field label="Phone">
        <TextInput value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Optional phone" inputMode="tel" />
      </Field>
      <Field label="Notes">
        <TextArea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional context" />
      </Field>
      {error ? <p className="text-sm font-semibold text-rose-600">{error}</p> : null}
      <Button className="w-full" type="submit" disabled={saving}>
        {saving ? 'Saving...' : contact ? 'Save person' : 'Add person'}
      </Button>
    </form>
  );
}
