/**
 * Upsert RBAC smoke-test users for local verification.
 * Password for all: Passw0rd!
 *
 * Also ensures a demo Client profile is linked to client@legaltrack.local.
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

  const portalClientRes = await client.query(
    `
    INSERT INTO "Client" (id, name, email, phone, "isActive", "createdAt", "updatedAt")
    VALUES ($1, $2, $3, $4, true, NOW(), NOW())
    ON CONFLICT DO NOTHING
    RETURNING id
    `,
    [randomUUID(), 'Portal Demo Client', 'client@legaltrack.local', '+233000000000'],
  );

  let portalClientId = portalClientRes.rows[0]?.id;
  if (!portalClientId) {
    const existing = await client.query(
      `SELECT id FROM "Client" WHERE email = $1 ORDER BY "createdAt" ASC LIMIT 1`,
      ['client@legaltrack.local'],
    );
    portalClientId = existing.rows[0]?.id;
  }
  if (!portalClientId) {
    throw new Error('failed to resolve portal demo client');
  }
  console.log(`portal client id: ${portalClientId}`);

  for (const u of users) {
    const id = randomUUID();
    const linkedClientId = u.role === 'client' ? portalClientId : null;
    await client.query(
      `
      INSERT INTO "User" (id, email, password, role, "clientId", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4::"Role", $5, NOW(), NOW())
      ON CONFLICT (email) DO UPDATE
      SET password = EXCLUDED.password,
          role = EXCLUDED.role,
          "clientId" = EXCLUDED."clientId",
          "updatedAt" = NOW()
      `,
      [id, u.email, hash, u.role, linkedClientId],
    );
    console.log(`upserted ${u.email} (${u.role})${linkedClientId ? ` linked→${linkedClientId}` : ''}`);
  }

  await client.end();
  console.log('done. password for all:', PASSWORD);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
