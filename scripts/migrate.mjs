import pg from 'pg';

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required.');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.POSTGRES_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
});

const sql = `
create table if not exists accounts (
  id text primary key,
  name text not null,
  email text not null unique,
  role text not null check (role in ('user', 'superadmin')),
  status text not null check (status in ('active', 'held')),
  password_hash text not null,
  password_salt text not null,
  hold_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists sessions (
  id text primary key,
  account_id text not null references accounts(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists platform_settings (
  id text primary key,
  account_creation_enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by text references accounts(id) on delete set null
);

insert into platform_settings (id, account_creation_enabled)
values ('global', true)
on conflict (id) do nothing;

create table if not exists preferences (
  id text primary key,
  account_id text not null unique references accounts(id) on delete cascade,
  currency text not null default 'BDT',
  reminder_days_before integer not null default 2,
  notifications_enabled boolean not null default false,
  theme text not null default 'light',
  seeded_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists contacts (
  id text primary key,
  account_id text not null references accounts(id) on delete cascade,
  name text not null,
  phone text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists expenses (
  id text primary key,
  account_id text not null references accounts(id) on delete cascade,
  amount numeric(12,2) not null,
  category text not null,
  note text not null default '',
  date date not null,
  payment_method text not null,
  tags jsonb not null default '[]'::jsonb,
  receipt_image text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table expenses add column if not exists receipt_image text;

create table if not exists shared_groups (
  id text primary key,
  account_id text not null references accounts(id) on delete cascade,
  name text not null,
  description text not null default '',
  participant_ids jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists shared_expenses (
  id text primary key,
  account_id text not null references accounts(id) on delete cascade,
  group_id text not null references shared_groups(id) on delete cascade,
  amount numeric(12,2) not null,
  note text not null,
  date date not null,
  payer_id text not null,
  participant_ids jsonb not null default '[]'::jsonb,
  split_type text not null,
  shares jsonb not null default '[]'::jsonb,
  settled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists loans (
  id text primary key,
  account_id text not null references accounts(id) on delete cascade,
  person_id text not null,
  direction text not null,
  amount numeric(12,2) not null,
  date date not null,
  due_date date,
  notes text not null default '',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists loan_payments (
  id text primary key,
  account_id text not null references accounts(id) on delete cascade,
  loan_id text not null references loans(id) on delete cascade,
  amount numeric(12,2) not null,
  date date not null,
  note text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists item_records (
  id text primary key,
  account_id text not null references accounts(id) on delete cascade,
  item_name text not null,
  person_id text not null,
  direction text not null,
  date date not null,
  due_date date,
  note text not null default '',
  status text not null default 'active',
  returned_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists subscriptions (
  id text primary key,
  account_id text not null references accounts(id) on delete cascade,
  name text not null,
  amount numeric(12,2) not null,
  cycle text not null,
  category text not null,
  next_due_date date not null,
  auto_renew boolean not null default true,
  notes text not null default '',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists reminders (
  id text primary key,
  account_id text not null references accounts(id) on delete cascade,
  source_type text not null,
  source_id text not null,
  title text not null,
  due_at date not null,
  status text not null default 'scheduled',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists activity_logs (
  id text primary key,
  account_id text not null references accounts(id) on delete cascade,
  entity_type text not null,
  entity_id text not null,
  person_id text,
  title text not null,
  detail text not null,
  amount numeric(12,2),
  created_at timestamptz not null default now()
);

create index if not exists contacts_account_idx on contacts(account_id);
create index if not exists expenses_account_date_idx on expenses(account_id, date desc);
create index if not exists shared_groups_account_idx on shared_groups(account_id);
create index if not exists shared_expenses_account_date_idx on shared_expenses(account_id, date desc);
create index if not exists loans_account_idx on loans(account_id);
create index if not exists loan_payments_account_idx on loan_payments(account_id);
create index if not exists item_records_account_idx on item_records(account_id);
create index if not exists subscriptions_account_idx on subscriptions(account_id);
create index if not exists reminders_account_idx on reminders(account_id);
create index if not exists activity_logs_account_idx on activity_logs(account_id, created_at desc);
`;

await pool.query(sql);
await pool.end();

console.log('Database migration complete.');
