import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity as ActivityIcon,
  ArrowDownRight,
  ArrowLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Bookmark,
  Calendar,
  Flag,
  HandCoins,
  Hash,
  PackageOpen,
  ReceiptText,
  Repeat,
  Settings as SettingsIcon,
  Target,
  Users,
  Wallet,
} from 'lucide-react';
import { clsx } from 'clsx';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, SectionHeader } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { Field, SelectInput, TextInput } from '../../components/ui/Form';
import { PullToRefresh } from '../../components/ui/PullToRefresh';
import type { ActivityEntityType, ActivityLog } from '../../domain/models';
import { formatRelativeDateTime } from '../../lib/date';
import { formatMoney } from '../../lib/money';
import { useFinanceStore } from '../../state/useFinanceStore';

const entityIcon: Record<ActivityEntityType, typeof ActivityIcon> = {
  expense: ArrowDownRight,
  income: ArrowUpRight,
  transfer: ArrowLeftRight,
  sharedExpense: Users,
  sharedGroup: Users,
  loan: HandCoins,
  loanPayment: HandCoins,
  item: PackageOpen,
  subscription: Repeat,
  contact: Users,
  budget: Target,
  wallet: Wallet,
  goal: Flag,
  goalContribution: Flag,
  settings: SettingsIcon,
};

const entityTone: Record<ActivityEntityType, string> = {
  expense: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
  income: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  transfer: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
  sharedExpense: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  sharedGroup: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  loan: 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-950 dark:text-fuchsia-300',
  loanPayment: 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-950 dark:text-fuchsia-300',
  item: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
  subscription: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
  contact: 'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200',
  budget: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300',
  wallet: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  goal: 'bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300',
  goalContribution: 'bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300',
  settings: 'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200',
};

type ActionFilter = 'all' | 'created' | 'updated' | 'deleted' | 'settled' | 'returned' | 'other';

function detectAction(activity: ActivityLog): ActionFilter {
  const title = activity.title.toLowerCase();
  if (title.startsWith('deleted') || title.includes(' deleted') || title.includes('removed')) return 'deleted';
  if (title.startsWith('updated') || title.includes(' updated') || title.startsWith('renamed')) return 'updated';
  if (title.includes('returned')) return 'returned';
  if (title.includes('settled') || title.includes('reopened') || title.startsWith('settled')) return 'settled';
  if (title.startsWith('spent') || title.startsWith('income') || title.startsWith('added') || title.startsWith('created') || title.startsWith('duplicated') || title.startsWith('saved')) return 'created';
  return 'other';
}

const actionLabel: Record<ActionFilter, string> = {
  all: 'All actions',
  created: 'Created',
  updated: 'Updated',
  deleted: 'Deleted',
  settled: 'Settled / Reopened',
  returned: 'Returned',
  other: 'Other',
};

export function ActivityPage() {
  const navigate = useNavigate();
  const reload = useFinanceStore((state) => state.reload);
  const activities = useFinanceStore((state) => state.activities);
  const preferences = useFinanceStore((state) => state.preferences);
  const [entity, setEntity] = useState<'all' | ActivityEntityType>('all');
  const [actionFilter, setActionFilter] = useState<ActionFilter>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return activities.filter((entry) => {
      if (entity !== 'all' && entry.entityType !== entity) return false;
      if (actionFilter !== 'all' && detectAction(entry) !== actionFilter) return false;
      const day = entry.createdAt.slice(0, 10);
      if (startDate && day < startDate) return false;
      if (endDate && day > endDate) return false;
      if (q) {
        const hay = `${entry.title} ${entry.detail}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [activities, entity, actionFilter, startDate, endDate, query]);

  const entityCounts = useMemo(() => {
    const map = new Map<ActivityEntityType, number>();
    for (const entry of activities) {
      map.set(entry.entityType, (map.get(entry.entityType) ?? 0) + 1);
    }
    return map;
  }, [activities]);

  return (
    <PullToRefresh onRefresh={reload}>
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <Button variant="secondary" icon={<ArrowLeft size={16} />} onClick={() => navigate(-1)}>
            Back
          </Button>
          <div className="flex flex-1 items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
              <ActivityIcon size={18} />
            </span>
            <div>
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-zinc-600 dark:text-zinc-400">Activity</p>
              <p className="text-sm font-bold tracking-tight text-zinc-700 dark:text-zinc-200">
                {activities.length} events tracked · {filtered.length} shown
              </p>
            </div>
          </div>
        </div>

        <Card className="space-y-3">
          <Field label="Search">
            <TextInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Note, category, name..." />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Entity">
              <SelectInput value={entity} onChange={(event) => setEntity(event.target.value as 'all' | ActivityEntityType)}>
                <option value="all">All entities ({activities.length})</option>
                {(['expense', 'income', 'transfer', 'sharedExpense', 'sharedGroup', 'loan', 'loanPayment', 'item', 'subscription', 'contact', 'budget', 'wallet', 'goal', 'goalContribution', 'settings'] as ActivityEntityType[]).map((option) => (
                  <option key={option} value={option}>
                    {option} ({entityCounts.get(option) ?? 0})
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Action">
              <SelectInput value={actionFilter} onChange={(event) => setActionFilter(event.target.value as ActionFilter)}>
                {(['all', 'created', 'updated', 'deleted', 'settled', 'returned', 'other'] as ActionFilter[]).map((option) => (
                  <option key={option} value={option}>
                    {actionLabel[option]}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="From">
              <TextInput type="date" value={startDate} max={endDate || undefined} onChange={(event) => setStartDate(event.target.value)} />
            </Field>
            <Field label="To">
              <TextInput
                type="date"
                value={endDate}
                min={startDate || undefined}
                onChange={(event) => {
                  const next = event.target.value;
                  if (startDate && next && next < startDate) return;
                  setEndDate(next);
                }}
              />
            </Field>
          </div>
        </Card>

        <SectionHeader title={`Latest ${activities.length === 120 ? '120' : activities.length} events`} />

        {filtered.length ? (
          <div className="space-y-2">
            {filtered.map((entry) => {
              const Icon = entityIcon[entry.entityType] ?? ActivityIcon;
              return (
                <Card key={entry.id} className="p-3">
                  <div className="flex items-start gap-3">
                    <span className={clsx('grid h-10 w-10 shrink-0 place-items-center rounded-xl', entityTone[entry.entityType])}>
                      <Icon size={18} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="truncate text-sm font-bold tracking-tight text-zinc-950 dark:text-zinc-50">{entry.title}</p>
                        <Badge tone="neutral" className="uppercase">
                          {entry.entityType}
                        </Badge>
                      </div>
                      {entry.detail ? <p className="mt-0.5 text-xs text-zinc-500">{entry.detail}</p> : null}
                      <p className="mt-0.5 text-[0.65rem] font-semibold text-zinc-400">{formatRelativeDateTime(entry.createdAt)}</p>
                    </div>
                    {entry.amount != null ? (
                      <p className="shrink-0 font-black tabular-nums text-zinc-700 dark:text-zinc-200">
                        {formatMoney(entry.amount, preferences.currency)}
                      </p>
                    ) : null}
                  </div>
                </Card>
              );
            })}
            {activities.length === 120 ? (
              <p className="px-1 text-center text-xs text-zinc-500">Showing the latest 120 events. Older history is not retained.</p>
            ) : null}
          </div>
        ) : (
          <EmptyState
            title="No matching activity"
            body={activities.length === 0 ? 'Activity will appear here as soon as you add or change records.' : 'Try widening the filters above.'}
            icon={<ActivityIcon size={22} />}
          />
        )}
      </div>
    </PullToRefresh>
  );
}

void ReceiptText;
void Calendar;
void Bookmark;
void Hash;
