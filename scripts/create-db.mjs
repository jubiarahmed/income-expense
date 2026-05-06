import pg from 'pg';

const { Client } = pg;

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');

const url = new URL(process.env.DATABASE_URL);
const databaseName = url.pathname.replace('/', '');
if (!databaseName) throw new Error('DATABASE_URL must include a database name.');

url.pathname = '/postgres';

const client = new Client({ connectionString: url.toString() });
await client.connect();

const exists = await client.query('select 1 from pg_database where datname = $1', [databaseName]);
if (!exists.rowCount) {
  await client.query(`create database ${JSON.stringify(databaseName)}`);
  console.log(`Created database ${databaseName}.`);
} else {
  console.log(`Database ${databaseName} already exists.`);
}

await client.end();
