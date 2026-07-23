require('dotenv').config({ path: '.env' });
const { Client } = require('pg');

(async () => {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL missing');

  const admin = new URL(url);
  const dbName = admin.pathname.replace(/^\//, '').split('?')[0];
  admin.pathname = '/postgres';

  const c = new Client({ connectionString: admin.toString() });
  await c.connect();

  const r = await c.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
  if (r.rowCount === 0) {
    // identifiers cannot be parameterized; dbName comes from our env only
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(dbName)) {
      throw new Error('Unsafe database name');
    }
    await c.query(`CREATE DATABASE ${dbName}`);
    console.log(`created_db=${dbName}`);
  } else {
    console.log(`db_exists=${dbName}`);
  }

  await c.end();
})().catch((e) => {
  console.error('ERR', e.message);
  process.exit(1);
});
