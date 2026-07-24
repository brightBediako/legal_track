/**
 * Smoke-test JWT + RolesGuard against a live API.
 * Uses ADMIN_EMAIL / ADMIN_PASSWORD from .env and creates temporary staff/client users.
 *
 * Usage (from backend/): npm run test:rbac
 */
require('dotenv').config({ path: '.env' });

const BASE = process.env.API_BASE_URL || 'http://localhost:4000';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

async function login(email, password) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
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
  return { status: res.status, data: await res.json().catch(() => ({})) };
}

function expect(label, actual, allowed) {
  const ok = allowed.includes(actual);
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label} -> ${actual} (expected ${allowed.join('|')})`);
  return ok;
}

(async () => {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env');
  }

  let failed = 0;
  const stamp = Date.now();
  const lawyerEmail = `rbac-lawyer-${stamp}@example.com`;
  const clerkEmail = `rbac-clerk-${stamp}@example.com`;
  const clientEmail = `rbac-client-${stamp}@example.com`;
  const clientPhone = '0244123456';
  const tempPassword = 'TempPass1!';

  if (!expect('GET /clients no token', (await request('GET', '/clients')).status, [401]))
    failed += 1;
  if (!expect('GET /cases no token', (await request('GET', '/cases')).status, [401])) failed += 1;

  const admin = await login(ADMIN_EMAIL, ADMIN_PASSWORD);

  const lawyerUser = await request('POST', '/users', admin, {
    name: `Lawyer ${stamp}`,
    email: lawyerEmail,
    phone: '0200000001',
    role: 'lawyer',
  });
  if (!expect('admin create lawyer', lawyerUser.status, [200, 201])) failed += 1;

  const clerkUser = await request('POST', '/users', admin, {
    name: `Clerk ${stamp}`,
    email: clerkEmail,
    phone: '0200000002',
    role: 'clerk',
  });
  if (!expect('admin create clerk', clerkUser.status, [200, 201])) failed += 1;

  const clientCreate = await request('POST', '/clients', admin, {
    name: `RBAC Test Client ${stamp}`,
    email: clientEmail,
    phone: clientPhone,
    location: 'Accra',
  });
  if (!expect('admin register client+portal', clientCreate.status, [200, 201])) failed += 1;

  // Staff must change password before other API use
  const lawyerLogin = await login(lawyerEmail, '0200000001');
  const lawyerPw = await request('POST', '/users/me/password', lawyerLogin, {
    currentPassword: '0200000001',
    newPassword: tempPassword,
  });
  if (!expect('lawyer change temp password', lawyerPw.status, [200, 201])) failed += 1;

  const clerkLogin = await login(clerkEmail, '0200000002');
  const clerkPw = await request('POST', '/users/me/password', clerkLogin, {
    currentPassword: '0200000002',
    newPassword: tempPassword,
  });
  if (!expect('clerk change temp password', clerkPw.status, [200, 201])) failed += 1;

  const lawyer = await login(lawyerEmail, tempPassword);
  const clerk = await login(clerkEmail, tempPassword);
  const client = await login(clientEmail, clientPhone);

  for (const [role, token] of [
    ['admin', admin],
    ['lawyer', lawyer],
    ['clerk', clerk],
  ]) {
    if (!expect(`${role} GET /clients`, (await request('GET', '/clients', token)).status, [200]))
      failed += 1;
    if (!expect(`${role} GET /cases`, (await request('GET', '/cases', token)).status, [200]))
      failed += 1;
  }

  if (!expect('client GET /clients', (await request('GET', '/clients', client)).status, [403]))
    failed += 1;
  // Client still has mustChangePassword; cases should be blocked until password change.
  if (
    !expect(
      'client GET /cases before password change',
      (await request('GET', '/cases', client)).status,
      [403],
    )
  )
    failed += 1;

  const pw = await request('POST', '/users/me/password', client, {
    currentPassword: clientPhone,
    newPassword: 'NewPassw0rd!',
  });
  if (!expect('client change password', pw.status, [200, 201])) failed += 1;

  const clientReady = await login(clientEmail, 'NewPassw0rd!');
  if (!expect('client GET /cases (scoped)', (await request('GET', '/cases', clientReady)).status, [200]))
    failed += 1;

  if (!expect('client GET /users', (await request('GET', '/users', clientReady)).status, [403]))
    failed += 1;
  if (!expect('client GET /settings', (await request('GET', '/settings', clientReady)).status, [403]))
    failed += 1;
  if (!expect('admin GET /settings', (await request('GET', '/settings', admin)).status, [200]))
    failed += 1;
  if (!expect('lawyer GET /settings', (await request('GET', '/settings', lawyer)).status, [403]))
    failed += 1;

  if (!expect('admin GET /protected/admin', (await request('GET', '/protected/admin', admin)).status, [
    200,
  ]))
    failed += 1;
  if (
    !expect('lawyer GET /protected/admin', (await request('GET', '/protected/admin', lawyer)).status, [
      403,
    ])
  )
    failed += 1;

  if (failed > 0) {
    console.error(`\n${failed} check(s) failed`);
    process.exit(1);
  }
  console.log('\nAll RBAC checks passed');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
