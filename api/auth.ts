import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { clearSessionCookie, createPasswordSalt, createSession, getCurrentAccount, hashPassword, makeId, publicAccount, verifyPassword } from './_lib/auth.js';
import { pool, transaction } from './_lib/db.js';
import { created, fail, handleError, ok, readAction, setNoStore } from './_lib/http.js';

const signUpSchema = z
  .object({
    name: z.string().trim().min(1),
    email: z.string().trim().toLowerCase().email(),
    password: z.string().min(8),
    confirmPassword: z.string().min(1),
  })
  .refine((input) => input.password === input.confirmPassword, 'Passwords do not match');

const signInSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

async function readRegistrationState() {
  const [settings, count] = await Promise.all([
    pool.query(`select account_creation_enabled from platform_settings where id = 'global'`),
    pool.query('select count(*)::int as count from accounts'),
  ]);
  return {
    accountCreationEnabled: Boolean(settings.rows[0]?.account_creation_enabled ?? true),
    accountCount: Number(count.rows[0]?.count ?? 0),
  };
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  setNoStore(response);

  try {
    const action = readAction(request);

    if (request.method === 'GET' && action === 'session') {
      const account = await getCurrentAccount(request);
      return ok(response, { account: account?.status === 'held' ? undefined : publicAccount(account) });
    }

    if (request.method === 'GET' && action === 'registration') {
      return ok(response, await readRegistrationState());
    }

    if (request.method === 'POST' && action === 'signup') {
      const input = signUpSchema.parse(request.body);
      const existing = await pool.query('select id from accounts where email = $1', [input.email]);
      if (existing.rowCount) return fail(response, 400, 'An account already exists for this email.');

      const registration = await readRegistrationState();
      if (!registration.accountCreationEnabled) {
        return fail(response, 403, 'New account creation is currently disabled.');
      }

      const salt = createPasswordSalt();
      const accountId = makeId('account');
      const role = 'user';
      await transaction(async (client) => {
        await client.query(
          `insert into accounts (id, name, email, role, status, password_hash, password_salt, created_at, updated_at)
           values ($1, $2, $3, $4, 'active', $5, $6, now(), now())`,
          [accountId, input.name, input.email, role, hashPassword(input.password, salt), salt],
        );
      });
      await createSession(response, accountId);
      return created(response, {
        account: {
          id: accountId,
          name: input.name,
          email: input.email,
          role,
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      });
    }

    if (request.method === 'POST' && action === 'signin') {
      const input = signInSchema.parse(request.body);
      const result = await pool.query('select * from accounts where email = $1', [input.email]);
      const account = result.rows[0];
      if (!account) return fail(response, 400, 'No account found for this email.');
      if (account.status === 'held') return fail(response, 403, account.hold_reason || 'This account is on hold.');
      if (!verifyPassword(input.password, account.password_salt, account.password_hash)) {
        return fail(response, 400, 'Incorrect password.');
      }
      await createSession(response, account.id);
      return ok(response, {
        account: {
          id: account.id,
          name: account.name,
          email: account.email,
          role: account.role,
          status: account.status,
          holdReason: account.hold_reason || undefined,
          createdAt: new Date(account.created_at).toISOString(),
          updatedAt: new Date(account.updated_at).toISOString(),
        },
      });
    }

    if (request.method === 'POST' && action === 'signout') {
      const account = await getCurrentAccount(request);
      if (account) {
        await pool.query('delete from sessions where account_id = $1', [account.id]);
      }
      clearSessionCookie(response);
      return ok(response);
    }

    return fail(response, 404, 'Unknown auth action.');
  } catch (error) {
    return handleError(response, error);
  }
}
