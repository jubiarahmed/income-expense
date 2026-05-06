import { useState } from 'react';
import { ArrowLeftRight, HandCoins, PackageOpen, Plus, Repeat, UserPlus, Users } from 'lucide-react';
import { clsx } from 'clsx';
import { BottomSheet } from '../ui/BottomSheet';
import { ExpenseForm } from '../../features/transactions/ExpenseForm';
import { IncomeForm } from '../../features/transactions/IncomeForm';
import { TransferForm } from '../../features/transactions/TransferForm';
import { SharedExpenseForm } from '../../features/transactions/SharedExpenseForm';
import { LoanForm } from '../../features/obligations/LoanForm';
import { ItemForm } from '../../features/obligations/ItemForm';
import { SubscriptionForm } from '../../features/obligations/SubscriptionForm';
import { ContactForm } from '../../features/people/ContactForm';
import { SharedGroupForm } from '../../features/transactions/SharedGroupForm';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../../domain/constants';
import { getExpenseCategoryStyle, getIncomeCategoryStyle } from '../../domain/categoryIcons';
import { useUiStore, type AddFlowType, type ChooserTab } from '../../state/useUiStore';
import type { ExpenseCategory, IncomeCategory } from '../../domain/models';

const flowTitles: Record<AddFlowType, string> = {
  chooser: 'Add',
  expense: 'New Expense',
  income: 'New Income',
  transfer: 'New Transfer',
  sharedExpense: 'Add Shared Expense',
  loan: 'Add Loan',
  item: 'Add Borrow / Lend Item',
  subscription: 'Add Subscription',
  contact: 'Add Person',
  sharedGroup: 'Create Shared Group',
};

export function GlobalAddSheet() {
  const activeAddFlow = useUiStore((state) => state.activeAddFlow);
  const openAddFlow = useUiStore((state) => state.openAddFlow);
  const closeAddFlow = useUiStore((state) => state.closeAddFlow);
  const chooserTab = useUiStore((state) => state.chooserTab);
  const setChooserTab = useUiStore((state) => state.setChooserTab);
  const open = Boolean(activeAddFlow);
  const title = activeAddFlow ? flowTitles[activeAddFlow] : 'Add';

  // Pre-selected category passed when user taps a tile
  const [presetExpense, setPresetExpense] = useState<ExpenseCategory | undefined>();
  const [presetIncome, setPresetIncome] = useState<IncomeCategory | undefined>();

  function done() {
    closeAddFlow();
    setPresetExpense(undefined);
    setPresetIncome(undefined);
  }

  function pickExpense(category: ExpenseCategory) {
    setPresetExpense(category);
    openAddFlow('expense');
  }

  function pickIncome(category: IncomeCategory) {
    setPresetIncome(category);
    openAddFlow('income');
  }

  return (
    <BottomSheet open={open} title={title} onClose={done}>
      {activeAddFlow === 'chooser' ? (
        <div className="space-y-5 animate-rise">
          <ChooserTabs value={chooserTab} onChange={setChooserTab} />
          {chooserTab === 'expense' ? (
            <CategoryGrid
              items={EXPENSE_CATEGORIES.map((cat) => {
                const style = getExpenseCategoryStyle(cat);
                return { key: cat, label: cat, Icon: style.icon, bg: style.bg, fg: style.fg };
              })}
              onPick={(key) => pickExpense(key as ExpenseCategory)}
            />
          ) : null}
          {chooserTab === 'income' ? (
            <CategoryGrid
              items={INCOME_CATEGORIES.map((cat) => {
                const style = getIncomeCategoryStyle(cat);
                return { key: cat, label: cat, Icon: style.icon, bg: style.bg, fg: style.fg };
              })}
              onPick={(key) => pickIncome(key as IncomeCategory)}
            />
          ) : null}
          {chooserTab === 'transfer' ? (
            <TransferLanding onStart={() => openAddFlow('transfer')} />
          ) : null}

          <div className="border-t border-zinc-200 pt-4 dark:border-zinc-800">
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">More</p>
            <div className="grid grid-cols-2 gap-2">
              <SmallChoice icon={<Users size={18} />} label="Shared expense" onClick={() => openAddFlow('sharedExpense')} />
              <SmallChoice icon={<HandCoins size={18} />} label="Loan / Due" onClick={() => openAddFlow('loan')} />
              <SmallChoice icon={<PackageOpen size={18} />} label="Borrow / Lend item" onClick={() => openAddFlow('item')} />
              <SmallChoice icon={<Repeat size={18} />} label="Subscription" onClick={() => openAddFlow('subscription')} />
              <SmallChoice icon={<UserPlus size={18} />} label="Person" onClick={() => openAddFlow('contact')} />
              <SmallChoice icon={<Users size={18} />} label="Shared group" onClick={() => openAddFlow('sharedGroup')} />
            </div>
          </div>
        </div>
      ) : null}
      {activeAddFlow === 'expense' ? (
        <ExpenseForm onDone={done} initialCategory={presetExpense} />
      ) : null}
      {activeAddFlow === 'income' ? (
        <IncomeForm onDone={done} initialCategory={presetIncome} />
      ) : null}
      {activeAddFlow === 'transfer' ? <TransferForm onDone={done} /> : null}
      {activeAddFlow === 'sharedExpense' ? <SharedExpenseForm onDone={done} /> : null}
      {activeAddFlow === 'loan' ? <LoanForm onDone={done} /> : null}
      {activeAddFlow === 'item' ? <ItemForm onDone={done} /> : null}
      {activeAddFlow === 'subscription' ? <SubscriptionForm onDone={done} /> : null}
      {activeAddFlow === 'contact' ? <ContactForm onDone={done} /> : null}
      {activeAddFlow === 'sharedGroup' ? <SharedGroupForm onDone={done} /> : null}
    </BottomSheet>
  );
}

function ChooserTabs({ value, onChange }: { value: ChooserTab; onChange: (v: ChooserTab) => void }) {
  const tabs: { value: ChooserTab; label: string; activeClass: string }[] = [
    { value: 'expense', label: 'Expense', activeClass: 'bg-rose-600 text-white shadow-sm shadow-rose-600/25' },
    { value: 'income', label: 'Income', activeClass: 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/25' },
    { value: 'transfer', label: 'Transfer', activeClass: 'bg-sky-600 text-white shadow-sm shadow-sky-600/25' },
  ];
  return (
    <div className="grid grid-cols-3 gap-1.5 rounded-2xl bg-zinc-100 p-1.5 dark:bg-zinc-900">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          onClick={() => onChange(tab.value)}
          className={clsx(
            'min-h-11 rounded-xl text-sm font-bold tracking-tight transition',
            value === tab.value ? tab.activeClass : 'text-zinc-600 dark:text-zinc-300',
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function CategoryGrid({
  items,
  onPick,
}: {
  items: { key: string; label: string; Icon: React.ComponentType<{ size?: number; strokeWidth?: number }>; bg: string; fg: string }[];
  onPick: (key: string) => void;
}) {
  return (
    <div className="grid grid-cols-4 gap-3">
      {items.map((item) => {
        const Icon = item.Icon;
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => onPick(item.key)}
            className="flex flex-col items-center gap-1.5 rounded-2xl p-2 text-center active:bg-zinc-100 dark:active:bg-zinc-800"
          >
            <span className={clsx('grid h-14 w-14 place-items-center rounded-2xl', item.bg, item.fg)}>
              <Icon size={22} strokeWidth={2} />
            </span>
            <span className="line-clamp-1 text-[0.72rem] font-semibold text-zinc-700 dark:text-zinc-200">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function TransferLanding({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl bg-sky-50 p-6 text-center dark:bg-sky-950/40">
      <span className="grid h-16 w-16 place-items-center rounded-2xl bg-sky-600 text-white">
        <ArrowLeftRight size={28} />
      </span>
      <p className="text-base font-bold tracking-tight text-zinc-950 dark:text-zinc-50">Move money between accounts</p>
      <p className="max-w-xs text-sm text-zinc-600 dark:text-zinc-300">
        Record transfers between Cash, bKash, Nagad, Card, or Bank — fees are tracked separately.
      </p>
      <button
        type="button"
        onClick={onStart}
        className="mt-1 inline-flex min-h-11 items-center gap-2 rounded-xl bg-sky-600 px-5 text-sm font-bold text-white shadow-sm shadow-sky-600/25 active:bg-sky-700"
      >
        <Plus size={18} /> Add transfer
      </button>
    </div>
  );
}

function SmallChoice({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-12 items-center gap-3 rounded-xl bg-zinc-50 px-3 text-left text-sm font-semibold text-zinc-700 ring-1 ring-zinc-200 active:bg-zinc-100 dark:bg-zinc-900 dark:text-zinc-200 dark:ring-zinc-800 dark:active:bg-zinc-800"
    >
      <span className="grid h-9 w-9 place-items-center rounded-lg bg-white text-indigo-600 ring-1 ring-zinc-200 dark:bg-zinc-950 dark:ring-zinc-800">
        {icon}
      </span>
      {label}
    </button>
  );
}
