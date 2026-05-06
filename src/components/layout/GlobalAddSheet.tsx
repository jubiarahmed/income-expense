import { HandCoins, PackageOpen, ReceiptText, Repeat, UserPlus, Users } from 'lucide-react';
import { Button } from '../ui/Button';
import { BottomSheet } from '../ui/BottomSheet';
import { ExpenseForm } from '../../features/transactions/ExpenseForm';
import { SharedExpenseForm } from '../../features/transactions/SharedExpenseForm';
import { LoanForm } from '../../features/obligations/LoanForm';
import { ItemForm } from '../../features/obligations/ItemForm';
import { SubscriptionForm } from '../../features/obligations/SubscriptionForm';
import { ContactForm } from '../../features/people/ContactForm';
import { SharedGroupForm } from '../../features/transactions/SharedGroupForm';
import { useUiStore, type AddFlowType } from '../../state/useUiStore';

const flowTitles: Record<AddFlowType, string> = {
  chooser: 'Add to Expense Tracker',
  expense: 'Add Expense',
  sharedExpense: 'Add Shared Expense',
  loan: 'Add Loan',
  item: 'Add Borrow/Lend Item',
  subscription: 'Add Subscription',
  contact: 'Add Person',
  sharedGroup: 'Create Shared Group',
};

const choices: { flow: AddFlowType; label: string; body: string; icon: React.ReactNode }[] = [
  { flow: 'expense', label: 'Add Expense', body: 'Daily spending', icon: <ReceiptText size={20} /> },
  { flow: 'sharedExpense', label: 'Add Shared Expense', body: 'Split a bill or event', icon: <Users size={20} /> },
  { flow: 'loan', label: 'Add Loan', body: 'Money lent or borrowed', icon: <HandCoins size={20} /> },
  { flow: 'item', label: 'Add Borrow/Lend Item', body: 'Track physical things', icon: <PackageOpen size={20} /> },
  { flow: 'subscription', label: 'Add Subscription', body: 'Recurring bill or renewal', icon: <Repeat size={20} /> },
  { flow: 'contact', label: 'Add Person', body: 'Save a relationship', icon: <UserPlus size={20} /> },
];

export function GlobalAddSheet() {
  const activeAddFlow = useUiStore((state) => state.activeAddFlow);
  const openAddFlow = useUiStore((state) => state.openAddFlow);
  const closeAddFlow = useUiStore((state) => state.closeAddFlow);
  const open = Boolean(activeAddFlow);
  const title = activeAddFlow ? flowTitles[activeAddFlow] : 'Add to Expense Tracker';

  function done() {
    closeAddFlow();
  }

  return (
    <BottomSheet open={open} title={title} onClose={closeAddFlow}>
      {activeAddFlow === 'chooser' ? (
        <div className="grid gap-3">
          {choices.map((choice) => (
            <button
              key={choice.flow}
              type="button"
              onClick={() => openAddFlow(choice.flow)}
              className="flex min-h-16 items-center gap-3 rounded-2xl bg-white p-4 text-left shadow-sm ring-1 ring-slate-200 active:bg-slate-50 dark:bg-slate-900 dark:ring-slate-800"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-200">
                {choice.icon}
              </span>
              <span>
                <span className="block font-bold text-slate-950 dark:text-slate-50">{choice.label}</span>
                <span className="block text-sm text-slate-500">{choice.body}</span>
              </span>
            </button>
          ))}
          <Button variant="secondary" className="mt-1 w-full" onClick={() => openAddFlow('sharedGroup')}>
            Create shared group
          </Button>
        </div>
      ) : null}
      {activeAddFlow === 'expense' ? <ExpenseForm onDone={done} /> : null}
      {activeAddFlow === 'sharedExpense' ? <SharedExpenseForm onDone={done} /> : null}
      {activeAddFlow === 'loan' ? <LoanForm onDone={done} /> : null}
      {activeAddFlow === 'item' ? <ItemForm onDone={done} /> : null}
      {activeAddFlow === 'subscription' ? <SubscriptionForm onDone={done} /> : null}
      {activeAddFlow === 'contact' ? <ContactForm onDone={done} /> : null}
      {activeAddFlow === 'sharedGroup' ? <SharedGroupForm onDone={done} /> : null}
    </BottomSheet>
  );
}
