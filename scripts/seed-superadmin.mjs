import crypto from 'node:crypto';
import pg from 'pg';

const { Pool } = pg;

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
if (!process.env.SUPERADMIN_EMAIL) throw new Error('SUPERADMIN_EMAIL is required.');
if (!process.env.SUPERADMIN_PASSWORD) throw new Error('SUPERADMIN_PASSWORD is required.');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.POSTGRES_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
});

function makeId(prefix) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 150000, 32, 'sha256').toString('base64');
}

const email = process.env.SUPERADMIN_EMAIL.trim().toLowerCase();
const salt = crypto.randomBytes(16).toString('base64');
const passwordHash = hashPassword(process.env.SUPERADMIN_PASSWORD, salt);
const existing = await pool.query('select id from accounts where email = $1', [email]);

if (existing.rowCount) {
  const accountId = existing.rows[0].id;
  await pool.query(
    `update accounts
     set name = $2,
         role = 'superadmin',
         status = 'active',
         hold_reason = null,
         password_hash = $3,
         password_salt = $4,
         updated_at = now()
     where id = $1`,
    [accountId, process.env.SUPERADMIN_NAME || 'Expense Tracker Superadmin', passwordHash, salt],
  );
  await pool.query('delete from sessions where account_id = $1', [accountId]);
  console.log(`Superadmin updated: ${email}`);
} else {
  await pool.query(
    `insert into accounts
      (id, name, email, role, status, password_hash, password_salt, created_at, updated_at)
     values ($1, $2, $3, 'superadmin', 'active', $4, $5, now(), now())`,
    [
      makeId('account'),
      process.env.SUPERADMIN_NAME || 'Expense Tracker Superadmin',
      email,
      passwordHash,
      salt,
    ],
  );
  console.log(`Superadmin seeded: ${email}`);
}

await pool.end();
