import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Pencil, Plus, Tag, Trash2, X } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, SectionHeader } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { Field, TextInput } from '../../components/ui/Form';
import { PullToRefresh } from '../../components/ui/PullToRefresh';
import { formatMoney } from '../../lib/money';
import { useFinanceStore } from '../../state/useFinanceStore';
import { useToastStore } from '../../state/useToastStore';

export function TagsPage() {
  const navigate = useNavigate();
  const reload = useFinanceStore((state) => state.reload);
  const expenses = useFinanceStore((state) => state.expenses);
  const preferences = useFinanceStore((state) => state.preferences);
  const renameTag = useFinanceStore((state) => state.renameTag);
  const deleteTag = useFinanceStore((state) => state.deleteTag);
  const pushToast = useToastStore((state) => state.push);
  const [renaming, setRenaming] = useState<string | undefined>();
  const [renameDraft, setRenameDraft] = useState('');

  const tagStats = useMemo(() => {
    const map = new Map<string, { count: number; total: number; categories: Set<string> }>();
    for (const expense of expenses) {
      for (const tag of expense.tags) {
        if (!tag) continue;
        const entry = map.get(tag) ?? { count: 0, total: 0, categories: new Set<string>() };
        entry.count += 1;
        entry.total += expense.amount;
        entry.categories.add(expense.category);
        map.set(tag, entry);
      }
    }
    return [...map.entries()]
      .map(([tag, { count, total, categories }]) => ({ tag, count, total, categories: [...categories] }))
      .sort((a, b) => b.count - a.count);
  }, [expenses]);

  async function applyRename(from: string) {
    const to = renameDraft.trim();
    if (!to || to === from) {
      setRenaming(undefined);
      setRenameDraft('');
      return;
    }
    try {
      await renameTag({ from, to });
      pushToast(`Renamed "${from}" → "${to}".`);
      setRenaming(undefined);
      setRenameDraft('');
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Could not rename tag.', { tone: 'danger' });
    }
  }

  async function remove(tag: string) {
    try {
      await deleteTag(tag);
      pushToast(`Removed tag "${tag}".`);
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Could not delete tag.', { tone: 'danger' });
    }
  }

  return (
    <PullToRefresh onRefresh={reload}>
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <Button variant="secondary" icon={<ArrowLeft size={16} />} onClick={() => navigate(-1)}>
            Back
          </Button>
          <div className="flex flex-1 items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-fuchsia-100 text-fuchsia-600 dark:bg-fuchsia-950 dark:text-fuchsia-300">
              <Tag size={18} />
            </span>
            <div>
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-fuchsia-600 dark:text-fuchsia-400">Tags</p>
              <p className="text-sm font-bold tracking-tight text-zinc-700 dark:text-zinc-200">{tagStats.length} unique</p>
            </div>
          </div>
        </div>

        <Card className="space-y-1 p-4">
          <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-300">
            Manage the free-form tags you've added to expenses. Renaming a tag updates every expense that uses it.
            Renaming into an existing tag <strong>merges</strong> them automatically.
          </p>
        </Card>

        <SectionHeader title="All tags" />

        {tagStats.length ? (
          <div className="space-y-2">
            {tagStats.map((entry) => (
              <Card key={entry.tag} className="p-3">
                {renaming === entry.tag ? (
                  <div className="space-y-2">
                    <Field label={`Rename "${entry.tag}" to`}>
                      <TextInput
                        autoFocus
                        value={renameDraft}
                        onChange={(event) => setRenameDraft(event.target.value)}
                        maxLength={40}
                        placeholder="new tag"
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            void applyRename(entry.tag);
                          }
                          if (event.key === 'Escape') {
                            event.preventDefault();
                            setRenaming(undefined);
                            setRenameDraft('');
                          }
                        }}
                      />
                    </Field>
                    <div className="flex gap-2">
                      <Button variant="primary" icon={<Check size={16} />} className="flex-1" onClick={() => void applyRename(entry.tag)} disabled={!renameDraft.trim()}>
                        Save
                      </Button>
                      <Button
                        variant="ghost"
                        icon={<X size={16} />}
                        onClick={() => {
                          setRenaming(undefined);
                          setRenameDraft('');
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                    <p className="text-xs text-zinc-500">
                      Tip: rename into an existing tag to merge them.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-bold tracking-tight text-zinc-950 dark:text-zinc-50">#{entry.tag}</p>
                        <p className="mt-0.5 text-xs text-zinc-500">
                          {entry.count} expense{entry.count === 1 ? '' : 's'} · {formatMoney(entry.total, preferences.currency)} total
                        </p>
                      </div>
                      <Badge tone="info">{entry.categories.length} categor{entry.categories.length === 1 ? 'y' : 'ies'}</Badge>
                    </div>
                    {entry.categories.length ? (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {entry.categories.map((category) => (
                          <span key={category} className="rounded-full bg-zinc-100 px-2 py-0.5 text-[0.65rem] font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                            {category}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    <div className="mt-3 flex gap-2">
                      <Button
                        variant="ghost"
                        className="min-h-9 flex-1 px-2"
                        icon={<Pencil size={16} />}
                        onClick={() => {
                          setRenaming(entry.tag);
                          setRenameDraft(entry.tag);
                        }}
                      >
                        Rename / Merge
                      </Button>
                      <Button
                        variant="ghost"
                        className="min-h-9 px-3 text-rose-600"
                        icon={<Trash2 size={16} />}
                        onClick={() => void remove(entry.tag)}
                      >
                        Remove
                      </Button>
                    </div>
                  </>
                )}
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No tags yet"
            body="Add tags when logging expenses (e.g. work, family, treat). Then come back to organize and analyze them here."
            icon={<Tag size={22} />}
          />
        )}
      </div>
    </PullToRefresh>
  );
}

void Plus;
