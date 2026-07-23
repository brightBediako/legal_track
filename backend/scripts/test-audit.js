/**
 * Smoke-test audit log writes for login + client create.
 * Requires backend running and seed-rbac-users applied.
 *
 * Usage (from backend/): node scripts/test-audit.js
 */
require('dotenv').config({ path: '.env' });
const { Client } = require('pg');

const BASE = process.env.API_BASE_URL || 'http://localhost:4000';
const PASSWORD = 'Passw0rd!';

async function login(email) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`login failed: ${res.status}`);
  return data;
}

(async () => {
  const before = Date.now();

  // failed login
  await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@legaltrack.local', password: 'wrong-password' }),
  });

  const session = await login('admin@legaltrack.local');
  const token = session.accessToken;

  const createRes = await fetch(`${BASE}/clients`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name: `Audit Client ${Date.now()}` }),
  });
  if (!createRes.ok) {
    throw new Error(`create client failed: ${createRes.status}`);
  }
  const client = await createRes.json();

  // give async audit writes a moment (they are awaited, so should be immediate)
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();

  const { rows } = await db.query(
    `
    SELECT action, entity, "entityId", "userId"
    FROM "AuditLog"
    WHERE "createdAt" >= to_timestamp($1 / 1000.0)
    ORDER BY "createdAt" ASC
    `,
    [before - 1000],
  );
  await db.end();

  const hasFailure = rows.some((r) => r.action === 'login_failure' && r.entity === 'User');
  const hasSuccess = rows.some(
    (r) => r.action === 'login_success' && r.entity === 'User' && r.userId === session.user.id,
  );
  const hasCreate = rows.some(
    (r) => r.action === 'create' && r.entity === 'Client' && r.entityId === client.id,
  );

  console.log(hasFailure ? 'PASS login_failure logged' : 'FAIL login_failure missing');
  console.log(hasSuccess ? 'PASS login_success logged' : 'FAIL login_success missing');
  console.log(hasCreate ? 'PASS Client create logged' : 'FAIL Client create missing');

  if (!hasFailure || !hasSuccess || !hasCreate) {
    console.error('recent rows:', rows);
    process.exit(1);
  }
  console.log('\nAudit checks passed');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
