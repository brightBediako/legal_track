/**
 * Upsert RBAC smoke-test users for local verification.
 * Password for all: Passw0rd!
 *
 * Usage (from backend/): npm run db:seed:rbac
 */
require('dotenv').config({ path: '.env' });
const bcrypt = require('bcrypt');
const { randomUUID } = require('node:crypto');
const { Client } = require('pg');

const PASSWORD = 'Passw0rd!';

const users = [
  { email: 'admin@legaltrack.local', role: 'admin' },
  { email: 'lawyer@legaltrack.local', role: 'lawyer' },
  { email: 'clerk@legaltrack.local', role: 'clerk' },
  { email: 'client@legaltrack.local', role: 'client' },
];

(async () => {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is missing');

  const client = new Client({ connectionString: url });
  await client.connect();
  const hash = await bcrypt.hash(PASSWORD, 10);

  for (const u of users) {
    await client.query(
      `
      INSERT INTO "User" (id, email, password, role, "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4::"Role", NOW(), NOW())
      ON CONFLICT (email) DO UPDATE
      SET password = EXCLUDED.password,
          role = EXCLUDED.role,
          "updatedAt" = NOW()
      `,
      [randomUUID(), u.email, hash, u.role],
    );
    console.log(`upserted ${u.email} (${u.role})`);
  }

  await client.end();
  console.log('done. password for all:', PASSWORD);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
