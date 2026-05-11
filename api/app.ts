import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  budgetSchema,
  contactSchema,
  expenseSchema,
  goalContributionSchema,
  goalSchema,
  incomeSchema,
  itemSchema,
  loanPaymentSchema,
  loanSchema,
  preferencesSchema,
  savedFilterSchema,
  sharedExpenseSchema,
  sharedGroupSchema,
  subscriptionSchema,
  tagRenameSchema,
  transferSchema,
  walletSchema,
} from '../src/domain/validation.js';
import { makeId, requireAccount } from './_lib/auth.js';
import { pool } from './_lib/db.js';
import { fail, handleError, ok, readAction, setNoStore } from './_lib/http.js';

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

async function ensurePreferences(accountId: string) {
  await pool.query(
    `insert into preferences (id, account_id, currency, reminder_days_before, notifications_enabled, theme, updated_at)
     values ($1, $2, 'BDT', 2, false, 'light', now())
     on conflict (account_id) do nothing`,
    [`preferences_${accountId}`, accountId],
  );
}

async function readSnapshot(accountId: string) {
  await ensurePreferences(accountId);
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
    budgets,
    wallets,
    goals,
    goalContributions,
    savedFilters,
  ] = await Promise.all([
    pool.query('select * from preferences where account_id = $1 limit 1', [accountId]),
    pool.query('select * from contacts where account_id = $1 order by name asc', [accountId]),
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
    pool.query('select * from activity_logs where account_id = $1 order by created_at desc limit 120', [accountId]),
    pool.query('select * from budgets where account_id = $1 order by category asc', [accountId]),
    pool.query('select * from wallets where account_id = $1 order by created_at asc', [accountId]),
    pool.query('select * from goals where account_id = $1 order by created_at desc', [accountId]),
    pool.query('select * from goal_contributions where account_id = $1 order by date desc, created_at desc', [accountId]),
    pool.query('select * from saved_filters where account_id = $1 order by created_at asc', [accountId]),
  ]);

  const pref = preferences.rows[0];
  return {
    preferences: {
      id: pref.id,
      accountId: pref.account_id,
      currency: pref.currency,
      reminderDaysBefore: pref.reminder_days_before,
      notificationsEnabled: pref.notifications_enabled,
      theme: pref.theme,
      notificationPrefs: pref.notification_prefs && Object.keys(pref.notification_prefs).length ? pref.notification_prefs : undefined,
      seededAt: pref.seeded_at ? isoDateTime(pref.seeded_at) : undefined,
      updatedAt: isoDateTime(pref.updated_at),
    },
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
      merchant: row.merchant || undefined,
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
    budgets: budgets.rows.map((row) => ({
      id: row.id,
      accountId: row.account_id,
      category: row.category,
      monthlyLimit: numberValue(row.monthly_limit),
      notifyAt: Number(row.notify_at ?? 80),
      createdAt: isoDateTime(row.created_at),
      updatedAt: isoDateTime(row.updated_at),
    })),
    wallets: wallets.rows.map((row) => ({
      id: row.id,
      accountId: row.account_id,
      method: row.method,
      name: row.name,
      openingBalance: numberValue(row.opening_balance),
      createdAt: isoDateTime(row.created_at),
      updatedAt: isoDateTime(row.updated_at),
    })),
    goals: goals.rows.map((row) => ({
      id: row.id,
      accountId: row.account_id,
      name: row.name,
      targetAmount: numberValue(row.target_amount),
      savedAmount: numberValue(row.saved_amount),
      walletMethod: row.wallet_method || undefined,
      deadline: isoDate(row.deadline),
      notes: row.notes || '',
      status: row.status,
      createdAt: isoDateTime(row.created_at),
      updatedAt: isoDateTime(row.updated_at),
    })),
    goalContributions: goalContributions.rows.map((row) => ({
      id: row.id,
      accountId: row.account_id,
      goalId: row.goal_id,
      amount: numberValue(row.amount),
      date: isoDate(row.date),
      note: row.note || '',
      createdAt: isoDateTime(row.created_at),
    })),
    savedFilters: savedFilters.rows.map((row) => ({
      id: row.id,
      accountId: row.account_id,
      name: row.name,
      scope: row.scope,
      query: row.query || {},
      createdAt: isoDateTime(row.created_at),
      updatedAt: isoDateTime(row.updated_at),
    })),
  };
}

function parseTags(value: string) {
  return value.split(',').map((tag) => tag.trim()).filter(Boolean);
}

function buildShares(input: { amount: number; participantIds: string[]; splitType: 'equal' | 'custom'; customShares: Record<string, number> }) {
  if (input.splitType === 'equal') {
    const base = Math.round((input.amount / input.participantIds.length) * 100) / 100;
    const shares = input.participantIds.map((contactId) => ({ contactId, amount: base }));
    const sum = shares.reduce((total, share) => total + share.amount, 0);
    shares[shares.length - 1].amount = Math.round((shares[shares.length - 1].amount + input.amount - sum) * 100) / 100;
    return shares;
  }
  return input.participantIds.map((contactId) => ({ contactId, amount: Number(input.customShares[contactId] ?? 0) }));
}

async function activity(accountId: string, entityType: string, entityId: string, title: string, detail: string, amount?: number, personId?: string) {
  await pool.query(
    `insert into activity_logs (id, account_id, entity_type, entity_id, person_id, title, detail, amount, created_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, now())`,
    [makeId('activity'), accountId, entityType, entityId, personId || null, title, detail, amount ?? null],
  );
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  setNoStore(response);

  try {
    const account = await requireAccount(request);
    const action = readAction(request);
    const payload = request.body?.payload ?? request.body ?? {};

    if (request.method === 'GET' && action === 'snapshot') {
      return ok(response, await readSnapshot(account.id));
    }

    if (request.method !== 'POST') return fail(response, 405, 'Method not allowed.');

    if (account.role === 'superadmin' && action !== 'updatePreferences') {
      return fail(response, 403, 'Superadmin accounts can only update their own preferences here.');
    }

    if (action === 'addContact') {
      const input = contactSchema.parse(payload);
      const id = makeId('contact');
      await pool.query(
        `insert into contacts (id, account_id, name, phone, notes, created_at, updated_at)
         values ($1, $2, $3, $4, $5, now(), now())`,
        [id, account.id, input.name, input.phone || null, input.notes || null],
      );
      await activity(account.id, 'contact', id, `Added ${input.name}`, 'New person added to Expense Tracker.', undefined, id);
      return ok(response);
    }

    if (action === 'updateContact') {
      const input = contactSchema.parse(payload.input);
      await pool.query('update contacts set name=$1, phone=$2, notes=$3, updated_at=now() where id=$4 and account_id=$5', [
        input.name,
        input.phone || null,
        input.notes || null,
        payload.id,
        account.id,
      ]);
      await activity(account.id, 'contact', payload.id, `Updated ${input.name}`, 'Contact details edited.', undefined, payload.id);
      return ok(response);
    }

    if (action === 'deleteContact') {
      const id = payload.id;
      const refs = await Promise.all([
        pool.query('select 1 from loans where account_id=$1 and person_id=$2 limit 1', [account.id, id]),
        pool.query('select 1 from item_records where account_id=$1 and person_id=$2 limit 1', [account.id, id]),
      ]);
      if (refs.some((result) => result.rowCount)) return fail(response, 400, 'This person has related records and cannot be deleted.');
      const existing = await pool.query('select name from contacts where id=$1 and account_id=$2', [id, account.id]);
      const name = existing.rows[0]?.name ?? 'contact';
      await pool.query('delete from contacts where id=$1 and account_id=$2', [id, account.id]);
      await activity(account.id, 'contact', id, `Deleted ${name}`, 'Contact removed from Expense Tracker.', undefined, id);
      return ok(response);
    }

    if (action === 'addExpense' || action === 'updateExpense') {
      const input = expenseSchema.parse(action === 'addExpense' ? payload : payload.input);
      const id = action === 'addExpense' ? makeId('expense') : payload.id;
      if (action === 'addExpense') {
        await pool.query(
          `insert into expenses (id, account_id, amount, category, note, merchant, date, payment_method, tags, receipt_image, created_at, updated_at)
           values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,now(),now())`,
          [id, account.id, input.amount, input.category, input.note, input.merchant || null, input.date, input.paymentMethod, JSON.stringify(parseTags(input.tags)), input.receiptImage || null],
        );
        await activity(account.id, 'expense', id, `Spent ${input.amount} on ${input.category}`, input.merchant || input.note || input.paymentMethod, input.amount);
      } else {
        await pool.query(
          `update expenses set amount=$1, category=$2, note=$3, merchant=$4, date=$5, payment_method=$6, tags=$7, receipt_image=$8, updated_at=now()
           where id=$9 and account_id=$10`,
          [input.amount, input.category, input.note, input.merchant || null, input.date, input.paymentMethod, JSON.stringify(parseTags(input.tags)), input.receiptImage || null, id, account.id],
        );
        await activity(account.id, 'expense', id, `Updated ${input.category} expense`, input.merchant || input.note || input.paymentMethod, input.amount);
      }
      return ok(response);
    }

    if (action === 'deleteExpense') {
      const existing = await pool.query('select amount, category, note from expenses where id=$1 and account_id=$2', [payload.id, account.id]);
      const row = existing.rows[0];
      await pool.query('delete from expenses where id=$1 and account_id=$2', [payload.id, account.id]);
      if (row) {
        await activity(account.id, 'expense', payload.id, `Deleted ${row.category} expense`, row.note || 'Expense removed.', numberValue(row.amount));
      }
      return ok(response);
    }

    if (action === 'duplicateExpense') {
      const existing = await pool.query('select * from expenses where id=$1 and account_id=$2', [payload.id, account.id]);
      if (!existing.rowCount) return fail(response, 404, 'Expense not found.');
      const row = existing.rows[0];
      const id = makeId('expense');
      await pool.query(
        `insert into expenses (id, account_id, amount, category, note, merchant, date, payment_method, tags, receipt_image, created_at, updated_at)
         values ($1,$2,$3,$4,$5,$6,current_date,$7,$8,$9,now(),now())`,
        [id, account.id, row.amount, row.category, row.note, row.merchant || null, row.payment_method, JSON.stringify(row.tags || []), row.receipt_image || null],
      );
      await activity(account.id, 'expense', id, `Duplicated ${row.category} expense`, row.merchant || row.note || 'Repeat expense logged for today.', numberValue(row.amount));
      return ok(response);
    }

    if (action === 'addIncome' || action === 'updateIncome') {
      const input = incomeSchema.parse(action === 'addIncome' ? payload : payload.input);
      const id = action === 'addIncome' ? makeId('income') : payload.id;
      if (action === 'addIncome') {
        await pool.query(
          `insert into incomes (id, account_id, amount, category, source, note, date, payment_method, created_at, updated_at)
           values ($1,$2,$3,$4,$5,$6,$7,$8,now(),now())`,
          [id, account.id, input.amount, input.category, input.source, input.note, input.date, input.paymentMethod],
        );
        await activity(account.id, 'income', id, `Income ${input.category}`, input.source || input.note || input.paymentMethod, input.amount);
      } else {
        await pool.query(
          `update incomes set amount=$1, category=$2, source=$3, note=$4, date=$5, payment_method=$6, updated_at=now()
           where id=$7 and account_id=$8`,
          [input.amount, input.category, input.source, input.note, input.date, input.paymentMethod, id, account.id],
        );
        await activity(account.id, 'income', id, `Updated ${input.category} income`, input.source || input.note || input.paymentMethod, input.amount);
      }
      return ok(response);
    }

    if (action === 'deleteIncome') {
      const existing = await pool.query('select amount, category, source from incomes where id=$1 and account_id=$2', [payload.id, account.id]);
      const row = existing.rows[0];
      await pool.query('delete from incomes where id=$1 and account_id=$2', [payload.id, account.id]);
      if (row) {
        await activity(account.id, 'income', payload.id, `Deleted ${row.category} income`, row.source || 'Income removed.', numberValue(row.amount));
      }
      return ok(response);
    }

    if (action === 'addTransfer' || action === 'updateTransfer') {
      const input = transferSchema.parse(action === 'addTransfer' ? payload : payload.input);
      const id = action === 'addTransfer' ? makeId('transfer') : payload.id;
      if (action === 'addTransfer') {
        await pool.query(
          `insert into transfers (id, account_id, amount, from_method, to_method, fee, date, note, created_at, updated_at)
           values ($1,$2,$3,$4,$5,$6,$7,$8,now(),now())`,
          [id, account.id, input.amount, input.fromMethod, input.toMethod, input.fee, input.date, input.note],
        );
        await activity(account.id, 'transfer', id, `${input.fromMethod} → ${input.toMethod}`, input.note || 'Funds moved between accounts.', input.amount);
      } else {
        await pool.query(
          `update transfers set amount=$1, from_method=$2, to_method=$3, fee=$4, date=$5, note=$6, updated_at=now()
           where id=$7 and account_id=$8`,
          [input.amount, input.fromMethod, input.toMethod, input.fee, input.date, input.note, id, account.id],
        );
        await activity(account.id, 'transfer', id, `Updated ${input.fromMethod} → ${input.toMethod}`, input.note || 'Transfer details edited.', input.amount);
      }
      return ok(response);
    }

    if (action === 'deleteTransfer') {
      const existing = await pool.query('select amount, from_method, to_method from transfers where id=$1 and account_id=$2', [payload.id, account.id]);
      const row = existing.rows[0];
      await pool.query('delete from transfers where id=$1 and account_id=$2', [payload.id, account.id]);
      if (row) {
        await activity(account.id, 'transfer', payload.id, `Deleted ${row.from_method} → ${row.to_method}`, 'Transfer removed.', numberValue(row.amount));
      }
      return ok(response);
    }

    if (action === 'addSharedGroup' || action === 'updateSharedGroup') {
      const input = sharedGroupSchema.parse(action === 'addSharedGroup' ? payload : payload.input);
      const id = action === 'addSharedGroup' ? makeId('group') : payload.id;
      if (action === 'addSharedGroup') {
        await pool.query(
          `insert into shared_groups (id, account_id, name, description, participant_ids, created_at, updated_at)
           values ($1,$2,$3,$4,$5,now(),now())`,
          [id, account.id, input.name, input.description, JSON.stringify(input.participantIds)],
        );
        await activity(account.id, 'sharedGroup', id, `Created ${input.name}`, 'Shared expense group added.');
      } else {
        await pool.query('update shared_groups set name=$1, description=$2, participant_ids=$3, updated_at=now() where id=$4 and account_id=$5', [
          input.name,
          input.description,
          JSON.stringify(input.participantIds),
          id,
          account.id,
        ]);
        await activity(account.id, 'sharedGroup', id, `Updated ${input.name}`, 'Shared group edited.');
      }
      return ok(response);
    }

    if (action === 'deleteSharedGroup') {
      const existing = await pool.query('select name from shared_groups where id=$1 and account_id=$2', [payload.id, account.id]);
      const row = existing.rows[0];
      await pool.query('delete from shared_groups where id=$1 and account_id=$2', [payload.id, account.id]);
      if (row) {
        await activity(account.id, 'sharedGroup', payload.id, `Deleted ${row.name}`, 'Shared group removed.');
      }
      return ok(response);
    }

    if (action === 'addSharedExpense' || action === 'updateSharedExpense') {
      const input = sharedExpenseSchema.parse(action === 'addSharedExpense' ? payload : payload.input);
      const id = action === 'addSharedExpense' ? makeId('shared') : payload.id;
      const shares = buildShares(input);
      if (action === 'addSharedExpense') {
        await pool.query(
          `insert into shared_expenses
           (id, account_id, group_id, amount, note, date, payer_id, participant_ids, split_type, shares, settled, created_at, updated_at)
           values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,now(),now())`,
          [
            id,
            account.id,
            input.groupId,
            input.amount,
            input.note,
            input.date,
            input.payerId,
            JSON.stringify(input.participantIds),
            input.splitType,
            JSON.stringify(shares),
            input.settled,
          ],
        );
        await activity(account.id, 'sharedExpense', id, `Shared ${input.note}`, 'Split added to group.', input.amount);
      } else {
        await pool.query(
          `update shared_expenses set group_id=$1, amount=$2, note=$3, date=$4, payer_id=$5, participant_ids=$6,
           split_type=$7, shares=$8, settled=$9, updated_at=now() where id=$10 and account_id=$11`,
          [
            input.groupId,
            input.amount,
            input.note,
            input.date,
            input.payerId,
            JSON.stringify(input.participantIds),
            input.splitType,
            JSON.stringify(shares),
            input.settled,
            id,
            account.id,
          ],
        );
        await activity(account.id, 'sharedExpense', id, `Updated shared "${input.note}"`, 'Split details edited.', input.amount);
      }
      return ok(response);
    }

    if (action === 'deleteSharedExpense') {
      const existing = await pool.query('select amount, note from shared_expenses where id=$1 and account_id=$2', [payload.id, account.id]);
      const row = existing.rows[0];
      await pool.query('delete from shared_expenses where id=$1 and account_id=$2', [payload.id, account.id]);
      if (row) {
        await activity(account.id, 'sharedExpense', payload.id, `Deleted shared "${row.note}"`, 'Shared expense removed.', numberValue(row.amount));
      }
      return ok(response);
    }

    if (action === 'toggleSharedExpenseSettled') {
      const updated = await pool.query(
        'update shared_expenses set settled = not settled, updated_at=now() where id=$1 and account_id=$2 returning settled, amount, note',
        [payload.id, account.id],
      );
      const row = updated.rows[0];
      if (row) {
        await activity(
          account.id,
          'sharedExpense',
          payload.id,
          row.settled ? `Settled "${row.note}"` : `Reopened "${row.note}"`,
          row.settled ? 'Shared expense marked settled.' : 'Shared expense reopened.',
          numberValue(row.amount),
        );
      }
      return ok(response);
    }

    if (action === 'addLoan' || action === 'updateLoan') {
      const input = loanSchema.parse(action === 'addLoan' ? payload : payload.input);
      const id = action === 'addLoan' ? makeId('loan') : payload.id;
      if (action === 'addLoan') {
        await pool.query(
          `insert into loans (id, account_id, person_id, direction, amount, date, due_date, notes, status, created_at, updated_at)
           values ($1,$2,$3,$4,$5,$6,$7,$8,$9,now(),now())`,
          [id, account.id, input.personId, input.direction, input.amount, input.date, input.dueDate || null, input.notes, input.status],
        );
        await activity(account.id, 'loan', id, input.direction === 'lent' ? 'Money lent' : 'Money borrowed', input.notes || 'Loan record added.', input.amount, input.personId);
      } else {
        await pool.query(
          `update loans set person_id=$1, direction=$2, amount=$3, date=$4, due_date=$5, notes=$6, status=$7, updated_at=now()
           where id=$8 and account_id=$9`,
          [input.personId, input.direction, input.amount, input.date, input.dueDate || null, input.notes, input.status, id, account.id],
        );
        await activity(
          account.id,
          'loan',
          id,
          input.direction === 'lent' ? 'Updated loan (lent)' : 'Updated loan (borrowed)',
          input.notes || 'Loan details edited.',
          input.amount,
          input.personId,
        );
      }
      return ok(response);
    }

    if (action === 'deleteLoan') {
      const existing = await pool.query('select amount, direction, person_id, notes from loans where id=$1 and account_id=$2', [payload.id, account.id]);
      const row = existing.rows[0];
      await pool.query('delete from loans where id=$1 and account_id=$2', [payload.id, account.id]);
      if (row) {
        await activity(
          account.id,
          'loan',
          payload.id,
          row.direction === 'lent' ? 'Deleted loan (lent)' : 'Deleted loan (borrowed)',
          row.notes || 'Loan removed.',
          numberValue(row.amount),
          row.person_id,
        );
      }
      return ok(response);
    }

    if (action === 'addLoanPayment') {
      const input = loanPaymentSchema.parse(payload);
      const id = makeId('payment');
      await pool.query(
        `insert into loan_payments (id, account_id, loan_id, amount, date, note, created_at)
         values ($1,$2,$3,$4,$5,$6,now())`,
        [id, account.id, input.loanId, input.amount, input.date, input.note],
      );
      await activity(account.id, 'loanPayment', id, 'Loan repayment recorded', input.note || 'Partial payment added.', input.amount);
      return ok(response);
    }

    if (action === 'deleteLoanPayment') {
      const existing = await pool.query('select amount, note from loan_payments where id=$1 and account_id=$2', [payload.id, account.id]);
      const row = existing.rows[0];
      await pool.query('delete from loan_payments where id=$1 and account_id=$2', [payload.id, account.id]);
      if (row) {
        await activity(account.id, 'loanPayment', payload.id, 'Loan repayment deleted', row.note || 'Repayment removed.', numberValue(row.amount));
      }
      return ok(response);
    }

    if (action === 'addItem' || action === 'updateItem') {
      const input = itemSchema.parse(action === 'addItem' ? payload : payload.input);
      const id = action === 'addItem' ? makeId('item') : payload.id;
      if (action === 'addItem') {
        await pool.query(
          `insert into item_records (id, account_id, item_name, person_id, direction, date, due_date, note, status, returned_date, created_at, updated_at)
           values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,now(),now())`,
          [id, account.id, input.itemName, input.personId, input.direction, input.date, input.dueDate || null, input.note, input.status, input.returnedDate || null],
        );
        await activity(account.id, 'item', id, input.direction === 'lent' ? `Lent ${input.itemName}` : `Borrowed ${input.itemName}`, input.note || 'Item record added.', undefined, input.personId);
      } else {
        await pool.query(
          `update item_records set item_name=$1, person_id=$2, direction=$3, date=$4, due_date=$5, note=$6, status=$7,
           returned_date=$8, updated_at=now() where id=$9 and account_id=$10`,
          [input.itemName, input.personId, input.direction, input.date, input.dueDate || null, input.note, input.status, input.returnedDate || null, id, account.id],
        );
        await activity(
          account.id,
          'item',
          id,
          input.direction === 'lent' ? `Updated lent ${input.itemName}` : `Updated borrowed ${input.itemName}`,
          input.note || 'Item record edited.',
          undefined,
          input.personId,
        );
      }
      return ok(response);
    }

    if (action === 'deleteItem') {
      const existing = await pool.query('select item_name, direction, person_id from item_records where id=$1 and account_id=$2', [payload.id, account.id]);
      const row = existing.rows[0];
      await pool.query('delete from item_records where id=$1 and account_id=$2', [payload.id, account.id]);
      if (row) {
        await activity(
          account.id,
          'item',
          payload.id,
          row.direction === 'lent' ? `Deleted lent ${row.item_name}` : `Deleted borrowed ${row.item_name}`,
          'Item record removed.',
          undefined,
          row.person_id,
        );
      }
      return ok(response);
    }

    if (action === 'markItemReturned') {
      const updated = await pool.query(
        `update item_records set status='returned', returned_date=current_date, updated_at=now() where id=$1 and account_id=$2 returning item_name, direction, person_id`,
        [payload.id, account.id],
      );
      const row = updated.rows[0];
      if (row) {
        await activity(
          account.id,
          'item',
          payload.id,
          `Returned ${row.item_name}`,
          row.direction === 'lent' ? 'Item is back with you.' : 'Item returned to owner.',
          undefined,
          row.person_id,
        );
      }
      return ok(response);
    }

    if (action === 'addSubscription' || action === 'updateSubscription') {
      const input = subscriptionSchema.parse(action === 'addSubscription' ? payload : payload.input);
      const id = action === 'addSubscription' ? makeId('subscription') : payload.id;
      if (action === 'addSubscription') {
        await pool.query(
          `insert into subscriptions (id, account_id, name, amount, cycle, category, next_due_date, auto_renew, notes, status, created_at, updated_at)
           values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,now(),now())`,
          [id, account.id, input.name, input.amount, input.cycle, input.category, input.nextDueDate, input.autoRenew, input.notes, input.status],
        );
        await activity(account.id, 'subscription', id, `Added ${input.name}`, `${input.cycle} recurring payment.`, input.amount);
      } else {
        await pool.query(
          `update subscriptions set name=$1, amount=$2, cycle=$3, category=$4, next_due_date=$5, auto_renew=$6,
           notes=$7, status=$8, updated_at=now() where id=$9 and account_id=$10`,
          [input.name, input.amount, input.cycle, input.category, input.nextDueDate, input.autoRenew, input.notes, input.status, id, account.id],
        );
        await activity(account.id, 'subscription', id, `Updated ${input.name}`, `${input.cycle} · ${input.status}`, input.amount);
      }
      return ok(response);
    }

    if (action === 'deleteSubscription') {
      const existing = await pool.query('select name, amount, cycle from subscriptions where id=$1 and account_id=$2', [payload.id, account.id]);
      const row = existing.rows[0];
      await pool.query('delete from subscriptions where id=$1 and account_id=$2', [payload.id, account.id]);
      if (row) {
        await activity(account.id, 'subscription', payload.id, `Deleted ${row.name}`, `${row.cycle} subscription removed.`, numberValue(row.amount));
      }
      return ok(response);
    }

    if (action === 'updatePreferences') {
      const input = preferencesSchema.parse(payload);
      await ensurePreferences(account.id);
      await pool.query(
        `update preferences set currency=$1, reminder_days_before=$2, notifications_enabled=$3, theme=$4, notification_prefs=$5, updated_at=now()
         where account_id=$6`,
        [
          input.currency,
          input.reminderDaysBefore,
          input.notificationsEnabled,
          input.theme,
          JSON.stringify(input.notificationPrefs || {}),
          account.id,
        ],
      );
      await activity(account.id, 'settings', account.id, 'Preferences updated', `${input.currency} · ${input.theme} theme · reminders ${input.reminderDaysBefore}d`);
      return ok(response);
    }

    if (action === 'dismissReminder') {
      await pool.query(`update reminders set status='dismissed', updated_at=now() where id=$1 and account_id=$2`, [payload.id, account.id]);
      return ok(response);
    }

    if (action === 'addBudget' || action === 'updateBudget') {
      const input = budgetSchema.parse(action === 'addBudget' ? payload : payload.input);
      if (action === 'addBudget') {
        const id = makeId('budget');
        await pool.query(
          `insert into budgets (id, account_id, category, monthly_limit, notify_at, created_at, updated_at)
           values ($1,$2,$3,$4,$5,now(),now())
           on conflict (account_id, category)
           do update set monthly_limit = excluded.monthly_limit, notify_at = excluded.notify_at, updated_at = now()`,
          [id, account.id, input.category, input.monthlyLimit, input.notifyAt],
        );
        await activity(account.id, 'budget', id, `Budget for ${input.category}`, `Monthly limit ${input.monthlyLimit}`, input.monthlyLimit);
      } else {
        await pool.query(
          `update budgets set category=$1, monthly_limit=$2, notify_at=$3, updated_at=now()
           where id=$4 and account_id=$5`,
          [input.category, input.monthlyLimit, input.notifyAt, payload.id, account.id],
        );
        await activity(account.id, 'budget', payload.id, `Updated ${input.category} budget`, `Limit ${input.monthlyLimit}`, input.monthlyLimit);
      }
      return ok(response);
    }

    if (action === 'deleteBudget') {
      const existing = await pool.query('select category, monthly_limit from budgets where id=$1 and account_id=$2', [payload.id, account.id]);
      const row = existing.rows[0];
      await pool.query('delete from budgets where id=$1 and account_id=$2', [payload.id, account.id]);
      if (row) {
        await activity(account.id, 'budget', payload.id, `Deleted ${row.category} budget`, 'Budget removed.', numberValue(row.monthly_limit));
      }
      return ok(response);
    }

    if (action === 'upsertWallet') {
      const input = walletSchema.parse(payload);
      const id = makeId('wallet');
      await pool.query(
        `insert into wallets (id, account_id, method, name, opening_balance, created_at, updated_at)
         values ($1,$2,$3,$4,$5,now(),now())
         on conflict (account_id, method)
         do update set name = excluded.name, opening_balance = excluded.opening_balance, updated_at = now()`,
        [id, account.id, input.method, input.name, input.openingBalance],
      );
      await activity(account.id, 'wallet', id, `Wallet ${input.method}`, `Opening balance ${input.openingBalance}`, input.openingBalance);
      return ok(response);
    }

    if (action === 'deleteWallet') {
      const existing = await pool.query('select method, name from wallets where id=$1 and account_id=$2', [payload.id, account.id]);
      const row = existing.rows[0];
      await pool.query('delete from wallets where id=$1 and account_id=$2', [payload.id, account.id]);
      if (row) {
        await activity(account.id, 'wallet', payload.id, `Removed ${row.name} wallet`, `Method ${row.method}`);
      }
      return ok(response);
    }

    if (action === 'addGoal' || action === 'updateGoal') {
      const input = goalSchema.parse(action === 'addGoal' ? payload : payload.input);
      const id = action === 'addGoal' ? makeId('goal') : payload.id;
      if (action === 'addGoal') {
        await pool.query(
          `insert into goals (id, account_id, name, target_amount, saved_amount, wallet_method, deadline, notes, status, created_at, updated_at)
           values ($1,$2,$3,$4,$5,$6,$7,$8,$9,now(),now())`,
          [id, account.id, input.name, input.targetAmount, input.savedAmount, input.walletMethod || null, input.deadline || null, input.notes, input.status],
        );
        await activity(account.id, 'goal', id, `Goal: ${input.name}`, `Target ${input.targetAmount}`, input.targetAmount);
      } else {
        await pool.query(
          `update goals set name=$1, target_amount=$2, saved_amount=$3, wallet_method=$4, deadline=$5, notes=$6, status=$7, updated_at=now()
           where id=$8 and account_id=$9`,
          [input.name, input.targetAmount, input.savedAmount, input.walletMethod || null, input.deadline || null, input.notes, input.status, id, account.id],
        );
        await activity(account.id, 'goal', id, `Updated ${input.name}`, `Target ${input.targetAmount}`, input.targetAmount);
      }
      return ok(response);
    }

    if (action === 'deleteGoal') {
      const existing = await pool.query('select name from goals where id=$1 and account_id=$2', [payload.id, account.id]);
      const row = existing.rows[0];
      await pool.query('delete from goals where id=$1 and account_id=$2', [payload.id, account.id]);
      if (row) {
        await activity(account.id, 'goal', payload.id, `Deleted goal: ${row.name}`, 'Goal removed.');
      }
      return ok(response);
    }

    if (action === 'contributeToGoal') {
      const input = goalContributionSchema.parse(payload);
      const id = makeId('contribution');
      await pool.query(
        `insert into goal_contributions (id, account_id, goal_id, amount, date, note, created_at)
         values ($1,$2,$3,$4,$5,$6,now())`,
        [id, account.id, input.goalId, input.amount, input.date, input.note],
      );
      await pool.query(
        'update goals set saved_amount = saved_amount + $1, updated_at = now() where id = $2 and account_id = $3',
        [input.amount, input.goalId, account.id],
      );
      const goal = await pool.query('select name, saved_amount, target_amount from goals where id=$1 and account_id=$2', [input.goalId, account.id]);
      const goalRow = goal.rows[0];
      if (goalRow) {
        await activity(
          account.id,
          'goalContribution',
          id,
          `Saved toward ${goalRow.name}`,
          `Progress ${numberValue(goalRow.saved_amount)}/${numberValue(goalRow.target_amount)}`,
          input.amount,
        );
        if (Number(goalRow.saved_amount) >= Number(goalRow.target_amount)) {
          await pool.query(`update goals set status='completed', updated_at=now() where id=$1 and account_id=$2`, [input.goalId, account.id]);
        }
      }
      return ok(response);
    }

    if (action === 'deleteGoalContribution') {
      const existing = await pool.query('select goal_id, amount from goal_contributions where id=$1 and account_id=$2', [payload.id, account.id]);
      const row = existing.rows[0];
      await pool.query('delete from goal_contributions where id=$1 and account_id=$2', [payload.id, account.id]);
      if (row) {
        await pool.query(
          'update goals set saved_amount = greatest(0, saved_amount - $1), updated_at = now() where id = $2 and account_id = $3',
          [numberValue(row.amount), row.goal_id, account.id],
        );
        await activity(account.id, 'goalContribution', payload.id, 'Reverted goal contribution', 'Contribution removed.', numberValue(row.amount));
      }
      return ok(response);
    }

    if (action === 'addSavedFilter' || action === 'updateSavedFilter') {
      const input = savedFilterSchema.parse(action === 'addSavedFilter' ? payload : payload.input);
      const id = action === 'addSavedFilter' ? makeId('savedfilter') : payload.id;
      if (action === 'addSavedFilter') {
        await pool.query(
          `insert into saved_filters (id, account_id, name, scope, query, created_at, updated_at)
           values ($1,$2,$3,$4,$5,now(),now())`,
          [id, account.id, input.name, input.scope, JSON.stringify(input.query)],
        );
      } else {
        await pool.query(
          `update saved_filters set name=$1, scope=$2, query=$3, updated_at=now() where id=$4 and account_id=$5`,
          [input.name, input.scope, JSON.stringify(input.query), id, account.id],
        );
      }
      return ok(response);
    }

    if (action === 'deleteSavedFilter') {
      await pool.query('delete from saved_filters where id=$1 and account_id=$2', [payload.id, account.id]);
      return ok(response);
    }

    if (action === 'renameTag') {
      const input = tagRenameSchema.parse(payload);
      // Replace `from` with `to` everywhere; dedupe so renaming into an existing tag collapses to one entry.
      await pool.query(
        `update expenses
         set tags = (
           select coalesce(jsonb_agg(distinct case when v = $1 then $2 else v end), '[]'::jsonb)
           from jsonb_array_elements_text(tags) as v
         ),
         updated_at = now()
         where account_id = $3 and tags ? $1`,
        [input.from, input.to, account.id],
      );
      await activity(account.id, 'settings', account.id, `Renamed tag ${input.from} → ${input.to}`, 'Tag renamed across all expenses.');
      return ok(response);
    }

    if (action === 'deleteTag') {
      const tag = String(payload.tag || '');
      if (!tag) return fail(response, 400, 'Tag is required.');
      await pool.query(
        `update expenses
         set tags = coalesce((select jsonb_agg(v) from jsonb_array_elements_text(tags) as v where v <> $1), '[]'::jsonb),
         updated_at = now()
         where account_id = $2 and tags ? $1`,
        [tag, account.id],
      );
      await activity(account.id, 'settings', account.id, `Removed tag ${tag}`, 'Tag deleted from all expenses.');
      return ok(response);
    }

    return fail(response, 404, `Unknown app action: ${action}`);
  } catch (error) {
    return handleError(response, error);
  }
}
