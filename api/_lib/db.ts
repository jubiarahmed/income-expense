import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const { Pool } = pg;

declare global {
  var expenseTrackerPool: pg.Pool | undefined;
}

function loadLocalEnv() {
  if (process.env.DATABASE_URL || process.env.VERCEL) return;

  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const separator = trimmed.indexOf('=');
    if (separator === -1) continue;

    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim();
    if (key && !process.env[key]) {
      process.env[key] = value;
    }
  }
}

function createPoolConfig(): pg.PoolConfig {
  loadLocalEnv();

  if (!process.env.DATABASE_URL) {
    throw new Error(
      'DATABASE_URL is required. Add it to .env.local for local development or to Vercel environment variables for deployment.',
    );
  }

  const databaseUrl = new URL(process.env.DATABASE_URL);

  return {
    host: databaseUrl.hostname,
    port: databaseUrl.port ? Number(databaseUrl.port) : 5432,
    database: decodeURIComponent(databaseUrl.pathname.replace(/^\//, '')),
    user: decodeURIComponent(databaseUrl.username),
    password: decodeURIComponent(databaseUrl.password),
    ssl: process.env.POSTGRES_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  };
}

export const pool = globalThis.expenseTrackerPool ?? new Pool(createPoolConfig());

if (process.env.NODE_ENV !== 'production') {
  globalThis.expenseTrackerPool = pool;
}

export async function transaction<T>(callback: (client: pg.PoolClient) => Promise<T>) {
  const client = await pool.connect();
  try {
    await client.query('begin');
    const result = await callback(client);
    await client.query('commit');
    return result;
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}
