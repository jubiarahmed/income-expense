import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { createPasswordSalt, hashPassword, requireSuperadmin, type ServerAccount } from './_lib/auth.js';
import { pool, transaction } from './_lib/db.js';
import { fail, handleError, ok, readAction, setNoStore } from './_lib/http.js';

const accountActionSchema = z.object({
  accountId: z.string().min(1),
});

const holdAccountSchema = accountActionSchema.extend({
  reason: z.string().trim().max(240).optional(),
});

const resetPasswordSchema = accountActionSchema.extend({
  password: z.string().min(8, 'Password must be at least 8 characters.').max(128, 'Password is too long.'),
});

async function accountCounts(accountId: string) {
  const [contacts, expenses, incomes, transfers, sharedGroups, sharedExpenses, loans, items, subscriptions] = await Promise.all([
    pool.query('select count(*)::int as count from contacts where account_id=$1', [accountId]),
    pool.query('select count(*)::int as count from expenses where account_id=$1', [accountId]),
    pool.query('select count(*)::int as count from incomes where account_id=$1', [accountId]),
    pool.query('select count(*)::int as count from transfers where account_id=$1', [accountId]),
    pool.query('select count(*)::int as count from shared_groups where account_id=$1', [accountId]),
    pool.query('select count(*)::int as count from shared_expenses where account_id=$1', [accountId]),
    pool.query('select count(*)::int as count from loans where account_id=$1', [accountId]),
    pool.query('select count(*)::int as count from item_records where account_id=$1', [accountId]),
    pool.query('select count(*)::int as count from subscriptions where account_id=$1', [accountId]),
  ]);
  return {
    contacts: contacts.rows[0].count,
    expenses: expenses.rows[0].count,
    incomes: incomes.rows[0].count,
    transfers: transfers.rows[0].count,
    sharedGroups: sharedGroups.rows[0].count,
    sharedExpenses: sharedExpenses.rows[0].count,
    loans: loans.rows[0].count,
    items: items.rows[0].count,
    subscriptions: subscriptions.rows[0].count,
  };
}

async function overview() {
  const [accounts, settings, stats] = await Promise.all([
    pool.query('select id, name, email, role, status, hold_reason, created_at, updated_at from accounts order by created_at asc'),
    pool.query(`select * from platform_settings where id='global'`),
    pool.query(`
      select
        count(*)::int as total_accounts,
        count(*) filter (where role = 'user')::int as total_users,
        count(*) filter (where role = 'superadmin')::int as superadmins,
        count(*) filter (where role = 'user' and status = 'active')::int as active_users,
        count(*) filter (where role = 'user' and status = 'held')::int as held_users
      from accounts
    `),
  ]);
  return {
    settings: {
      id: 'global',
      accountCreationEnabled: Boolean(settings.rows[0]?.account_creation_enabled ?? true),
      updatedAt: new Date(settings.rows[0]?.updated_at ?? Date.now()).toISOString(),
      updatedBy: settings.rows[0]?.updated_by || undefined,
    },
    stats: {
      totalAccounts: Number(stats.rows[0]?.total_accounts ?? 0),
      totalUsers: Number(stats.rows[0]?.total_users ?? 0),
      superadmins: Number(stats.rows[0]?.superadmins ?? 0),
      activeUsers: Number(stats.rows[0]?.active_users ?? 0),
      heldUsers: Number(stats.rows[0]?.held_users ?? 0),
    },
    accounts: await Promise.all(
      accounts.rows.map(async (row) => ({
        account: {
          id: row.id,
          name: row.name,
          email: row.email,
          role: row.role,
          status: row.status,
          holdReason: row.hold_reason || undefined,
          createdAt: new Date(row.created_at).toISOString(),
          updatedAt: new Date(row.updated_at).toISOString(),
        },
        counts: await accountCounts(row.id),
      })),
    ),
  };
}

async function clearOwnedData(accountId: string) {
  await transaction(async (client) => {
    await client.query('delete from preferences where account_id=$1', [accountId]);
    await client.query('delete from contacts where account_id=$1', [accountId]);
    await client.query('delete from shared_groups where account_id=$1', [accountId]);
    await client.query('delete from expenses where account_id=$1', [accountId]);
    await client.query('delete from incomes where account_id=$1', [accountId]);
    await client.query('delete from transfers where account_id=$1', [accountId]);
    await client.query('delete from loans where account_id=$1', [accountId]);
    await client.query('delete from item_records where account_id=$1', [accountId]);
    await client.query('delete from subscriptions where account_id=$1', [accountId]);
    await client.query('delete from reminders where account_id=$1', [accountId]);
    await client.query('delete from activity_logs where account_id=$1', [accountId]);
    await client.query('delete from budgets where account_id=$1', [accountId]);
    await client.query('delete from wallets where account_id=$1', [accountId]);
    await client.query('delete from goal_contributions where account_id=$1', [accountId]);
    await client.query('delete from goals where account_id=$1', [accountId]);
    await client.query('delete from saved_filters where account_id=$1', [accountId]);
    await client.query('delete from transaction_templates where account_id=$1', [accountId]);
  });
}

async function deleteAccountAndData(accountId: string) {
  await transaction(async (client) => {
    await client.query('delete from accounts where id=$1', [accountId]);
  });
}

async function readTargetAccount(accountId: string) {
  const result = await pool.query('select id, email, role from accounts where id=$1', [accountId]);
  return result.rows[0] as { id: string; email: string; role: 'user' | 'superadmin' } | undefined;
}

function isoDate(value: unknown) {
  if (!value) return undefined;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function isoDateTime(value: unknown) {
  return value instanceof Date ? value.toISOString() : new Date(String(value)).toISOString();
}

function numberValue(value: unknown) {
  return Number(value ?? 0);
}

async function loadUserSnapshot(accountId: string) {
  const accountResult = await pool.query(
    `select id, name, email, role, status, hold_reason, created_at, updated_at
     from accounts where id = $1`,
    [accountId],
  );
  if (!accountResult.rowCount) return null;
  const accountRow = accountResult.rows[0];

  const [
    preferences,
    contacts,
    expenses,
    incomes,
    transfers,
    sharedGroups,
    sharedExpenses,
    loans,
    loanPayments,
    items,
    subscriptions,
    reminders,
    activities,
  ] = await Promise.all([
    pool.query('select * from preferences where account_id = $1 limit 1', [accountId]),
    pool.query('select * from contacts where account_id = $1 order by created_at asc', [accountId]),
    pool.query('select * from expenses where account_id = $1 order by date desc, created_at desc', [accountId]),
    pool.query('select * from incomes where account_id = $1 order by date desc, created_at desc', [accountId]),
    pool.query('select * from transfers where account_id = $1 order by date desc, created_at desc', [accountId]),
    pool.query('select * from shared_groups where account_id = $1 order by updated_at desc', [accountId]),
    pool.query('select * from shared_expenses where account_id = $1 order by date desc, created_at desc', [accountId]),
    pool.query('select * from loans where account_id = $1 order by updated_at desc', [accountId]),
    pool.query('select * from loan_payments where account_id = $1 order by date desc, created_at desc', [accountId]),
    pool.query('select * from item_records where account_id = $1 order by updated_at desc', [accountId]),
    pool.query('select * from subscriptions where account_id = $1 order by next_due_date asc', [accountId]),
    pool.query('select * from reminders where account_id = $1 order by due_at asc', [accountId]),
    pool.query('select * from activity_logs where account_id = $1 order by created_at desc limit 200', [accountId]),
  ]);

  const pref = preferences.rows[0];
  return {
    account: {
      id: accountRow.id,
      name: accountRow.name,
      email: accountRow.email,
      role: accountRow.role,
      status: accountRow.status,
      holdReason: accountRow.hold_reason || undefined,
      createdAt: new Date(accountRow.created_at).toISOString(),
      updatedAt: new Date(accountRow.updated_at).toISOString(),
    },
    preferences: pref
      ? {
          id: pref.id,
          accountId: pref.account_id,
          currency: pref.currency,
          reminderDaysBefore: pref.reminder_days_before,
          notificationsEnabled: pref.notifications_enabled,
          theme: pref.theme,
          seededAt: pref.seeded_at ? isoDateTime(pref.seeded_at) : undefined,
          updatedAt: isoDateTime(pref.updated_at),
        }
      : undefined,
    contacts: contacts.rows.map((row) => ({
      id: row.id,
      accountId: row.account_id,
      name: row.name,
      phone: row.phone || undefined,
      notes: row.notes || undefined,
      createdAt: isoDateTime(row.created_at),
      updatedAt: isoDateTime(row.updated_at),
    })),
    expenses: expenses.rows.map((row) => ({
      id: row.id,
      accountId: row.account_id,
      amount: numberValue(row.amount),
      category: row.category,
      note: row.note,
      date: isoDate(row.date),
      paymentMethod: row.payment_method,
      tags: row.tags || [],
      receiptImage: row.receipt_image || undefined,
      createdAt: isoDateTime(row.created_at),
      updatedAt: isoDateTime(row.updated_at),
    })),
    incomes: incomes.rows.map((row) => ({
      id: row.id,
      accountId: row.account_id,
      amount: numberValue(row.amount),
      category: row.category,
      source: row.source || '',
      note: row.note || '',
      date: isoDate(row.date),
      paymentMethod: row.payment_method,
      createdAt: isoDateTime(row.created_at),
      updatedAt: isoDateTime(row.updated_at),
    })),
    transfers: transfers.rows.map((row) => ({
      id: row.id,
      accountId: row.account_id,
      amount: numberValue(row.amount),
      fromMethod: row.from_method,
      toMethod: row.to_method,
      fee: numberValue(row.fee),
      date: isoDate(row.date),
      note: row.note || '',
      createdAt: isoDateTime(row.created_at),
      updatedAt: isoDateTime(row.updated_at),
    })),
    sharedGroups: sharedGroups.rows.map((row) => ({
      id: row.id,
      accountId: row.account_id,
      name: row.name,
      description: row.description,
      participantIds: row.participant_ids || [],
      createdAt: isoDateTime(row.created_at),
      updatedAt: isoDateTime(row.updated_at),
    })),
    sharedExpenses: sharedExpenses.rows.map((row) => ({
      id: row.id,
      accountId: row.account_id,
      groupId: row.group_id,
      amount: numberValue(row.amount),
      note: row.note,
      date: isoDate(row.date),
      payerId: row.payer_id,
      participantIds: row.participant_ids || [],
      splitType: row.split_type,
      shares: row.shares || [],
      settled: row.settled,
      createdAt: isoDateTime(row.created_at),
      updatedAt: isoDateTime(row.updated_at),
    })),
    loans: loans.rows.map((row) => ({
      id: row.id,
      accountId: row.account_id,
      personId: row.person_id,
      direction: row.direction,
      amount: numberValue(row.amount),
      date: isoDate(row.date),
      dueDate: isoDate(row.due_date),
      notes: row.notes,
      status: row.status,
      createdAt: isoDateTime(row.created_at),
      updatedAt: isoDateTime(row.updated_at),
    })),
    loanPayments: loanPayments.rows.map((row) => ({
      id: row.id,
      accountId: row.account_id,
      loanId: row.loan_id,
      amount: numberValue(row.amount),
      date: isoDate(row.date),
      note: row.note,
      createdAt: isoDateTime(row.created_at),
    })),
    items: items.rows.map((row) => ({
      id: row.id,
      accountId: row.account_id,
      itemName: row.item_name,
      personId: row.person_id,
      direction: row.direction,
      date: isoDate(row.date),
      dueDate: isoDate(row.due_date),
      note: row.note,
      status: row.status,
      returnedDate: isoDate(row.returned_date),
      createdAt: isoDateTime(row.created_at),
      updatedAt: isoDateTime(row.updated_at),
    })),
    subscriptions: subscriptions.rows.map((row) => ({
      id: row.id,
      accountId: row.account_id,
      name: row.name,
      amount: numberValue(row.amount),
      cycle: row.cycle,
      category: row.category,
      nextDueDate: isoDate(row.next_due_date),
      autoRenew: row.auto_renew,
      notes: row.notes,
      status: row.status,
      createdAt: isoDateTime(row.created_at),
      updatedAt: isoDateTime(row.updated_at),
    })),
    reminders: reminders.rows.map((row) => ({
      id: row.id,
      accountId: row.account_id,
      sourceType: row.source_type,
      sourceId: row.source_id,
      title: row.title,
      dueAt: isoDate(row.due_at),
      status: row.status,
      createdAt: isoDateTime(row.created_at),
      updatedAt: isoDateTime(row.updated_at),
    })),
    activities: activities.rows.map((row) => ({
      id: row.id,
      accountId: row.account_id,
      entityType: row.entity_type,
      entityId: row.entity_id,
      personId: row.person_id || undefined,
      title: row.title,
      detail: row.detail,
      amount: row.amount == null ? undefined : numberValue(row.amount),
      createdAt: isoDateTime(row.created_at),
    })),
  };
}

async function requireMutableTarget(actor: ServerAccount, accountId: string, selfError: string) {
  if (accountId === actor.id) {
    throw new Error(selfError);
  }

  const target = await readTargetAccount(accountId);
  if (!target) throw new Error('Account not found.');
  if (target.role !== 'user') throw new Error('Only regular user accounts can be managed here.');
  return target;
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  setNoStore(response);

  try {
    const actor = await requireSuperadmin(request);
    const action = readAction(request);
    const payload = request.body?.payload ?? request.body ?? {};

    if (request.method === 'GET' && action === 'overview') {
      return ok(response, await overview());
    }

    if (request.method === 'GET' && action === 'userSnapshot') {
      const accountId = String(request.query.accountId || '');
      if (!accountId) return fail(response, 400, 'accountId is required.');
      const target = await readTargetAccount(accountId);
      if (!target || target.role !== 'user') return fail(response, 404, 'User not found.');
      const snapshot = await loadUserSnapshot(accountId);
      if (!snapshot) return fail(response, 404, 'User not found.');
      return ok(response, snapshot);
    }

    if (request.method !== 'POST') return fail(response, 405, 'Method not allowed.');

    if (action === 'toggleRegistration') {
      await pool.query(
        `update platform_settings set account_creation_enabled=$1, updated_at=now(), updated_by=$2 where id='global'`,
        [Boolean(payload.enabled), actor.id],
      );
      return ok(response, await overview());
    }

    if (action === 'holdAccount') {
      const input = holdAccountSchema.parse(payload);
      await requireMutableTarget(actor, input.accountId, 'Superadmins cannot place their own account on hold.');
      await pool.query(`update accounts set status='held', hold_reason=$1, updated_at=now() where id=$2`, [
        input.reason || 'Placed on hold by superadmin.',
        input.accountId,
      ]);
      await pool.query('delete from sessions where account_id=$1', [input.accountId]);
      return ok(response, await overview());
    }

    if (action === 'releaseAccount') {
      const input = accountActionSchema.parse(payload);
      await requireMutableTarget(actor, input.accountId, 'Superadmins cannot release their own account.');
      await pool.query(`update accounts set status='active', hold_reason=null, updated_at=now() where id=$1`, [input.accountId]);
      return ok(response, await overview());
    }

    if (action === 'clearAccountData') {
      const input = accountActionSchema.parse(payload);
      await requireMutableTarget(actor, input.accountId, 'Superadmins cannot clear their own account data.');
      await clearOwnedData(input.accountId);
      return ok(response, await overview());
    }

    if (action === 'resetPassword') {
      const input = resetPasswordSchema.parse(payload);
      await requireMutableTarget(actor, input.accountId, 'Superadmins cannot reset their own password here.');

      const salt = createPasswordSalt();
      await pool.query(
        `update accounts
         set password_hash=$1, password_salt=$2, updated_at=now()
         where id=$3`,
        [hashPassword(input.password, salt), salt, input.accountId],
      );
      await pool.query('delete from sessions where account_id=$1', [input.accountId]);
      return ok(response, await overview());
    }

    if (action === 'deleteAccount') {
      const input = accountActionSchema.parse(payload);
      await requireMutableTarget(actor, input.accountId, 'Superadmins cannot permanently delete their own account.');
      await deleteAccountAndData(input.accountId);
      return ok(response, await overview());
    }

    return fail(response, 404, `Unknown admin action: ${action}`);
  } catch (error) {
    return handleError(response, error);
  }
}
