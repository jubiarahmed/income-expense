// Seed realistic 3-month demo data for a single user account.
// Usage:
//   node --env-file=.env.local scripts/seed-demo.mjs \
//     --email=user@example.com \
//     --password=optional-new-password \
//     --name="Optional Display Name"
//
// If the account doesn't exist it will be created; if --password is provided
// the password is reset to that value. Existing finance data for the account
// is wiped before reseeding so the demo is repeatable.

import crypto from 'node:crypto';
import pg from 'pg';

const { Pool } = pg;

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [key, value] = arg.replace(/^--/, '').split('=');
    return [key, value ?? true];
  }),
);

if (!args.email) throw new Error('Pass --email=<address>.');

const email = String(args.email).trim().toLowerCase();
const password = args.password ? String(args.password) : null;
const displayName = args.name ? String(args.name) : 'Demo User';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.POSTGRES_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
});

function makeId(prefix) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function hashPassword(pw, salt) {
  return crypto.pbkdf2Sync(pw, salt, 150000, 32, 'sha256').toString('base64');
}

function pad(n) {
  return String(n).padStart(2, '0');
}

function isoDay(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function shift(d, days) {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
}

function shiftMonth(d, months) {
  const next = new Date(d);
  next.setMonth(next.getMonth() + months);
  return next;
}

// ---------- account ----------
let accountId;
const existing = await pool.query('select id from accounts where email = $1', [email]);
if (existing.rowCount) {
  accountId = existing.rows[0].id;
  console.log(`Account already exists: ${email} (${accountId})`);
  if (password) {
    const salt = crypto.randomBytes(16).toString('base64');
    await pool.query(
      `update accounts set name=$2, password_hash=$3, password_salt=$4, status='active', updated_at=now() where id=$1`,
      [accountId, displayName, hashPassword(password, salt), salt],
    );
    await pool.query('delete from sessions where account_id=$1', [accountId]);
    console.log(`  password updated`);
  }
} else {
  if (!password) throw new Error('Account does not exist — supply --password to create it.');
  accountId = makeId('account');
  const salt = crypto.randomBytes(16).toString('base64');
  await pool.query(
    `insert into accounts (id, name, email, role, status, password_hash, password_salt, created_at, updated_at)
     values ($1, $2, $3, 'user', 'active', $4, $5, now(), now())`,
    [accountId, displayName, email, hashPassword(password, salt), salt],
  );
  console.log(`Created account ${email} (${accountId})`);
}

// ---------- wipe existing finance data ----------
console.log('Wiping existing finance data...');
await pool.query('begin');
try {
  for (const table of [
    'preferences', 'contacts', 'shared_groups', 'expenses', 'incomes', 'transfers',
    'loans', 'item_records', 'subscriptions', 'reminders', 'activity_logs',
    'budgets', 'wallets', 'goal_contributions', 'goals',
    'saved_filters', 'transaction_templates',
  ]) {
    await pool.query(`delete from ${table} where account_id=$1`, [accountId]);
  }
  await pool.query('commit');
} catch (err) {
  await pool.query('rollback');
  throw err;
}

// ---------- preferences ----------
await pool.query(
  `insert into preferences (id, account_id, currency, reminder_days_before, notifications_enabled, theme, notification_prefs, updated_at)
   values ($1,$2,'BDT',2,false,'light',$3,now())`,
  [
    `preferences_${accountId}`,
    accountId,
    JSON.stringify({
      remindBeforeDays: [1, 3],
      remindOnDueDate: true,
      remindAfterOverdue: true,
      dailySummary: false,
      weeklySummary: true,
      budgetWarning: true,
      subscriptionRenewal: true,
    }),
  ],
);

// ---------- contacts ----------
const contactSpecs = [
  { name: 'Rahim Uddin', phone: '+880 1711 111111', notes: 'College friend' },
  { name: 'Karim Hossain', phone: '+880 1712 222222', notes: 'Office colleague' },
  { name: 'Salma Akter', phone: '+880 1713 333333', notes: 'Sister' },
  { name: 'Nadia Islam', phone: '+880 1714 444444', notes: 'Cousin' },
  { name: 'Imran Khan', phone: '+880 1715 555555', notes: 'Roommate' },
  { name: 'Tania Begum', phone: '+880 1716 666666', notes: 'Mom' },
];
const contacts = [];
for (const spec of contactSpecs) {
  const id = makeId('contact');
  contacts.push({ id, ...spec });
  await pool.query(
    `insert into contacts (id, account_id, name, phone, notes, created_at, updated_at)
     values ($1,$2,$3,$4,$5,now(),now())`,
    [id, accountId, spec.name, spec.phone, spec.notes],
  );
}
const byName = (name) => contacts.find((c) => c.name === name);

// ---------- wallets ----------
const walletSpecs = [
  { method: 'Cash', name: 'Wallet', openingBalance: 2500 },
  { method: 'bKash', name: 'bKash personal', openingBalance: 8200 },
  { method: 'Nagad', name: 'Nagad', openingBalance: 1200 },
  { method: 'Card', name: 'Brac Bank Visa', openingBalance: -4000 },
  { method: 'Bank', name: 'DBBL salary', openingBalance: 35000 },
];
for (const wallet of walletSpecs) {
  await pool.query(
    `insert into wallets (id, account_id, method, name, opening_balance, created_at, updated_at)
     values ($1,$2,$3,$4,$5,now(),now())`,
    [makeId('wallet'), accountId, wallet.method, wallet.name, wallet.openingBalance],
  );
}

// ---------- expenses across 3 months ----------
const today = new Date();
const startDate = shiftMonth(today, -3);

const expenseTemplates = [
  // Daily / weekly food
  { category: 'Food', merchant: 'KFC', amounts: [550, 700, 650], paymentMethod: 'bKash', noteOptions: ['Family dinner', 'Lunch'], frequencyDays: 9, tags: ['eatout'] },
  { category: 'Food', merchant: 'Star Kabab', amounts: [350, 420, 380], paymentMethod: 'Cash', noteOptions: ['Office lunch', 'Quick bite'], frequencyDays: 4, tags: ['office'] },
  { category: 'Food', merchant: 'Pickaboo Grocery', amounts: [1800, 2200, 1950], paymentMethod: 'Card', noteOptions: ['Weekly groceries'], frequencyDays: 7, tags: ['family'] },
  { category: 'Vegetables', merchant: 'Local market', amounts: [220, 180, 300], paymentMethod: 'Cash', noteOptions: ['Vegetables for the week'], frequencyDays: 5, tags: ['family'] },
  { category: 'Fruits', merchant: 'Agora', amounts: [400, 320, 500], paymentMethod: 'Card', noteOptions: ['Fruits'], frequencyDays: 6, tags: ['family'] },
  { category: 'Snacks', merchant: 'Mr. Baker', amounts: [120, 180, 90], paymentMethod: 'Cash', noteOptions: ['Tea time snack'], frequencyDays: 3, tags: ['office'] },

  // Transport
  { category: 'Transportation', merchant: 'Pathao', amounts: [80, 120, 150, 95], paymentMethod: 'bKash', noteOptions: ['Pathao ride home', 'Pathao to office'], frequencyDays: 2, tags: ['commute'] },
  { category: 'Transportation', merchant: 'Uber', amounts: [220, 350, 180], paymentMethod: 'bKash', noteOptions: ['Uber ride'], frequencyDays: 6, tags: ['commute'] },

  // Bills
  { category: 'Phone', merchant: 'Grameenphone', amounts: [350, 500, 700], paymentMethod: 'bKash', noteOptions: ['Phone recharge'], frequencyDays: 14, tags: [] },
  { category: 'Bills', merchant: 'WASA', amounts: [800], paymentMethod: 'Bank', noteOptions: ['Water bill'], frequencyDays: 30, tags: ['utility'] },
  { category: 'Bills', merchant: 'Desco', amounts: [1900, 2400, 2100], paymentMethod: 'Bank', noteOptions: ['Electricity bill'], frequencyDays: 30, tags: ['utility'] },

  // Subscriptions paid manually
  { category: 'Entertainment', merchant: 'Netflix', amounts: [550], paymentMethod: 'Card', noteOptions: ['Netflix monthly'], frequencyDays: 30, tags: ['subscription'] },
  { category: 'Entertainment', merchant: 'Star Cineplex', amounts: [600, 900], paymentMethod: 'Card', noteOptions: ['Movie night'], frequencyDays: 25, tags: ['friends'] },

  // Health
  { category: 'Health', merchant: 'Square Hospital', amounts: [1200, 2500], paymentMethod: 'Card', noteOptions: ['Doctor visit'], frequencyDays: 45, tags: [] },
  { category: 'Medicine', merchant: 'Lazz Pharma', amounts: [240, 380, 150], paymentMethod: 'bKash', noteOptions: ['Medicine'], frequencyDays: 12, tags: [] },

  // Shopping
  { category: 'Shopping', merchant: 'Daraz', amounts: [1800, 2500, 1200], paymentMethod: 'Card', noteOptions: ['Daraz order'], frequencyDays: 16, tags: ['online'] },
  { category: 'Clothing', merchant: 'Aarong', amounts: [3500], paymentMethod: 'Card', noteOptions: ['Eid shopping'], frequencyDays: 60, tags: [] },

  // Social
  { category: 'Social', merchant: 'Coffee with friends', amounts: [450, 600], paymentMethod: 'Cash', noteOptions: ['Coffee with friends'], frequencyDays: 18, tags: ['friends'] },

  // Education
  { category: 'Education', merchant: 'Coursera', amounts: [3500], paymentMethod: 'Card', noteOptions: ['Course subscription'], frequencyDays: 90, tags: ['career'] },

  // One-off / random
  { category: 'Gifts', merchant: 'Local florist', amounts: [800], paymentMethod: 'Cash', noteOptions: ['Birthday flowers'], frequencyDays: 40, tags: ['friends'] },
  { category: 'Donations', merchant: 'Charity', amounts: [500], paymentMethod: 'bKash', noteOptions: ['Donation'], frequencyDays: 30, tags: [] },
  { category: 'Car', merchant: 'Padma Filling', amounts: [2000, 1800], paymentMethod: 'Card', noteOptions: ['Fuel'], frequencyDays: 10, tags: [] },
  { category: 'Cigarettes', merchant: 'Local store', amounts: [120, 150], paymentMethod: 'Cash', noteOptions: ['Cigarettes'], frequencyDays: 7, tags: [] },
];

function pickOne(arr, seed) {
  return arr[seed % arr.length];
}

let expenseCount = 0;
let cursor = new Date(startDate);
const endDate = new Date(today);
while (cursor < endDate) {
  for (let i = 0; i < expenseTemplates.length; i++) {
    const t = expenseTemplates[i];
    const dayOffset = Math.floor((cursor.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    // Each template fires roughly every frequencyDays days, offset by i so they don't all stack
    if ((dayOffset + i * 3) % t.frequencyDays !== 0) continue;
    const amount = pickOne(t.amounts, dayOffset + i);
    const note = pickOne(t.noteOptions, dayOffset + i);
    const id = makeId('expense');
    await pool.query(
      `insert into expenses (id, account_id, amount, category, note, merchant, date, payment_method, tags, receipt_image, created_at, updated_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,null,now() - ($10 || ' days')::interval, now() - ($10 || ' days')::interval)`,
      [
        id,
        accountId,
        amount,
        t.category,
        note,
        t.merchant,
        isoDay(cursor),
        t.paymentMethod,
        JSON.stringify(t.tags),
        Math.max(0, Math.floor((today.getTime() - cursor.getTime()) / (1000 * 60 * 60 * 24))),
      ],
    );
    expenseCount++;
  }
  cursor = shift(cursor, 1);
}
console.log(`  ${expenseCount} expenses`);

// ---------- incomes ----------
const incomes = [
  { offsetDays: 0, monthsAgo: 0, category: 'Salary', source: 'Acme Corp', amount: 65000, paymentMethod: 'Bank' },
  { offsetDays: 0, monthsAgo: 1, category: 'Salary', source: 'Acme Corp', amount: 65000, paymentMethod: 'Bank' },
  { offsetDays: 0, monthsAgo: 2, category: 'Salary', source: 'Acme Corp', amount: 65000, paymentMethod: 'Bank' },
  { offsetDays: 15, monthsAgo: 0, category: 'Part-Time', source: 'Freelance React project', amount: 22000, paymentMethod: 'bKash' },
  { offsetDays: 22, monthsAgo: 1, category: 'Part-Time', source: 'Freelance design', amount: 12000, paymentMethod: 'bKash' },
  { offsetDays: 8, monthsAgo: 0, category: 'Refund', source: 'Daraz return', amount: 1800, paymentMethod: 'Card' },
  { offsetDays: 12, monthsAgo: 2, category: 'Bonus', source: 'Performance bonus', amount: 18000, paymentMethod: 'Bank' },
  { offsetDays: 5, monthsAgo: 1, category: 'Gift', source: 'Eid gift from family', amount: 5000, paymentMethod: 'Cash' },
];
for (const income of incomes) {
  const d = shift(shiftMonth(today, -income.monthsAgo), income.offsetDays - shiftMonth(today, -income.monthsAgo).getDate() + 5);
  const date = new Date(today.getFullYear(), today.getMonth() - income.monthsAgo, Math.max(1, income.offsetDays || 1));
  await pool.query(
    `insert into incomes (id, account_id, amount, category, source, note, date, payment_method, created_at, updated_at)
     values ($1,$2,$3,$4,$5,'',$6,$7,now(),now())`,
    [makeId('income'), accountId, income.amount, income.category, income.source, isoDay(date), income.paymentMethod],
  );
}
console.log(`  ${incomes.length} incomes`);

// ---------- transfers ----------
const transfers = [
  { date: shift(today, -2), amount: 5000, from: 'Bank', to: 'bKash', fee: 50, note: 'Top up bKash' },
  { date: shift(today, -8), amount: 3000, from: 'Bank', to: 'Cash', fee: 0, note: 'Cash withdrawal' },
  { date: shift(today, -16), amount: 8000, from: 'Bank', to: 'bKash', fee: 80, note: 'Top up bKash' },
  { date: shift(today, -25), amount: 2500, from: 'bKash', to: 'Nagad', fee: 25, note: 'Move to Nagad' },
  { date: shift(today, -40), amount: 10000, from: 'Bank', to: 'Cash', fee: 0, note: 'Big cash withdrawal for rent' },
  { date: shift(today, -55), amount: 4000, from: 'Bank', to: 'bKash', fee: 40, note: 'Top up bKash' },
];
for (const t of transfers) {
  await pool.query(
    `insert into transfers (id, account_id, amount, from_method, to_method, fee, date, note, created_at, updated_at)
     values ($1,$2,$3,$4,$5,$6,$7,$8,now(),now())`,
    [makeId('transfer'), accountId, t.amount, t.from, t.to, t.fee, isoDay(t.date), t.note],
  );
}
console.log(`  ${transfers.length} transfers`);

// ---------- budgets ----------
const budgets = [
  { category: 'Food', limit: 10000, notifyAt: 80 },
  { category: 'Transportation', limit: 4000, notifyAt: 80 },
  { category: 'Shopping', limit: 8000, notifyAt: 80 },
  { category: 'Entertainment', limit: 3000, notifyAt: 75 },
  { category: 'Bills', limit: 5000, notifyAt: 90 },
];
for (const b of budgets) {
  await pool.query(
    `insert into budgets (id, account_id, category, monthly_limit, notify_at, created_at, updated_at)
     values ($1,$2,$3,$4,$5,now(),now())`,
    [makeId('budget'), accountId, b.category, b.limit, b.notifyAt],
  );
}
console.log(`  ${budgets.length} budgets`);

// ---------- goals ----------
const goals = [
  { name: 'Buy MacBook Air', target: 180000, saved: 75000, wallet: 'Bank', deadline: shift(today, 120), notes: 'For full-stack dev work' },
  { name: 'Emergency fund', target: 100000, saved: 42000, wallet: 'Bank', deadline: null, notes: '3 months of expenses' },
  { name: 'Cox\'s Bazar trip', target: 30000, saved: 18500, wallet: 'bKash', deadline: shift(today, 60), notes: 'Year-end family trip' },
];
const goalIds = [];
for (const g of goals) {
  const id = makeId('goal');
  goalIds.push({ id, ...g });
  await pool.query(
    `insert into goals (id, account_id, name, target_amount, saved_amount, wallet_method, deadline, notes, status, created_at, updated_at)
     values ($1,$2,$3,$4,$5,$6,$7,$8,'active',now(),now())`,
    [id, accountId, g.name, g.target, g.saved, g.wallet, g.deadline ? isoDay(g.deadline) : null, g.notes],
  );
}
console.log(`  ${goals.length} goals`);

// goal contributions — split the saved amount into a few realistic chunks
for (const g of goalIds) {
  const slices = [Math.round(g.saved * 0.4), Math.round(g.saved * 0.35), g.saved - Math.round(g.saved * 0.4) - Math.round(g.saved * 0.35)];
  let dayBack = 60;
  for (const slice of slices) {
    await pool.query(
      `insert into goal_contributions (id, account_id, goal_id, amount, date, note, created_at)
       values ($1,$2,$3,$4,$5,'Monthly contribution', now())`,
      [makeId('contribution'), accountId, g.id, slice, isoDay(shift(today, -dayBack))],
    );
    dayBack -= 25;
  }
}

// ---------- loans (some with interest) ----------
const loanSpecs = [
  { person: 'Rahim Uddin', direction: 'lent', amount: 5000, date: shift(today, -50), dueDate: shift(today, 10), notes: 'For business shop', interestRate: 0, interestType: 'none' },
  { person: 'Karim Hossain', direction: 'lent', amount: 12000, date: shift(today, -75), dueDate: shift(today, -5), notes: 'Quick cash', interestRate: 5, interestType: 'flat' },
  { person: 'Imran Khan', direction: 'borrowed', amount: 8000, date: shift(today, -35), dueDate: shift(today, 25), notes: 'Rent gap', interestRate: 0, interestType: 'none' },
  { person: 'Salma Akter', direction: 'lent', amount: 25000, date: shift(today, -85), dueDate: shift(today, 60), notes: 'Sister medical', interestRate: 8, interestType: 'apr' },
];
const loanRows = [];
for (const l of loanSpecs) {
  const contact = byName(l.person);
  if (!contact) continue;
  const id = makeId('loan');
  loanRows.push({ id, ...l });
  await pool.query(
    `insert into loans (id, account_id, person_id, direction, amount, date, due_date, notes, status, interest_rate, interest_type, created_at, updated_at)
     values ($1,$2,$3,$4,$5,$6,$7,$8,'active',$9,$10,now(),now())`,
    [id, accountId, contact.id, l.direction, l.amount, isoDay(l.date), isoDay(l.dueDate), l.notes, l.interestRate, l.interestType],
  );
}
console.log(`  ${loanRows.length} loans`);

// loan payments
const loanPayments = [
  { loanName: 'Rahim Uddin', amount: 2000, daysAgo: 20, note: 'First repayment' },
  { loanName: 'Karim Hossain', amount: 5000, daysAgo: 30, note: 'Partial' },
  { loanName: 'Imran Khan', amount: 3000, daysAgo: 15, note: 'Partial rent return' },
];
for (const p of loanPayments) {
  const loan = loanRows.find((l) => l.person === p.loanName);
  if (!loan) continue;
  await pool.query(
    `insert into loan_payments (id, account_id, loan_id, amount, date, note, created_at)
     values ($1,$2,$3,$4,$5,$6,now())`,
    [makeId('payment'), accountId, loan.id, p.amount, isoDay(shift(today, -p.daysAgo)), p.note],
  );
}

// ---------- borrowed/lent items ----------
const items = [
  { name: 'Power bank', direction: 'lent', person: 'Nadia Islam', daysAgo: 12, note: '10000 mAh Anker', dueDays: 14 },
  { name: 'Camera lens', direction: 'borrowed', person: 'Karim Hossain', daysAgo: 6, note: 'Sigma 35mm', dueDays: 10 },
  { name: 'Cookbook', direction: 'lent', person: 'Tania Begum', daysAgo: 30, note: 'Italian cooking', dueDays: -5 },
];
for (const item of items) {
  const contact = byName(item.person);
  if (!contact) continue;
  const isOverdue = item.dueDays < 0;
  await pool.query(
    `insert into item_records (id, account_id, item_name, person_id, direction, date, due_date, note, status, returned_date, created_at, updated_at)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,null,now(),now())`,
    [
      makeId('item'),
      accountId,
      item.name,
      contact.id,
      item.direction,
      isoDay(shift(today, -item.daysAgo)),
      isoDay(shift(today, item.dueDays)),
      item.note,
      'active',
    ],
  );
  void isOverdue;
}
console.log(`  ${items.length} items`);

// ---------- subscriptions ----------
const subs = [
  { name: 'Netflix Premium', amount: 550, cycle: 'monthly', category: 'Entertainment', nextDays: 8, notes: 'Family plan', status: 'active' },
  { name: 'Spotify', amount: 199, cycle: 'monthly', category: 'Entertainment', nextDays: 14, notes: '', status: 'active' },
  { name: 'Internet — Link3', amount: 1500, cycle: 'monthly', category: 'Bills', nextDays: 3, notes: 'Fiber 30Mbps', status: 'active' },
  { name: 'Coursera Plus', amount: 3500, cycle: 'yearly', category: 'Education', nextDays: 240, notes: 'Career growth', status: 'active' },
  { name: 'Gym membership', amount: 1800, cycle: 'monthly', category: 'Sports', nextDays: 22, notes: 'Quarterly billing', status: 'active' },
];
for (const s of subs) {
  await pool.query(
    `insert into subscriptions (id, account_id, name, amount, cycle, category, next_due_date, auto_renew, notes, status, created_at, updated_at)
     values ($1,$2,$3,$4,$5,$6,$7,true,$8,$9,now(),now())`,
    [makeId('subscription'), accountId, s.name, s.amount, s.cycle, s.category, isoDay(shift(today, s.nextDays)), s.notes, s.status],
  );
}
console.log(`  ${subs.length} subscriptions`);

// ---------- shared group + shared expenses ----------
const groupId = makeId('group');
const groupParticipants = [byName('Rahim Uddin'), byName('Karim Hossain'), byName('Imran Khan')].filter(Boolean);
await pool.query(
  `insert into shared_groups (id, account_id, name, description, participant_ids, created_at, updated_at)
   values ($1,$2,$3,$4,$5,now(),now())`,
  [groupId, accountId, 'Roommates', 'Shared apartment expenses', JSON.stringify(groupParticipants.map((c) => c.id))],
);

const sharedExpenses = [
  { date: shift(today, -3), amount: 6400, note: 'Monthly groceries', payer: 'me', split: 'equal', settled: false },
  { date: shift(today, -10), amount: 4500, note: 'Internet bill', payer: 'me', split: 'equal', settled: false },
  { date: shift(today, -18), amount: 3200, note: 'Power bill', payer: byName('Karim Hossain').id, split: 'equal', settled: false },
  { date: shift(today, -28), amount: 12000, note: 'Rent share', payer: 'me', split: 'equal', settled: true },
  { date: shift(today, -45), amount: 2200, note: 'Trip snacks', payer: byName('Rahim Uddin').id, split: 'equal', settled: true },
];
for (const se of sharedExpenses) {
  const participants = ['me', ...groupParticipants.map((c) => c.id)];
  const perShare = Math.round((se.amount / participants.length) * 100) / 100;
  const shares = participants.map((id) => ({ contactId: id, amount: perShare }));
  const drift = se.amount - shares.reduce((sum, s) => sum + s.amount, 0);
  shares[shares.length - 1].amount = Math.round((shares[shares.length - 1].amount + drift) * 100) / 100;
  await pool.query(
    `insert into shared_expenses (id, account_id, group_id, amount, note, date, payer_id, participant_ids, split_type, shares, settled, created_at, updated_at)
     values ($1,$2,$3,$4,$5,$6,$7,$8,'equal',$9,$10,now(),now())`,
    [
      makeId('shared'),
      accountId,
      groupId,
      se.amount,
      se.note,
      isoDay(se.date),
      se.payer,
      JSON.stringify(participants),
      JSON.stringify(shares),
      se.settled,
    ],
  );
}
console.log(`  1 shared group + ${sharedExpenses.length} shared expenses`);

// ---------- transaction templates ----------
const templates = [
  { name: 'Lunch', kind: 'expense', data: { amount: 150, category: 'Food', paymentMethod: 'Cash', note: 'Quick lunch' } },
  { name: 'Bus fare', kind: 'expense', data: { amount: 50, category: 'Transportation', paymentMethod: 'Cash' } },
  { name: 'Phone recharge', kind: 'expense', data: { amount: 500, category: 'Recharge', paymentMethod: 'bKash', merchant: 'Grameenphone' } },
  { name: 'Salary', kind: 'income', data: { amount: 65000, category: 'Salary', source: 'Acme Corp', paymentMethod: 'Bank' } },
  { name: 'Top up bKash', kind: 'transfer', data: { amount: 5000, fromMethod: 'Bank', toMethod: 'bKash', fee: 50 } },
];
for (const t of templates) {
  await pool.query(
    `insert into transaction_templates (id, account_id, name, kind, data, uses_count, last_used_at, created_at, updated_at)
     values ($1,$2,$3,$4,$5,$6,$7,now(),now())`,
    [makeId('template'), accountId, t.name, t.kind, JSON.stringify(t.data), Math.floor(Math.random() * 5), null],
  );
}
console.log(`  ${templates.length} templates`);

// ---------- saved filters ----------
const filters = [
  { name: 'Food last 30 days', scope: 'expense', query: { categories: ['Food'], startDate: isoDay(shift(today, -30)) } },
  { name: 'bKash expenses', scope: 'expense', query: { paymentMethods: ['bKash'] } },
  { name: 'Big spends (>1000)', scope: 'all', query: { minAmount: 1000 } },
];
for (const f of filters) {
  await pool.query(
    `insert into saved_filters (id, account_id, name, scope, query, created_at, updated_at)
     values ($1,$2,$3,$4,$5,now(),now())`,
    [makeId('savedfilter'), accountId, f.name, f.scope, JSON.stringify(f.query)],
  );
}
console.log(`  ${filters.length} saved filters`);

// ---------- activity log (a few representative entries) ----------
const sampleActivity = [
  { entity: 'expense', title: 'Spent 550 on Food', detail: 'Netflix monthly', amount: 550, daysAgo: 1 },
  { entity: 'income', title: 'Income Salary', detail: 'Acme Corp', amount: 65000, daysAgo: 5 },
  { entity: 'transfer', title: 'Bank → bKash', detail: 'Top up bKash', amount: 5000, daysAgo: 2 },
  { entity: 'loan', title: 'Money lent', detail: 'Sister medical', amount: 25000, daysAgo: 85 },
  { entity: 'goal', title: 'Saved toward Emergency fund', detail: 'Progress 42000/100000', amount: 5000, daysAgo: 10 },
  { entity: 'budget', title: 'Budget for Food', detail: 'Monthly limit 10000', amount: 10000, daysAgo: 90 },
  { entity: 'settings', title: 'Preferences updated', detail: 'BDT · light theme', amount: null, daysAgo: 30 },
  { entity: 'subscription', title: 'Added Netflix Premium', detail: 'monthly recurring payment.', amount: 550, daysAgo: 90 },
];
for (const a of sampleActivity) {
  await pool.query(
    `insert into activity_logs (id, account_id, entity_type, entity_id, person_id, title, detail, amount, created_at)
     values ($1,$2,$3,$4,null,$5,$6,$7,now() - ($8 || ' days')::interval)`,
    [makeId('activity'), accountId, a.entity, 'demo', a.title, a.detail, a.amount, a.daysAgo],
  );
}
console.log(`  ${sampleActivity.length} activity log entries`);

await pool.end();
console.log('\n✅ Demo data seeded. Sign in to test all features.');
