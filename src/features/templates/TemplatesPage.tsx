import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowDownRight, ArrowLeft, ArrowLeftRight, ArrowUpRight, Bookmark, Pencil, Plus, Trash2, Zap } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { Button } from '../../components/ui/Button';
import { Card, SectionHeader } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { ChipButton, Field, SelectInput, TextArea, TextInput } from '../../components/ui/Form';
import { PullToRefresh } from '../../components/ui/PullToRefresh';
import { PAYMENT_METHODS } from '../../domain/constants';
import { getAllExpenseCategories, getAllIncomeCategories } from '../../domain/customCategories';
import { todayISO } from '../../lib/date';
import { formatMoney } from '../../lib/money';
import type { PaymentMethod, TransactionTemplate, TransactionTemplateKind } from '../../domain/models';
import { useFinanceStore } from '../../state/useFinanceStore';
import { useToastStore } from '../../state/useToastStore';
import { clsx } from 'clsx';

const kindBadge: Record<TransactionTemplateKind, 'danger' | 'good' | 'info'> = {
  expense: 'danger',
  income: 'good',
  transfer: 'info',
};

const kindIcon: Record<TransactionTemplateKind, typeof ArrowDownRight> = {
  expense: ArrowDownRight,
  income: ArrowUpRight,
  transfer: ArrowLeftRight,
};

export function TemplatesPage() {
  const navigate = useNavigate();
  const reload = useFinanceStore((state) => state.reload);
  const templates = useFinanceStore((state) => state.templates);
  const preferences = useFinanceStore((state) => state.preferences);
  const deleteTemplate = useFinanceStore((state) => state.deleteTemplate);

  const [editing, setEditing] = useState<TransactionTemplate | undefined>();
  const [adding, setAdding] = useState(false);

  return (
    <PullToRefresh onRefresh={reload}>
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <Button variant="secondary" icon={<ArrowLeft size={16} />} onClick={() => navigate(-1)}>
            Back
          </Button>
          <div className="flex flex-1 items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-violet-100 text-violet-600 dark:bg-violet-950 dark:text-violet-300">
              <Bookmark size={18} />
            </span>
            <div>
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-violet-600 dark:text-violet-400">Templates</p>
              <p className="text-sm font-bold tracking-tight text-zinc-700 dark:text-zinc-200">
                {templates.length} saved
              </p>
            </div>
          </div>
          <Button variant="primary" icon={<Plus size={16} />} onClick={() => setAdding(true)}>
            Add
          </Button>
        </div>

        <Card className="space-y-1">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-violet-600 dark:text-violet-400">
            <Zap size={12} /> Tip
          </p>
          <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-300">
            Save common entries (lunch, bus fare, monthly recharge) as templates so logging them later takes one tap.
            Apply from the Add sheet's Templates section.
          </p>
        </Card>

        <SectionHeader title="All templates" />

        {templates.length ? (
          <div className="space-y-2">
            {templates.map((template) => {
              const Icon = kindIcon[template.kind];
              return (
                <Card key={template.id} className="space-y-3">
                  <div className="flex items-start gap-3">
                    <span
                      className={clsx(
                        'grid h-12 w-12 shrink-0 place-items-center rounded-xl',
                        template.kind === 'expense'
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                          : template.kind === 'income'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
                      )}
                    >
                      <Icon size={20} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold tracking-tight text-zinc-950 dark:text-zinc-50">{template.name}</p>
                      <p className="mt-0.5 text-xs text-zinc-500">
                        {template.kind === 'transfer'
                          ? `${template.data.fromMethod ?? '?'} → ${template.data.toMethod ?? '?'}`
                          : `${template.data.category ?? '—'} · ${template.data.paymentMethod ?? 'Any'}`}
                      </p>
                      {template.data.note || template.data.merchant ? (
                        <p className="mt-0.5 truncate text-xs text-zinc-400">
                          {template.data.merchant || template.data.note}
                        </p>
                      ) : null}
                    </div>
                    <div className="text-right">
                      <Badge tone={kindBadge[template.kind]}>{template.kind}</Badge>
                      {template.data.amount ? (
                        <p className="mt-1 font-black tabular-nums">{formatMoney(template.data.amount, preferences.currency)}</p>
                      ) : null}
                    </div>
                  </div>
                  <p className="text-[0.65rem] text-zinc-400">Used {template.usesCount}× · last {template.lastUsedAt ? new Date(template.lastUsedAt).toLocaleDateString() : 'never'}</p>
                  <div className="flex gap-2">
                    <Button variant="ghost" className="min-h-9 flex-1 px-2" icon={<Pencil size={16} />} onClick={() => setEditing(template)}>
                      Edit
                    </Button>
                    <Button variant="ghost" className="min-h-9 px-3 text-rose-600" icon={<Trash2 size={16} />} onClick={() => void deleteTemplate(template.id)}>
                      Delete
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title="No templates yet"
            body="Save your daily lunch, monthly recharge, or any repeating transaction so you can log it with one tap."
            icon={<Bookmark size={22} />}
          />
        )}

        <BottomSheet
          open={adding || Boolean(editing)}
          title={editing ? 'Edit Template' : 'New Template'}
          onClose={() => {
            setAdding(false);
            setEditing(undefined);
          }}
        >
          <TemplateForm
            template={editing}
            onDone={() => {
              setAdding(false);
              setEditing(undefined);
            }}
          />
        </BottomSheet>
      </div>
    </PullToRefresh>
  );
}

function TemplateForm({ template, onDone }: { template?: TransactionTemplate; onDone: () => void }) {
  const addTemplate = useFinanceStore((state) => state.addTemplate);
  const updateTemplate = useFinanceStore((state) => state.updateTemplate);
  const expenses = useFinanceStore((state) => state.expenses);
  const incomes = useFinanceStore((state) => state.incomes);
  const pushToast = useToastStore((state) => state.push);
  const [kind, setKind] = useState<TransactionTemplateKind>(template?.kind ?? 'expense');
  const [name, setName] = useState(template?.name ?? '');
  const [amount, setAmount] = useState(template?.data.amount?.toString() ?? '');
  const [category, setCategory] = useState(template?.data.category ?? (kind === 'income' ? 'Salary' : 'Food'));
  const [note, setNote] = useState(template?.data.note ?? '');
  const [merchant, setMerchant] = useState(template?.data.merchant ?? '');
  const [source, setSource] = useState(template?.data.source ?? '');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(template?.data.paymentMethod ?? 'Cash');
  const [fromMethod, setFromMethod] = useState<PaymentMethod>(template?.data.fromMethod ?? 'Bank');
  const [toMethod, setToMethod] = useState<PaymentMethod>(template?.data.toMethod ?? 'Cash');
  const [fee, setFee] = useState(template?.data.fee?.toString() ?? '');
  const [tags, setTags] = useState(template?.data.tags ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const expenseCategories = useMemo(() => getAllExpenseCategories(expenses), [expenses]);
  const incomeCategories = useMemo(() => getAllIncomeCategories(incomes), [incomes]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const data = kind === 'transfer'
        ? { amount: amount ? Number(amount) : undefined, fromMethod, toMethod, fee: fee ? Number(fee) : 0, note: note.trim() || undefined }
        : kind === 'income'
          ? { amount: amount ? Number(amount) : undefined, category, source: source.trim() || undefined, note: note.trim() || undefined, paymentMethod }
          : {
              amount: amount ? Number(amount) : undefined,
              category,
              note: note.trim() || undefined,
              merchant: merchant.trim() || undefined,
              paymentMethod,
              tags: tags.trim() || undefined,
            };
      const input = { name: name.trim(), kind, data };
      if (template) await updateTemplate(template.id, input);
      else await addTemplate(input);
      pushToast(template ? 'Template updated.' : 'Template saved.', { tone: 'success' });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save template');
    } finally {
      setSaving(false);
    }
  }

  // Sync the category when switching kind
  function changeKind(next: TransactionTemplateKind) {
    setKind(next);
    if (next === 'income') setCategory('Salary');
    else if (next === 'expense') setCategory('Food');
  }

  return (
    <form className="space-y-4" onSubmit={submit}>
      <Field label="Template name">
        <TextInput value={name} onChange={(event) => setName(event.target.value)} placeholder="Lunch, Monthly recharge..." required autoFocus maxLength={60} />
      </Field>

      <div className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">Type</p>
        <div className="grid grid-cols-3 gap-2">
          {(['expense', 'income', 'transfer'] as TransactionTemplateKind[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => changeKind(option)}
              className={clsx(
                'min-h-10 rounded-xl text-xs font-bold capitalize transition',
                kind === option
                  ? option === 'expense'
                    ? 'bg-rose-600 text-white'
                    : option === 'income'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-sky-600 text-white'
                  : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300',
              )}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <Field label="Amount (optional)">
        <TextInput
          inputMode="decimal"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          placeholder="Leave blank to prompt every time"
        />
      </Field>

      {kind !== 'transfer' ? (
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">Category</p>
          <div className="flex flex-wrap gap-2">
            {(kind === 'expense' ? expenseCategories : incomeCategories).map((option) => (
              <ChipButton key={option} active={category === option} onClick={() => setCategory(option)} tone={kind === 'expense' ? 'expense' : 'income'}>
                {option}
              </ChipButton>
            ))}
          </div>
        </div>
      ) : null}

      {kind === 'expense' ? (
        <>
          <Field label="Merchant / Payee">
            <TextInput value={merchant} onChange={(event) => setMerchant(event.target.value)} placeholder="KFC, Pathao..." maxLength={40} />
          </Field>
          <Field label="Tags">
            <TextInput value={tags} onChange={(event) => setTags(event.target.value)} placeholder="comma, separated" />
          </Field>
        </>
      ) : null}

      {kind === 'income' ? (
        <Field label="Source">
          <TextInput value={source} onChange={(event) => setSource(event.target.value)} placeholder="Employer, client..." maxLength={60} />
        </Field>
      ) : null}

      {kind === 'transfer' ? (
        <div className="grid grid-cols-2 gap-3">
          <Field label="From">
            <SelectInput value={fromMethod} onChange={(event) => setFromMethod(event.target.value as PaymentMethod)}>
              {PAYMENT_METHODS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="To">
            <SelectInput value={toMethod} onChange={(event) => setToMethod(event.target.value as PaymentMethod)}>
              {PAYMENT_METHODS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Fee (optional)">
            <TextInput inputMode="decimal" value={fee} onChange={(event) => setFee(event.target.value)} placeholder="0" />
          </Field>
        </div>
      ) : (
        <Field label="Payment method">
          <SelectInput value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}>
            {PAYMENT_METHODS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </SelectInput>
        </Field>
      )}

      <Field label="Note">
        <TextArea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional details" />
      </Field>

      {error ? <p className="text-sm font-semibold text-rose-600">{error}</p> : null}
      <Button className="w-full" type="submit" disabled={saving}>
        {saving ? 'Saving…' : template ? 'Save template' : 'Save template'}
      </Button>
    </form>
  );
}

void todayISO;
