import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Eye, KeyRound, Power, RotateCcw, Shield, Trash2, UserCheck, UserMinus, UsersRound, UserX } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { Button } from '../../components/ui/Button';
import { Card, SectionHeader } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { Field, TextArea, TextInput } from '../../components/ui/Form';
import type { ID } from '../../domain/models';
import { formatFullDate } from '../../lib/date';
import { useAdminStore } from '../../state/useAdminStore';
import { useAuthStore } from '../../state/useAuthStore';
import { UserSnapshotView } from './UserSnapshotView';

type AdminAction =
  | { type: 'clear'; accountId: ID; email: string }
  | { type: 'delete'; accountId: ID; email: string }
  | { type: 'hold'; accountId: ID; email: string }
  | { type: 'password'; accountId: ID; email: string }
  | undefined;

export function AdminPage() {
  const account = useAuthStore((state) => state.account);
  const refreshAccount = useAuthStore((state) => state.refreshAccount);
  const {
    accounts,
    stats,
    settings,
    loading,
    error,
    load,
    toggleAccountCreation,
    updateAccountStatus,
    clearAccountData,
    resetUserPassword,
    deleteAccount,
  } = useAdminStore();
  const selectedUserId = useAdminStore((state) => state.selectedUserId);
  const selectUser = useAdminStore((state) => state.selectUser);
  const [action, setAction] = useState<AdminAction>();
  const [confirmation, setConfirmation] = useState('');
  const [holdReason, setHoldReason] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isErrorMessage, setIsErrorMessage] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (account?.role === 'superadmin') {
      void load(account.id);
    }
  }, [account, load]);

  const selectedAccount = useMemo(
    () => accounts.find((item) => item.account.id === action?.accountId),
    [accounts, action?.accountId],
  );

  const filteredAccounts = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return accounts;
    return accounts.filter((summary) => {
      const target = summary.account;
      return target.name.toLowerCase().includes(query) || target.email.toLowerCase().includes(query);
    });
  }, [accounts, search]);

  if (!account || account.role !== 'superadmin') {
    return (
      <EmptyState
        title="Superadmin access required"
        body="This portal is restricted. Permission is enforced by the admin service before any account operation runs."
      />
    );
  }

  function closeSheet() {
    setAction(undefined);
    setConfirmation('');
    setHoldReason('');
    setNewPassword('');
    setConfirmPassword('');
  }

  async function runAction() {
    if (!account || !action) return;
    setMessage('');
    setIsErrorMessage(false);

    try {
      if (action.type === 'clear') {
        if (confirmation !== 'CLEAR') throw new Error('Type CLEAR to confirm.');
        await clearAccountData(account.id, action.accountId);
        setMessage(`Cleared data for ${action.email}.`);
      }

      if (action.type === 'delete') {
        if (confirmation !== action.email) throw new Error('Type the account email to confirm deletion.');
        await deleteAccount(account.id, action.accountId);
        setMessage(`Deleted account ${action.email}.`);
      }

      if (action.type === 'hold') {
        await updateAccountStatus(account.id, action.accountId, 'held', holdReason);
        setMessage(`Placed ${action.email} on hold.`);
      }

      if (action.type === 'password') {
        if (newPassword.length < 8) throw new Error('Password must be at least 8 characters.');
        if (newPassword !== confirmPassword) throw new Error('Passwords do not match.');
        await resetUserPassword(account.id, action.accountId, newPassword);
        setMessage(`Password reset for ${action.email}. The user must sign in again.`);
      }

      closeSheet();
      await refreshAccount();
    } catch (submitError) {
      setIsErrorMessage(true);
      setMessage(submitError instanceof Error ? submitError.message : 'Admin action failed.');
    }
  }

  if (selectedUserId) {
    return <UserSnapshotView />;
  }

  return (
    <div className="space-y-5">
      <section className="rounded-3xl bg-slate-950 p-5 text-white dark:bg-slate-900">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-teal-500/20 text-teal-200">
            <Shield size={22} />
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-300">Superadmin Portal</p>
            <h2 className="mt-1 text-2xl font-black">Platform dashboard</h2>
            <p className="mt-1 text-sm leading-6 text-slate-400">
              Manage accounts, holds, password resets, and registration access. Use View Data on any user to inspect their finance records anonymized.
            </p>
          </div>
        </div>
      </section>

      <section>
        <SectionHeader title="Overview" />
        <div className="grid grid-cols-2 gap-3">
          <DashboardStat label="Total users" value={stats?.totalUsers ?? 0} icon={<UsersRound size={18} />} />
          <DashboardStat label="Active users" value={stats?.activeUsers ?? 0} icon={<UserCheck size={18} />} tone="good" />
          <DashboardStat label="On hold" value={stats?.heldUsers ?? 0} icon={<UserMinus size={18} />} tone="danger" />
          <DashboardStat
            label="Registration"
            value={settings?.accountCreationEnabled ? 'On' : 'Off'}
            icon={<Power size={18} />}
            tone={settings?.accountCreationEnabled ? 'good' : 'danger'}
          />
        </div>
      </section>

      <Card className="space-y-3">
        <SectionHeader title="Account Creation" />
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-bold text-slate-950 dark:text-slate-50">New registrations</p>
            <p className="text-sm text-slate-500">
              {settings?.accountCreationEnabled ? 'Users can create new accounts.' : 'Sign-up is blocked for new users.'}
            </p>
          </div>
          <Button
            variant={settings?.accountCreationEnabled ? 'danger' : 'primary'}
            icon={<Power size={16} />}
            onClick={() => void toggleAccountCreation(account.id, !settings?.accountCreationEnabled)}
            disabled={loading || !settings}
          >
            {settings?.accountCreationEnabled ? 'Disable' : 'Enable'}
          </Button>
        </div>
      </Card>

      {message ? (
        <p
          className={
            isErrorMessage
              ? 'rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700'
              : 'rounded-xl bg-teal-50 p-3 text-sm font-semibold text-teal-800 dark:bg-teal-950 dark:text-teal-200'
          }
        >
          {message}
        </p>
      ) : null}
      {error ? <p className="rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p> : null}

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <SectionHeader title="Accounts" />
          <p className="pb-1 text-xs font-bold text-slate-500">{filteredAccounts.length} shown</p>
        </div>
        <TextInput value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name or email" />

        <div className="space-y-3">
          {filteredAccounts.length ? (
            filteredAccounts.map((summary) => {
              const target = summary.account;
              const isSelf = target.id === account.id;
              const isUserAccount = target.role === 'user';
              const canManage = !isSelf && isUserAccount;

              return (
                <Card key={target.id} className="space-y-3 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-base font-black text-slate-950 dark:text-slate-50">{target.name}</p>
                        <Badge tone={target.role === 'superadmin' ? 'info' : 'neutral'}>{target.role}</Badge>
                        <Badge tone={target.status === 'held' ? 'danger' : 'good'}>{target.status}</Badge>
                      </div>
                      <p className="mt-1 break-all text-sm text-slate-500">{target.email}</p>
                      <p className="text-xs text-slate-500">Created {formatFullDate(target.createdAt.slice(0, 10))}</p>
                      {!isUserAccount ? (
                        <p className="mt-2 text-xs font-bold text-teal-700 dark:text-teal-300">Protected superadmin account</p>
                      ) : null}
                      {target.holdReason ? <p className="mt-2 text-sm font-semibold text-rose-600">{target.holdReason}</p> : null}
                    </div>
                  </div>

                  {canManage ? (
                    <Button
                      variant="primary"
                      className="w-full min-h-10"
                      icon={<Eye size={16} />}
                      onClick={() => void selectUser(target.id)}
                    >
                      View Data
                    </Button>
                  ) : null}

                  <div className="grid grid-cols-2 gap-2">
                    {target.status === 'held' ? (
                      <Button
                        variant="secondary"
                        className="min-h-10"
                        onClick={() => void updateAccountStatus(account.id, target.id, 'active')}
                        disabled={!canManage}
                      >
                        Release hold
                      </Button>
                    ) : (
                      <Button
                        variant="secondary"
                        className="min-h-10"
                        icon={<UserX size={16} />}
                        onClick={() => setAction({ type: 'hold', accountId: target.id, email: target.email })}
                        disabled={!canManage}
                      >
                        Hold
                      </Button>
                    )}
                    <Button
                      variant="secondary"
                      className="min-h-10"
                      icon={<KeyRound size={16} />}
                      onClick={() => setAction({ type: 'password', accountId: target.id, email: target.email })}
                      disabled={!canManage}
                    >
                      Password
                    </Button>
                    <Button
                      variant="secondary"
                      className="min-h-10"
                      icon={<RotateCcw size={16} />}
                      onClick={() => setAction({ type: 'clear', accountId: target.id, email: target.email })}
                      disabled={!canManage}
                    >
                      Clear data
                    </Button>
                    <Button
                      variant="danger"
                      className="min-h-10"
                      icon={<Trash2 size={16} />}
                      onClick={() => setAction({ type: 'delete', accountId: target.id, email: target.email })}
                      disabled={!canManage}
                    >
                      Delete
                    </Button>
                  </div>
                </Card>
              );
            })
          ) : (
            <EmptyState title="No accounts found" body={loading ? 'Loading accounts...' : 'Try a different search.'} />
          )}
        </div>
      </section>

      <BottomSheet open={Boolean(action)} title={getActionTitle(action)} onClose={closeSheet}>
        <div className="space-y-4">
          {selectedAccount ? (
            <div className="rounded-2xl bg-slate-100 p-3 dark:bg-slate-900">
              <p className="font-black">{selectedAccount.account.name}</p>
              <p className="break-all text-sm text-slate-500">{selectedAccount.account.email}</p>
            </div>
          ) : null}

          {action?.type === 'hold' ? (
            <Field label="Hold reason">
              <TextArea value={holdReason} onChange={(event) => setHoldReason(event.target.value)} placeholder="Reason shown to the user" />
            </Field>
          ) : null}

          {action?.type === 'password' ? (
            <>
              <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                This changes the user password and signs the user out from existing sessions.
              </p>
              <Field label="New password">
                <TextInput
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  type="password"
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                />
              </Field>
              <Field label="Confirm password">
                <TextInput
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  type="password"
                  placeholder="Repeat password"
                  autoComplete="new-password"
                />
              </Field>
            </>
          ) : null}

          {action?.type === 'clear' ? (
            <>
              <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                This deletes all account-owned finance data while preserving the account and login. Type <strong>CLEAR</strong> to confirm.
              </p>
              <Field label="Confirmation">
                <TextInput value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder="CLEAR" />
              </Field>
            </>
          ) : null}

          {action?.type === 'delete' ? (
            <>
              <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                This permanently deletes the account, sessions, and all owned data. Type the account email to confirm.
              </p>
              <Field label="Account email">
                <TextInput value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder={action.email} />
              </Field>
            </>
          ) : null}

          <Button variant={action?.type === 'delete' || action?.type === 'clear' ? 'danger' : 'primary'} className="w-full" onClick={() => void runAction()}>
            Confirm
          </Button>
        </div>
      </BottomSheet>
    </div>
  );
}

function DashboardStat({
  label,
  value,
  icon,
  tone = 'neutral',
}: {
  label: string;
  value: number | string;
  icon: ReactNode;
  tone?: 'neutral' | 'good' | 'danger';
}) {
  const toneClass =
    tone === 'good'
      ? 'bg-teal-50 text-teal-800 dark:bg-teal-950 dark:text-teal-200'
      : tone === 'danger'
        ? 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-200'
        : 'bg-white text-slate-950 dark:bg-slate-900 dark:text-slate-50';

  return (
    <div className={`rounded-2xl p-4 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 ${toneClass}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-slate-500 dark:text-slate-300">{label}</span>
        {icon}
      </div>
      <p className="mt-3 text-2xl font-black">{value}</p>
    </div>
  );
}

function getActionTitle(action: AdminAction) {
  if (action?.type === 'clear') return 'Clear Account Data';
  if (action?.type === 'delete') return 'Delete Account';
  if (action?.type === 'hold') return 'Place Account On Hold';
  if (action?.type === 'password') return 'Reset User Password';
  return 'Confirm Action';
}
