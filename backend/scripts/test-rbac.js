/**
 * Smoke-test JWT + RolesGuard on clients/cases/documents.
 * Requires backend running and seed-rbac-users.js applied.
 *
 * Usage (from backend/): node scripts/test-rbac.js
 */
require('dotenv').config({ path: '.env' });

const BASE = process.env.API_BASE_URL || 'http://localhost:4000';
const PASSWORD = 'Password!';

async function login(email) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`login failed for ${email}: ${res.status} ${JSON.stringify(data)}`);
  }
  return data.accessToken;
}

async function request(method, path, token, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.status;
}

function expect(label, actual, allowed) {
  const ok = allowed.includes(actual);
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label} -> ${actual} (expected ${allowed.join('|')})`);
  return ok;
}

(async () => {
  let failed = 0;

  // No token
  if (!expect('GET /clients no token', await request('GET', '/clients'), [401])) failed += 1;
  if (!expect('GET /cases no token', await request('GET', '/cases'), [401])) failed += 1;
  if (!expect('POST /documents/upload no token', await request('POST', '/documents/upload'), [401]))
    failed += 1;

  const admin = await login('admin@legaltrack.local');
  const lawyer = await login('lawyer@legaltrack.local');
  const clerk = await login('clerk@legaltrack.local');
  const client = await login('client@legaltrack.local');

  // Staff can list clients/cases
  for (const [role, token] of [
    ['admin', admin],
    ['lawyer', lawyer],
    ['clerk', clerk],
  ]) {
    if (!expect(`${role} GET /clients`, await request('GET', '/clients', token), [200])) failed += 1;
    if (!expect(`${role} GET /cases`, await request('GET', '/cases', token), [200])) failed += 1;
  }

  // Client forbidden from firm-wide clients/cases
  if (!expect('client GET /clients', await request('GET', '/clients', client), [403])) failed += 1;
  if (!expect('client GET /cases', await request('GET', '/cases', client), [403])) failed += 1;

  // Client allowed past RolesGuard on upload (no file -> still not 401/403)
  const uploadStatus = await request('POST', '/documents/upload', client);
  if (!expect('client POST /documents/upload (no file)', uploadStatus, [200, 201, 400])) failed += 1;
  if (uploadStatus === 401 || uploadStatus === 403) failed += 1;

  // Admin-only sample route
  if (!expect('admin GET /protected/admin', await request('GET', '/protected/admin', admin), [200]))
    failed += 1;
  if (!expect('lawyer GET /protected/admin', await request('GET', '/protected/admin', lawyer), [403]))
    failed += 1;

  if (failed > 0) {
    console.error(`\n${failed} check(s) failed`);
    process.exit(1);
  }
  console.log('\nAll RBAC checks passed');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
