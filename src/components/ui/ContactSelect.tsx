import { SelectInput } from './Form';
import { CURRENT_USER_ID } from '../../domain/models';
import type { Contact, ID } from '../../domain/models';

export function ContactSelect({
  contacts,
  value,
  onChange,
  includeMe = false,
}: {
  contacts: Contact[];
  value: ID;
  onChange: (value: ID) => void;
  includeMe?: boolean;
}) {
  return (
    <SelectInput value={value} onChange={(event) => onChange(event.target.value)}>
      {includeMe ? <option value={CURRENT_USER_ID}>Me</option> : null}
      {contacts.map((contact) => (
        <option key={contact.id} value={contact.id}>
          {contact.name}
        </option>
      ))}
    </SelectInput>
  );
}
