/**
 * Smoke-test audit logging.
 * Requires backend running and ADMIN_EMAIL / ADMIN_PASSWORD in .env.
 *
 * Usage (from backend/): npm run test:audit
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
  return data;
}

(async () => {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env');
  }

  await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: 'wrong-password' }),
  });

  const session = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
  const token = session.accessToken;

  const logsRes = await fetch(`${BASE}/audit-logs?limit=20`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const logs = await logsRes.json();
  if (!logsRes.ok) {
    throw new Error(`audit-logs failed: ${logsRes.status} ${JSON.stringify(logs)}`);
  }

  const actions = Array.isArray(logs) ? logs.map((l) => l.action) : [];
  const hasFailure = actions.includes('login_failure');
  const hasSuccess = actions.includes('login_success');
  console.log({ hasFailure, hasSuccess, sample: actions.slice(0, 5) });
  if (!hasFailure || !hasSuccess) {
    throw new Error('expected login_failure and login_success in recent audit logs');
  }
  console.log('audit smoke test passed');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
