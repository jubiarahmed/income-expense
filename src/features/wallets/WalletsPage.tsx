import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowDownRight, ArrowLeft, ArrowLeftRight, ArrowUpRight, Banknote, CreditCard, Pencil, Smartphone, Wallet, X } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { Button } from '../../components/ui/Button';
import { Card, SectionHeader } from '../../components/ui/Card';
import { Field, SelectInput, TextInput } from '../../components/ui/Form';
import { PullToRefresh } from '../../components/ui/PullToRefresh';
import { PAYMENT_METHODS } from '../../domain/constants';
import type { CurrencyCode, PaymentMethod, Wallet as WalletType } from '../../domain/models';
import { formatMoney } from '../../lib/money';
import { getTotalLiquidBalance, getWalletBalances, type WalletBalance } from '../../lib/moneyAnalytics';
import { useFinanceStore } from '../../state/useFinanceStore';
import { useUiStore } from '../../state/useUiStore';
import { clsx } from 'clsx';

const methodIcon: Record<PaymentMethod, typeof Wallet> = {
  Cash: Banknote,
  bKash: Smartphone,
  Nagad: Smartphone,
  Card: CreditCard,
  Bank: Wallet,
  Other: Wallet,
};

const methodTone: Record<PaymentMethod, { bg: string; fg: string }> = {
  Cash: { bg: 'bg-emerald-100 dark:bg-emerald-950', fg: 'text-emerald-600 dark:text-emerald-300' },
  bKash: { bg: 'bg-pink-100 dark:bg-pink-950', fg: 'text-pink-600 dark:text-pink-300' },
  Nagad: { bg: 'bg-orange-100 dark:bg-orange-950', fg: 'text-orange-600 dark:text-orange-300' },
  Card: { bg: 'bg-indigo-100 dark:bg-indigo-950', fg: 'text-indigo-600 dark:text-indigo-300' },
  Bank: { bg: 'bg-sky-100 dark:bg-sky-950', fg: 'text-sky-600 dark:text-sky-300' },
  Other: { bg: 'bg-zinc-200 dark:bg-zinc-800', fg: 'text-zinc-700 dark:text-zinc-200' },
};

export function WalletsPage() {
  const navigate = useNavigate();
  const reload = useFinanceStore((state) => state.reload);
  const wallets = useFinanceStore((state) => state.wallets);
  const expenses = useFinanceStore((state) => state.expenses);
  const incomes = useFinanceStore((state) => state.incomes);
  const transfers = useFinanceStore((state) => state.transfers);
  const preferences = useFinanceStore((state) => state.preferences);
  const openAddFlow = useUiStore((state) => state.openAddFlow);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | undefined>();

  const balances = useMemo(
    () => getWalletBalances(wallets, expenses, incomes, transfers),
    [wallets, expenses, incomes, transfers],
  );
  const total = getTotalLiquidBalance(balances);

  return (
    <PullToRefresh onRefresh={reload}>
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <Button variant="secondary" icon={<ArrowLeft size={16} />} onClick={() => navigate(-1)}>
            Back
          </Button>
          <div className="flex flex-1 items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300">
              <Wallet size={18} />
            </span>
            <div>
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-400">Wallets</p>
              <p className="text-sm font-bold tracking-tight text-zinc-700 dark:text-zinc-200">
                {balances.length} accounts
              </p>
            </div>
          </div>
        </div>

        <Card className="gradient-balance text-white">
          <p className="text-xs font-bold uppercase tracking-wider text-white/70">Total liquid balance</p>
          <p className="mt-1 text-4xl font-black tabular-nums tracking-tight">{formatMoney(total, preferences.currency)}</p>
          <p className="mt-1 text-xs text-white/60">Opening balances + income − expense + transfers in − transfers out − fees</p>
        </Card>

        <div className="grid grid-cols-3 gap-2">
          <Button variant="danger" className="flex-col py-2" onClick={() => openAddFlow('expense')}>
            <ArrowDownRight size={16} />
            Expense
          </Button>
          <Button variant="income" className="flex-col py-2" onClick={() => openAddFlow('income')}>
            <ArrowUpRight size={16} />
            Income
          </Button>
          <Button variant="transfer" className="flex-col py-2" onClick={() => openAddFlow('transfer')}>
            <ArrowLeftRight size={16} />
            Transfer
          </Button>
        </div>

        <SectionHeader title="Per-wallet balances" />

        <div className="space-y-2">
          {balances.map((entry) => {
            const Icon = methodIcon[entry.method];
            const tone = methodTone[entry.method];
            const negative = entry.balance < 0;
            return (
              <Card key={entry.method} className="space-y-3">
                <div className="flex items-start gap-3">
                  <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${tone.bg} ${tone.fg}`}>
                    <Icon size={20} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold tracking-tight text-zinc-950 dark:text-zinc-50">{entry.name}</p>
                    <p className="mt-0.5 text-xs text-zinc-500">{entry.method}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[0.65rem] font-bold uppercase tracking-wide text-zinc-400">Balance</p>
                    <p
                      className={clsx(
                        'text-lg font-black tabular-nums',
                        negative ? 'text-rose-600 dark:text-rose-400' : 'text-zinc-950 dark:text-zinc-50',
                      )}
                    >
                      {formatMoney(entry.balance, preferences.currency)}
                    </p>
                  </div>
                </div>
                <BalanceBreakdown entry={entry} currency={preferences.currency} />
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    className="min-h-9 flex-1 px-2"
                    icon={<Pencil size={16} />}
                    onClick={() => setEditingMethod(entry.method)}
                  >
                    Edit opening
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>

        <BottomSheet open={Boolean(editingMethod)} title="Edit Wallet" onClose={() => setEditingMethod(undefined)}>
          {editingMethod ? (
            <WalletEditForm
              method={editingMethod}
              wallet={wallets.find((w) => w.method === editingMethod)}
              onDone={() => setEditingMethod(undefined)}
            />
          ) : null}
        </BottomSheet>
      </div>
    </PullToRefresh>
  );
}

function BalanceBreakdown({ entry, currency }: { entry: WalletBalance; currency: CurrencyCode }) {
  const rows: { label: string; value: number; tone?: string }[] = [
    { label: 'Opening', value: entry.openingBalance },
    { label: 'Income', value: entry.income, tone: 'text-emerald-600 dark:text-emerald-400' },
    { label: 'Expense', value: -entry.expense, tone: 'text-rose-600 dark:text-rose-400' },
    { label: 'Transfer in', value: entry.transfersIn, tone: 'text-sky-700 dark:text-sky-300' },
    { label: 'Transfer out', value: -entry.transfersOut, tone: 'text-sky-700 dark:text-sky-300' },
  ];
  if (entry.fees > 0) rows.push({ label: 'Fees', value: -entry.fees, tone: 'text-zinc-500' });
  return (
    <div className="grid grid-cols-3 gap-2 rounded-xl bg-zinc-50 p-2 text-xs dark:bg-zinc-800/60">
      {rows.map((row) => (
        <div key={row.label} className="text-center">
          <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">{row.label}</p>
          <p className={clsx('mt-0.5 font-bold tabular-nums', row.tone ?? 'text-zinc-700 dark:text-zinc-200')}>
            {row.value < 0 ? '−' : ''}
            {formatMoney(Math.abs(row.value), currency)}
          </p>
        </div>
      ))}
    </div>
  );
}

function WalletEditForm({
  method,
  wallet,
  onDone,
}: {
  method: PaymentMethod;
  wallet?: WalletType;
  onDone: () => void;
}) {
  const upsertWallet = useFinanceStore((state) => state.upsertWallet);
  const [name, setName] = useState(wallet?.name ?? method);
  const [openingBalance, setOpeningBalance] = useState(wallet?.openingBalance.toString() ?? '0');
  const [methodSel, setMethodSel] = useState<PaymentMethod>(method);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await upsertWallet({
        method: methodSel,
        name: name.trim() || methodSel,
        openingBalance: Number(openingBalance || 0),
      });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save wallet');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={submit}>
      <Field label="Payment method">
        <SelectInput value={methodSel} onChange={(event) => setMethodSel(event.target.value as PaymentMethod)}>
          {PAYMENT_METHODS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </SelectInput>
      </Field>
      <Field label="Display name">
        <TextInput value={name} onChange={(event) => setName(event.target.value)} placeholder={methodSel} />
      </Field>
      <Field label="Opening balance">
        <TextInput
          value={openingBalance}
          onChange={(event) => setOpeningBalance(event.target.value)}
          inputMode="decimal"
          placeholder="0"
        />
      </Field>
      <p className="text-xs text-zinc-500">
        Opening balance is the amount already in this wallet before you started tracking. The current balance is
        recomputed automatically as you log income, expenses, and transfers.
      </p>
      {error ? <p className="text-sm font-semibold text-rose-600">{error}</p> : null}
      <Button variant="income" className="w-full" type="submit" disabled={saving}>
        {saving ? 'Saving…' : 'Save wallet'}
      </Button>
    </form>
  );
}

void Badge;
void X;
