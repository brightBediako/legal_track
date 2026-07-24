/**
 * Ensure production admin from ADMIN_EMAIL / ADMIN_PASSWORD.
 * Also removes legacy demo accounts (@legaltrack.local / Portal Demo Client).
 *
 * Usage (from backend/): npm run db:seed:admin
 */
require('dotenv').config({ path: '.env' });
const bcrypt = require('bcrypt');
const { randomUUID } = require('node:crypto');
const { Client } = require('pg');

const DEMO_EMAILS = [
  'admin@legaltrack.local',
  'lawyer@legaltrack.local',
  'clerk@legaltrack.local',
  'client@legaltrack.local',
];

async function removeDemoData(client) {
  const demoUsers = await client.query(
    `SELECT id, email, "clientId" FROM "User" WHERE email = ANY($1::text[])`,
    [DEMO_EMAILS],
  );

  for (const row of demoUsers.rows) {
    await client.query(`DELETE FROM "RefreshToken" WHERE "userId" = $1`, [row.id]);
    await client.query(`DELETE FROM "Notification" WHERE "userId" = $1`, [row.id]);
    await client.query(
      `UPDATE "Case" SET "assigneeId" = NULL WHERE "assigneeId" = $1`,
      [row.id],
    );
    await client.query(
      `UPDATE "CaseTimelineEvent" SET "createdById" = NULL WHERE "createdById" = $1`,
      [row.id],
    );
    await client.query(
      `UPDATE "Appointment" SET "createdById" = NULL WHERE "createdById" = $1`,
      [row.id],
    );
    await client.query(`DELETE FROM "User" WHERE id = $1`, [row.id]);
    console.log(`removed demo user ${row.email}`);
  }

  const demoClients = await client.query(
    `SELECT id, name, email FROM "Client"
     WHERE email = 'client@legaltrack.local' OR name = 'Portal Demo Client'`,
  );

  for (const row of demoClients.rows) {
    const cases = await client.query(`SELECT COUNT(*)::int AS n FROM "Case" WHERE "clientId" = $1`, [
      row.id,
    ]);
    if (cases.rows[0].n > 0) {
      console.warn(
        `skip deleting demo client ${row.name} (${row.id}): still has ${cases.rows[0].n} case(s)`,
      );
      continue;
    }
    await client.query(`DELETE FROM "Appointment" WHERE "clientId" = $1`, [row.id]);
    await client.query(`DELETE FROM "Client" WHERE id = $1`, [row.id]);
    console.log(`removed demo client ${row.name}`);
  }
}

async function ensureAdmin(client) {
  const email = String(process.env.ADMIN_EMAIL || '')
    .trim()
    .toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const forceReset = String(process.env.ADMIN_FORCE_RESET || '').toLowerCase() === 'true';

  if (!email || !password) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env');
  }
  if (!email.includes('@')) throw new Error('ADMIN_EMAIL must be a valid email');
  if (password.length < 8) throw new Error('ADMIN_PASSWORD must be at least 8 characters');

  const hash = await bcrypt.hash(password, 10);
  const existing = await client.query(
    `SELECT id, role FROM "User" WHERE email = $1 LIMIT 1`,
    [email],
  );

  if (existing.rows.length === 0) {
    await client.query(
      `
      INSERT INTO "User" (id, email, password, role, "mustChangePassword", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, 'admin'::"Role", false, NOW(), NOW())
      `,
      [randomUUID(), email, hash],
    );
    console.log(`created admin ${email}`);
    return;
  }

  const row = existing.rows[0];
  if (row.role !== 'admin') {
    throw new Error(`user ${email} exists with role ${row.role}; refuse to overwrite`);
  }

  if (forceReset) {
    await client.query(
      `UPDATE "User" SET password = $2, "mustChangePassword" = false, "updatedAt" = NOW() WHERE id = $1`,
      [row.id, hash],
    );
    console.log(`updated admin password for ${email} (ADMIN_FORCE_RESET=true)`);
    return;
  }

  console.log(`admin already present: ${email} (set ADMIN_FORCE_RESET=true to reset password)`);
}

(async () => {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is missing');

  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    await removeDemoData(client);
    await ensureAdmin(client);
  } finally {
    await client.end();
  }
  console.log('done');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
