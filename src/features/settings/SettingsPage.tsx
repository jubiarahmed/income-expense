import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, BellRing, Download, LogOut, Monitor, Moon, Shield, Smartphone, Sun, Tag as TagIcon } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, SectionHeader } from '../../components/ui/Card';
import { Field, SelectInput } from '../../components/ui/Form';
import type { NotificationPrefs } from '../../domain/models';
import { clsx } from 'clsx';
import { APP_VERSION, CURRENCY_DETAILS, REMINDER_DAYS_OPTIONS } from '../../domain/constants';
import type { CurrencyCode, ThemeMode } from '../../domain/models';
import { useAuthStore } from '../../state/useAuthStore';
import { useFinanceStore } from '../../state/useFinanceStore';

export function SettingsPage() {
  const {
    preferences,
    updatePreferences,
    requestNotificationPermission,
    exportData,
  } = useFinanceStore();
  const account = useAuthStore((state) => state.account);
  const signOut = useAuthStore((state) => state.signOut);
  const navigate = useNavigate();
  const [currency, setCurrency] = useState<CurrencyCode>(preferences.currency);
  const [reminderDays, setReminderDays] = useState<number>(preferences.reminderDaysBefore || 2);
  const [theme, setTheme] = useState<ThemeMode>(preferences.theme);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const defaultNotificationPrefs = useMemo<NotificationPrefs>(
    () =>
      preferences.notificationPrefs ?? {
        remindBeforeDays: [1, 3],
        remindOnDueDate: true,
        remindAfterOverdue: true,
        dailySummary: false,
        weeklySummary: true,
        budgetWarning: true,
        subscriptionRenewal: true,
      },
    [preferences.notificationPrefs],
  );
  const [notifyPrefs, setNotifyPrefs] = useState<NotificationPrefs>(defaultNotificationPrefs);
  useEffect(() => {
    setNotifyPrefs(defaultNotificationPrefs);
  }, [defaultNotificationPrefs]);
  const standalone = window.matchMedia('(display-mode: standalone)').matches;

  useEffect(() => {
    if (theme === 'system') return;
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  async function savePreferences(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      await updatePreferences({
        currency,
        reminderDaysBefore: reminderDays,
        theme,
        notificationsEnabled: preferences.notificationsEnabled,
        notificationPrefs: notifyPrefs,
      });
      setMessage('Settings saved.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not save settings.');
    } finally {
      setSaving(false);
    }
  }

  async function changeTheme(nextTheme: ThemeMode) {
    setTheme(nextTheme);
    setSaving(true);
    setMessage('');
    try {
      await updatePreferences({
        currency: account?.role === 'superadmin' ? preferences.currency : currency,
        reminderDaysBefore: account?.role === 'superadmin' ? preferences.reminderDaysBefore || 2 : reminderDays,
        notificationsEnabled: preferences.notificationsEnabled,
        theme: nextTheme,
        notificationPrefs: notifyPrefs,
      });
      setMessage('Theme saved.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not save theme.');
    } finally {
      setSaving(false);
    }
  }

  async function downloadExport() {
    const snapshot = await exportData();
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `expense-tracker-export-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  if (account?.role === 'superadmin') {
    return (
      <div className="space-y-5">
        <Card>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-slate-500">Platform account</p>
              <h2 className="mt-1 text-2xl font-black">{account.name}</h2>
              <p className="mt-1 text-sm text-slate-500">{account.email}</p>
            </div>
            <Badge tone="info">v{APP_VERSION}</Badge>
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-2xl bg-teal-50 p-3 text-sm font-semibold text-teal-800 dark:bg-teal-950 dark:text-teal-200">
            <Shield size={18} />
            Seeded superadmin account
          </div>
          <Button variant="secondary" className="mt-4 w-full" icon={<LogOut size={16} />} onClick={() => void signOut()}>
            Sign out
          </Button>
        </Card>

        <Card className="space-y-4">
          <SectionHeader title="Appearance" />
          <div className="grid grid-cols-3 gap-2">
            <Button variant={theme === 'light' ? 'primary' : 'secondary'} icon={<Sun size={16} />} onClick={() => void changeTheme('light')}>
              Light
            </Button>
            <Button variant={theme === 'dark' ? 'primary' : 'secondary'} icon={<Moon size={16} />} onClick={() => void changeTheme('dark')}>
              Dark
            </Button>
            <Button variant={theme === 'system' ? 'primary' : 'secondary'} icon={<Monitor size={16} />} onClick={() => void changeTheme('system')}>
              Auto
            </Button>
          </div>
          {message ? <p className="text-sm font-semibold text-teal-700 dark:text-teal-300">{message}</p> : null}
        </Card>

        <Card className="space-y-3">
          <SectionHeader title="Install App" />
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-200">
              <Smartphone size={20} />
            </span>
            <div>
              <p className="font-bold">{standalone ? 'Installed mode detected' : 'Ready for Android Chrome'}</p>
              <p className="text-sm text-slate-500">Use Chrome menu, then Add to Home screen or Install app.</p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Card>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-slate-500">Personal profile</p>
            <h2 className="mt-1 text-2xl font-black">{account?.name ?? 'Expense Tracker'}</h2>
            <p className="mt-1 text-sm text-slate-500">{account?.email ?? 'Money, dues, and trust tracker'}</p>
          </div>
          <Badge tone="info">v{APP_VERSION}</Badge>
        </div>
        <Button variant="secondary" className="mt-4 w-full" icon={<LogOut size={16} />} onClick={() => void signOut()}>
          Sign out
        </Button>
      </Card>

      <form className="space-y-4" onSubmit={savePreferences}>
        <Card className="space-y-4">
          <SectionHeader title="Preferences" />
          <Field label="Currency">
            <SelectInput value={currency} onChange={(event) => setCurrency(event.target.value as CurrencyCode)}>
              {CURRENCY_DETAILS.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.symbol} {item.code} — {item.name}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Remind me this many days before due">
            <SelectInput
              value={String(reminderDays)}
              onChange={(event) => setReminderDays(Number(event.target.value))}
            >
              {REMINDER_DAYS_OPTIONS.map((days) => (
                <option key={days} value={days}>
                  {days === 0 ? 'On due date only' : `${days} day${days === 1 ? '' : 's'} before`}
                </option>
              ))}
            </SelectInput>
          </Field>
          <div className="grid grid-cols-3 gap-2">
            <Button variant={theme === 'light' ? 'primary' : 'secondary'} icon={<Sun size={16} />} onClick={() => void changeTheme('light')}>
              Light
            </Button>
            <Button variant={theme === 'dark' ? 'primary' : 'secondary'} icon={<Moon size={16} />} onClick={() => void changeTheme('dark')}>
              Dark
            </Button>
            <Button variant={theme === 'system' ? 'primary' : 'secondary'} icon={<Monitor size={16} />} onClick={() => void changeTheme('system')}>
              Auto
            </Button>
          </div>
          <Button className="w-full" type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save settings'}
          </Button>
        </Card>
      </form>

      <Card className="space-y-3">
        <SectionHeader title="Reminders" />
        <p className="text-sm leading-6 text-zinc-500">
          Open the Reminders page to see overdue items, upcoming dues, and recurring-expense suggestions based on your history.
        </p>
        <Button variant="secondary" className="w-full" icon={<BellRing size={16} />} onClick={() => navigate('/reminders')}>
          Open Reminders
        </Button>
        <Button variant="ghost" className="w-full" icon={<Bell size={16} />} onClick={() => void requestNotificationPermission()}>
          {preferences.notificationsEnabled ? 'Browser notifications on' : 'Enable browser notifications'}
        </Button>
      </Card>

      <Card className="space-y-4">
        <SectionHeader title="Notification preferences" />
        <p className="text-xs text-zinc-500">
          Choose when in-app and browser reminders should appear. Saving updates the dashboard's smart-insights
          and the Reminders page.
        </p>

        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">Remind me before due</p>
          <div className="flex flex-wrap gap-1.5">
            {[1, 3, 7, 14].map((days) => {
              const active = notifyPrefs.remindBeforeDays.includes(days);
              return (
                <button
                  key={days}
                  type="button"
                  onClick={() =>
                    setNotifyPrefs((current) => ({
                      ...current,
                      remindBeforeDays: active
                        ? current.remindBeforeDays.filter((d) => d !== days)
                        : [...current.remindBeforeDays, days].sort((a, b) => a - b),
                    }))
                  }
                  className={clsx(
                    'min-h-10 rounded-full border px-3 text-xs font-bold transition',
                    active
                      ? 'border-indigo-600 bg-indigo-600 text-white'
                      : 'border-zinc-200 bg-white text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300',
                  )}
                >
                  {days}d
                </button>
              );
            })}
          </div>
        </div>

        <PrefToggle
          label="Remind on due date"
          enabled={notifyPrefs.remindOnDueDate}
          onChange={(v) => setNotifyPrefs((c) => ({ ...c, remindOnDueDate: v }))}
        />
        <PrefToggle
          label="Remind after overdue"
          enabled={notifyPrefs.remindAfterOverdue}
          onChange={(v) => setNotifyPrefs((c) => ({ ...c, remindAfterOverdue: v }))}
        />
        <PrefToggle
          label="Daily summary"
          enabled={notifyPrefs.dailySummary}
          onChange={(v) => setNotifyPrefs((c) => ({ ...c, dailySummary: v }))}
        />
        <PrefToggle
          label="Weekly summary"
          enabled={notifyPrefs.weeklySummary}
          onChange={(v) => setNotifyPrefs((c) => ({ ...c, weeklySummary: v }))}
        />
        <PrefToggle
          label="Budget warning"
          enabled={notifyPrefs.budgetWarning}
          onChange={(v) => setNotifyPrefs((c) => ({ ...c, budgetWarning: v }))}
        />
        <PrefToggle
          label="Subscription renewal"
          enabled={notifyPrefs.subscriptionRenewal}
          onChange={(v) => setNotifyPrefs((c) => ({ ...c, subscriptionRenewal: v }))}
        />
      </Card>

      <Card className="space-y-3">
        <SectionHeader title="Tags" />
        <p className="text-sm leading-6 text-zinc-500">
          Manage every tag you've used on expenses — rename, merge, or remove them.
        </p>
        <Button variant="secondary" className="w-full" icon={<TagIcon size={16} />} onClick={() => navigate('/tags')}>
          Open Tag manager
        </Button>
      </Card>

      <Card className="space-y-3">
        <SectionHeader title="Install App" />
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-200">
            <Smartphone size={20} />
          </span>
          <div>
            <p className="font-bold">{standalone ? 'Installed mode detected' : 'Ready for Android Chrome'}</p>
            <p className="text-sm text-slate-500">Use Chrome menu, then Add to Home screen or Install app.</p>
          </div>
        </div>
      </Card>

      <Card className="space-y-3">
        <SectionHeader title="Data" />
        <Button variant="secondary" className="w-full" icon={<Download size={16} />} onClick={() => void downloadExport()}>
          Export
        </Button>
        {message ? <p className="text-sm font-semibold text-teal-700 dark:text-teal-300">{message}</p> : null}
      </Card>
    </div>
  );
}

function PrefToggle({ label, enabled, onChange }: { label: string; enabled: boolean; onChange: (next: boolean) => void }) {
  return (
    <label className="flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-xl bg-zinc-50 px-3 dark:bg-zinc-800/60">
      <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={() => onChange(!enabled)}
        className={clsx(
          'relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors',
          enabled ? 'bg-indigo-600' : 'bg-zinc-300 dark:bg-zinc-700',
        )}
      >
        <span
          className={clsx(
            'inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform',
            enabled ? 'translate-x-5' : 'translate-x-0.5',
          )}
          style={{ marginTop: '2px' }}
        />
      </button>
    </label>
  );
}
