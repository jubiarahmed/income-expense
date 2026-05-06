import crypto from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { pool } from './db.js';

const COOKIE_NAME = 'expense_session';
const SESSION_DAYS = 30;

export interface ServerAccount {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'superadmin';
  status: 'active' | 'held';
  holdReason?: string;
  createdAt: string;
  updatedAt: string;
}

export function makeId(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

export function createPasswordSalt() {
  return crypto.randomBytes(16).toString('base64');
}

export function hashPassword(password: string, salt: string) {
  return crypto.pbkdf2Sync(password, salt, 150000, 32, 'sha256').toString('base64');
}

export function verifyPassword(password: string, salt: string, expectedHash: string) {
  return crypto.timingSafeEqual(Buffer.from(hashPassword(password, salt)), Buffer.from(expectedHash));
}

function hashToken(token: string) {
  return crypto.createHmac('sha256', process.env.AUTH_SECRET || 'dev-secret').update(token).digest('base64');
}

function parseCookies(header = '') {
  return Object.fromEntries(
    header
      .split(';')
      .map((cookie) => cookie.trim())
      .filter(Boolean)
      .map((cookie) => {
        const index = cookie.indexOf('=');
        return [cookie.slice(0, index), decodeURIComponent(cookie.slice(index + 1))];
      }),
  );
}

function mapAccount(row: Record<string, unknown>): ServerAccount {
  return {
    id: String(row.id),
    name: String(row.name),
    email: String(row.email),
    role: row.role as ServerAccount['role'],
    status: row.status as ServerAccount['status'],
    holdReason: row.hold_reason ? String(row.hold_reason) : undefined,
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
  };
}

export async function createSession(response: VercelResponse, accountId: string) {
  const token = crypto.randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await pool.query(
    `insert into sessions (id, account_id, token_hash, expires_at, created_at, updated_at)
     values ($1, $2, $3, $4, now(), now())`,
    [makeId('session'), accountId, hashToken(token), expiresAt],
  );
  response.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${
      SESSION_DAYS * 24 * 60 * 60
    }${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`,
  );
}

export function clearSessionCookie(response: VercelResponse) {
  response.setHeader('Set-Cookie', `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
}

export async function getCurrentAccount(request: VercelRequest) {
  const token = parseCookies(request.headers.cookie)[COOKIE_NAME];
  if (!token) return undefined;
  const result = await pool.query(
    `select a.*
     from sessions s
     join accounts a on a.id = s.account_id
     where s.token_hash = $1 and s.expires_at > now()
     limit 1`,
    [hashToken(token)],
  );
  if (!result.rowCount) return undefined;
  return mapAccount(result.rows[0]);
}

export async function requireAccount(request: VercelRequest) {
  const account = await getCurrentAccount(request);
  if (!account) throw new Error('Authentication required.');
  if (account.status === 'held') throw new Error(account.holdReason || 'This account is on hold.');
  return account;
}

export async function requireSuperadmin(request: VercelRequest) {
  const account = await requireAccount(request);
  if (account.role !== 'superadmin') throw new Error('Superadmin permission is required.');
  return account;
}

export function publicAccount(account?: ServerAccount) {
  return account;
}
