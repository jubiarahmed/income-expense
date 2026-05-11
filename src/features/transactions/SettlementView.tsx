import { useMemo, useState } from 'react';
import { ArrowRight, Check, Copy, Share2, Sparkles } from 'lucide-react';
import { clsx } from 'clsx';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { CURRENCY_SYMBOLS } from '../../domain/constants';
import { CURRENT_USER_ID, type SharedGroup } from '../../domain/models';
import { formatMoney } from '../../lib/money';
import {
  buildGroupSettlementText,
  getGroupSettlement,
  type SuggestedSettlement,
} from '../../lib/settlement';
import { useFinanceStore } from '../../state/useFinanceStore';
import { useToastStore } from '../../state/useToastStore';

export function SettlementView({ group, onDone }: { group: SharedGroup; onDone: () => void }) {
  const contacts = useFinanceStore((state) => state.contacts);
  const sharedExpenses = useFinanceStore((state) => state.sharedExpenses);
  const preferences = useFinanceStore((state) => state.preferences);
  const toggleSharedExpenseSettled = useFinanceStore((state) => state.toggleSharedExpenseSettled);
  const pushToast = useToastStore((state) => state.push);
  const [settling, setSettling] = useState<string | null>(null);

  const summary = useMemo(() => getGroupSettlement(group, sharedExpenses, contacts), [group, sharedExpenses, contacts]);
  const symbol = CURRENCY_SYMBOLS[preferences.currency];

  async function markAllSettled() {
    if (!summary.openExpenses.length) return;
    setSettling('all');
    try {
      await Promise.all(summary.openExpenses.map((expense) => toggleSharedExpenseSettled(expense.id)));
      pushToast(`${summary.openExpenses.length} shared expense${summary.openExpenses.length === 1 ? '' : 's'} settled.`, { tone: 'success' });
      onDone();
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Could not settle expenses.', { tone: 'danger' });
    } finally {
      setSettling(null);
    }
  }

  async function markSuggestionSettled(suggestion: SuggestedSettlement) {
    // Find open shared expenses where the payer is the creditor and the participant is the debtor.
    // This is a heuristic — fully resolving a single suggested payment may close multiple shared expenses.
    const candidates = summary.openExpenses.filter((expense) => {
      if (expense.payerId !== suggestion.toId) return false;
      return expense.shares.some((share) => share.contactId === suggestion.fromId);
    });
    if (!candidates.length) {
      pushToast('No open expenses match this exact suggestion. Mark them individually if needed.', { tone: 'info' });
      return;
    }
    setSettling(`${suggestion.fromId}-${suggestion.toId}`);
    try {
      await Promise.all(candidates.map((expense) => toggleSharedExpenseSettled(expense.id)));
      pushToast(`Settled ${suggestion.fromName} → ${suggestion.toName}.`, { tone: 'success' });
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Could not record settlement.', { tone: 'danger' });
    } finally {
      setSettling(null);
    }
  }

  async function shareSummary() {
    const text = buildGroupSettlementText(summary, symbol);
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await (navigator as Navigator & { share: (data: { title?: string; text?: string }) => Promise<void> }).share({
          title: `${group.name} settlement`,
          text,
        });
        return;
      } catch {
        // user dismissed — fall through to clipboard
      }
    }
    if (typeof navigator !== 'undefined' && 'clipboard' in navigator) {
      try {
        await navigator.clipboard.writeText(text);
        pushToast('Summary copied to clipboard.', { tone: 'success' });
        return;
      } catch {
        pushToast('Sharing not available on this device.', { tone: 'info' });
      }
    }
  }

  function copySummary() {
    void shareSummary();
  }

  return (
    <div className="space-y-4">
      <Card className="space-y-1">
        <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">Group total</p>
        <p className="text-2xl font-black tabular-nums">{formatMoney(summary.totalShared, preferences.currency)}</p>
        <p className="text-xs text-zinc-500">
          Open balance {formatMoney(summary.totalOpen, preferences.currency)} · {summary.openExpenses.length} unsettled expense
          {summary.openExpenses.length === 1 ? '' : 's'}
        </p>
      </Card>

      <section>
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-zinc-500">Net balance</p>
        {summary.balances.length ? (
          <div className="space-y-1.5">
            {summary.balances.map((entry) => (
              <Card key={entry.participantId} className="flex items-center justify-between p-3">
                <span className="font-bold tracking-tight">
                  {entry.displayName}
                  {entry.participantId === CURRENT_USER_ID ? <Badge tone="info" className="ml-2">you</Badge> : null}
                </span>
                <span
                  className={clsx(
                    'font-black tabular-nums',
                    entry.netAmount >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400',
                  )}
                >
                  {entry.netAmount > 0 ? 'is owed ' : 'owes '}
                  {formatMoney(Math.abs(entry.netAmount), preferences.currency)}
                </span>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-3 text-center text-sm font-semibold text-emerald-700 dark:text-emerald-300">
            Everyone is settled ✅
          </Card>
        )}
      </section>

      {summary.settlements.length ? (
        <section>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-indigo-600 dark:text-indigo-400">
            <Sparkles size={12} /> Suggested payments (minimum to settle)
          </p>
          <div className="space-y-1.5">
            {summary.settlements.map((settlement) => {
              const key = `${settlement.fromId}-${settlement.toId}`;
              const busy = settling === key;
              return (
                <Card key={key} className="space-y-3 p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">{settlement.fromName}</span>
                    <ArrowRight size={14} className="text-zinc-400" />
                    <span className="text-sm font-bold">{settlement.toName}</span>
                    <span className="ml-auto font-black tabular-nums">{formatMoney(settlement.amount, preferences.currency)}</span>
                  </div>
                  <Button
                    variant="income"
                    className="min-h-9 w-full px-2"
                    icon={<Check size={16} />}
                    disabled={busy}
                    onClick={() => void markSuggestionSettled(settlement)}
                  >
                    {busy ? 'Settling…' : 'Mark this payment as settled'}
                  </Button>
                </Card>
              );
            })}
          </div>
        </section>
      ) : null}

      {summary.openExpenses.length ? (
        <Button
          variant="primary"
          className="w-full"
          icon={<Check size={16} />}
          disabled={settling === 'all'}
          onClick={() => void markAllSettled()}
        >
          {settling === 'all' ? 'Settling…' : `Mark all ${summary.openExpenses.length} open expenses settled`}
        </Button>
      ) : null}

      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" className="min-h-12" icon={<Share2 size={16} />} onClick={() => void shareSummary()}>
          Share summary
        </Button>
        <Button variant="ghost" className="min-h-12" icon={<Copy size={16} />} onClick={copySummary}>
          Copy text
        </Button>
      </div>

      <pre className="thin-scrollbar max-h-48 overflow-auto rounded-xl bg-zinc-50 p-3 text-[0.7rem] leading-relaxed text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-300">
        {buildGroupSettlementText(summary, symbol)}
      </pre>
    </div>
  );
}
