// Quick check: confirm the database role our pg Pool uses has BYPASSRLS so
// enabling RLS on every public table won't break our backend.
import pg from 'pg';

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.POSTGRES_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
});

const result = await pool.query(`
  select current_user as role,
         rolsuper, rolbypassrls
  from pg_roles
  where rolname = current_user
`);
console.log(result.rows[0]);
await pool.end();
