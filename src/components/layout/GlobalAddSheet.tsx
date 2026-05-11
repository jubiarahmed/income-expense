import { useState } from 'react';
import { ArrowLeftRight, Bookmark, Check, HandCoins, PackageOpen, Plus, Repeat, Sparkles, UserPlus, Users, X, Zap } from 'lucide-react';
import { clsx } from 'clsx';
import { BottomSheet } from '../ui/BottomSheet';
import { QuickAddBar } from '../ui/QuickAddBar';
import { ExpenseForm } from '../../features/transactions/ExpenseForm';
import { IncomeForm } from '../../features/transactions/IncomeForm';
import { TransferForm } from '../../features/transactions/TransferForm';
import { SharedExpenseForm } from '../../features/transactions/SharedExpenseForm';
import { LoanForm } from '../../features/obligations/LoanForm';
import { ItemForm } from '../../features/obligations/ItemForm';
import { SubscriptionForm } from '../../features/obligations/SubscriptionForm';
import { ContactForm } from '../../features/people/ContactForm';
import { SharedGroupForm } from '../../features/transactions/SharedGroupForm';
import { getExpenseCategoryStyle, getIncomeCategoryStyle } from '../../domain/categoryIcons';
import { getAllExpenseCategories, getAllIncomeCategories } from '../../domain/customCategories';
import { useFinanceStore } from '../../state/useFinanceStore';
import { useToastStore } from '../../state/useToastStore';
import { useUiStore, type AddFlowType, type ChooserTab } from '../../state/useUiStore';
import type { ExpenseCategory, IncomeCategory, PaymentMethod, TransactionTemplate } from '../../domain/models';
import { todayISO } from '../../lib/date';

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
  const expenses = useFinanceStore((state) => state.expenses);
  const incomes = useFinanceStore((state) => state.incomes);
  const templates = useFinanceStore((state) => state.templates);
  const addExpense = useFinanceStore((state) => state.addExpense);
  const addIncome = useFinanceStore((state) => state.addIncome);
  const addTransfer = useFinanceStore((state) => state.addTransfer);
  const recordTemplateUse = useFinanceStore((state) => state.recordTemplateUse);
  const pushToast = useToastStore((state) => state.push);
  const open = Boolean(activeAddFlow);
  const title = activeAddFlow ? flowTitles[activeAddFlow] : 'Add';

  // Pre-selected category passed when user taps a tile
  const [presetExpense, setPresetExpense] = useState<ExpenseCategory | undefined>();
  const [presetIncome, setPresetIncome] = useState<IncomeCategory | undefined>();
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customDraft, setCustomDraft] = useState('');

  function done() {
    closeAddFlow();
    setPresetExpense(undefined);
    setPresetIncome(undefined);
    setShowCustomInput(false);
    setCustomDraft('');
  }

  function pickExpense(category: ExpenseCategory) {
    setPresetExpense(category);
    openAddFlow('expense');
  }

  function pickIncome(category: IncomeCategory) {
    setPresetIncome(category);
    openAddFlow('income');
  }

  function submitCustom() {
    const name = customDraft.trim();
    if (!name) return;
    setShowCustomInput(false);
    setCustomDraft('');
    if (chooserTab === 'expense') pickExpense(name);
    else if (chooserTab === 'income') pickIncome(name);
  }

  const expenseCategoryNames = getAllExpenseCategories(expenses);
  const incomeCategoryNames = getAllIncomeCategories(incomes);

  const templatesForTab = templates.filter((template) => template.kind === chooserTab).slice(0, 6);

  async function applyTemplate(template: TransactionTemplate) {
    try {
      if (template.kind === 'expense') {
        if (template.data.amount) {
          await addExpense({
            amount: template.data.amount,
            category: template.data.category ?? 'Other',
            note: template.data.note ?? '',
            merchant: template.data.merchant,
            date: todayISO(),
            paymentMethod: (template.data.paymentMethod as PaymentMethod) ?? 'Cash',
            tags: template.data.tags ?? '',
          });
          await recordTemplateUse(template.id);
          pushToast(`Logged ${template.name}.`, { tone: 'success' });
          done();
        } else {
          setPresetExpense(template.data.category);
          openAddFlow('expense');
          void recordTemplateUse(template.id);
        }
      } else if (template.kind === 'income') {
        if (template.data.amount) {
          await addIncome({
            amount: template.data.amount,
            category: template.data.category ?? 'Others',
            source: template.data.source ?? '',
            note: template.data.note ?? '',
            date: todayISO(),
            paymentMethod: (template.data.paymentMethod as PaymentMethod) ?? 'Bank',
          });
          await recordTemplateUse(template.id);
          pushToast(`Logged ${template.name}.`, { tone: 'success' });
          done();
        } else {
          setPresetIncome(template.data.category);
          openAddFlow('income');
          void recordTemplateUse(template.id);
        }
      } else {
        if (template.data.amount) {
          await addTransfer({
            amount: template.data.amount,
            fromMethod: (template.data.fromMethod as PaymentMethod) ?? 'Bank',
            toMethod: (template.data.toMethod as PaymentMethod) ?? 'Cash',
            fee: template.data.fee ?? 0,
            date: todayISO(),
            note: template.data.note ?? '',
          });
          await recordTemplateUse(template.id);
          pushToast(`Logged ${template.name}.`, { tone: 'success' });
          done();
        } else {
          openAddFlow('transfer');
          void recordTemplateUse(template.id);
        }
      }
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Could not apply template.', { tone: 'danger' });
    }
  }

  return (
    <BottomSheet open={open} title={title} onClose={done}>
      {activeAddFlow === 'chooser' ? (
        <div className="space-y-5 animate-rise">
          <QuickAddBar />

          <ChooserTabs value={chooserTab} onChange={setChooserTab} />

          {templatesForTab.length ? (
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                <Bookmark size={12} /> Templates
              </p>
              <div className="flex flex-wrap gap-2">
                {templatesForTab.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => void applyTemplate(template)}
                    className={clsx(
                      'inline-flex min-h-10 items-center gap-2 rounded-full border px-3 text-xs font-bold transition',
                      template.kind === 'expense'
                        ? 'border-rose-200 bg-rose-50 text-rose-700 active:bg-rose-100 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300'
                        : template.kind === 'income'
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700 active:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300'
                          : 'border-sky-200 bg-sky-50 text-sky-700 active:bg-sky-100 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-300',
                    )}
                  >
                    <Zap size={12} />
                    {template.name}
                    {template.data.amount ? (
                      <span className="rounded-full bg-white/70 px-1.5 text-[0.6rem] tabular-nums dark:bg-zinc-900/70">{template.data.amount}</span>
                    ) : null}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {showCustomInput && (chooserTab === 'expense' || chooserTab === 'income') ? (
            <CustomCategoryRow
              tone={chooserTab}
              value={customDraft}
              onChange={setCustomDraft}
              onSubmit={submitCustom}
              onCancel={() => {
                setShowCustomInput(false);
                setCustomDraft('');
              }}
            />
          ) : null}

          {chooserTab === 'expense' ? (
            <CategoryGrid
              items={expenseCategoryNames.map((cat) => {
                const style = getExpenseCategoryStyle(cat);
                return { key: cat, label: cat, Icon: style.icon, bg: style.bg, fg: style.fg };
              })}
              onPick={(key) => pickExpense(key as ExpenseCategory)}
              onAddCustom={() => setShowCustomInput(true)}
              addLabel="Custom"
            />
          ) : null}
          {chooserTab === 'income' ? (
            <CategoryGrid
              items={incomeCategoryNames.map((cat) => {
                const style = getIncomeCategoryStyle(cat);
                return { key: cat, label: cat, Icon: style.icon, bg: style.bg, fg: style.fg };
              })}
              onPick={(key) => pickIncome(key as IncomeCategory)}
              onAddCustom={() => setShowCustomInput(true)}
              addLabel="Custom"
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
            <button
              type="button"
              onClick={() => {
                closeAddFlow();
                window.location.assign('/templates');
              }}
              className="mt-3 inline-flex min-h-9 items-center gap-1.5 text-xs font-bold text-violet-600 active:text-violet-700 dark:text-violet-400"
            >
              <Bookmark size={14} /> Manage templates
            </button>
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
  onAddCustom,
  addLabel = 'Custom',
}: {
  items: { key: string; label: string; Icon: React.ComponentType<{ size?: number; strokeWidth?: number }>; bg: string; fg: string }[];
  onPick: (key: string) => void;
  onAddCustom?: () => void;
  addLabel?: string;
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
      {onAddCustom ? (
        <button
          type="button"
          onClick={onAddCustom}
          className="flex flex-col items-center gap-1.5 rounded-2xl p-2 text-center active:bg-zinc-100 dark:active:bg-zinc-800"
        >
          <span className="grid h-14 w-14 place-items-center rounded-2xl border-2 border-dashed border-indigo-300 bg-indigo-50 text-indigo-600 dark:border-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300">
            <Plus size={22} strokeWidth={2.4} />
          </span>
          <span className="line-clamp-1 text-[0.72rem] font-semibold text-indigo-600 dark:text-indigo-300">{addLabel}</span>
        </button>
      ) : null}
    </div>
  );
}

function CustomCategoryRow({
  tone,
  value,
  onChange,
  onSubmit,
  onCancel,
}: {
  tone: 'expense' | 'income';
  value: string;
  onChange: (next: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  const accent =
    tone === 'expense'
      ? 'focus:border-rose-500 focus:ring-rose-500/15 text-rose-700 dark:text-rose-300'
      : 'focus:border-emerald-500 focus:ring-emerald-500/15 text-emerald-700 dark:text-emerald-300';
  const buttonTone =
    tone === 'expense'
      ? 'bg-rose-600 active:bg-rose-700'
      : 'bg-emerald-600 active:bg-emerald-700';
  return (
    <div className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-3 dark:border-indigo-900 dark:bg-indigo-950/30">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-indigo-600 dark:text-indigo-300">
        <Sparkles size={14} /> Add custom category
      </p>
      <div className="flex items-center gap-2">
        <input
          autoFocus
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onSubmit();
            }
            if (e.key === 'Escape') {
              e.preventDefault();
              onCancel();
            }
          }}
          maxLength={40}
          placeholder={tone === 'expense' ? 'e.g. Insurance, Childcare' : 'e.g. Tuition, Royalty'}
          className={clsx(
            'min-h-11 flex-1 rounded-xl border border-zinc-200 bg-white px-3 text-sm font-semibold outline-none transition placeholder:font-normal placeholder:text-zinc-400 focus:ring-4 dark:border-zinc-700 dark:bg-zinc-900',
            accent,
          )}
        />
        <button
          type="button"
          onClick={onSubmit}
          disabled={!value.trim()}
          className={clsx(
            'grid h-11 w-11 place-items-center rounded-xl text-white shadow-sm transition disabled:opacity-50',
            buttonTone,
          )}
          aria-label="Use this category"
        >
          <Check size={18} />
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="grid h-11 w-11 place-items-center rounded-xl bg-white text-zinc-600 ring-1 ring-zinc-200 active:bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-300 dark:ring-zinc-700"
          aria-label="Cancel"
        >
          <X size={18} />
        </button>
      </div>
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
