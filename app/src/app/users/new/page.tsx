'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AppShell } from '../../../components/layout/AppShell';
import { apiPost } from '../../../lib/api';
import { useAuthStore } from '../../../store/auth.store';

type UserItem = {
  id: string;
  email: string;
  role: string;
};

export default function NewUserPage() {
  const router = useRouter();
  const hydrate = useAuthStore((s) => s.hydrateFromStorage);
  const user = useAuthStore((s) => s.user);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  async function onSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!isAdmin) return;
    setError(null);
    setSubmitting(true);

    try {
      const form = new FormData(e.currentTarget);
      const email = String(form.get('email') ?? '');
      const password = String(form.get('password') ?? '');
      const role = String(form.get('role') ?? 'clerk');

      const created = await apiPost<UserItem>('/users', { email, password, role });
      router.push(`/users/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell
      title="New user"
      subtitle="Register an account and assign a role"
      actions={
        <a className="app-btn-muted" href="/users">
          Back to users
        </a>
      }
    >
      {!isAdmin ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          Only administrators can create users.
        </p>
      ) : (
        <form
          onSubmit={onSubmit}
          className="flex max-w-xl flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm"
        >
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium">Email</span>
            <input type="email" name="email" className="app-input" required />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium">Temporary password</span>
            <input
              type="password"
              name="password"
              className="app-input"
              minLength={8}
              required
            />
            <span className="text-xs text-zinc-500">At least 8 characters</span>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium">Role</span>
            <select name="role" className="app-select" defaultValue="clerk" required>
              <option value="admin">Admin</option>
              <option value="lawyer">Lawyer</option>
              <option value="clerk">Clerk</option>
              <option value="client">Client</option>
            </select>
          </label>

          {error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <button type="submit" disabled={submitting} className="app-btn-primary mt-2">
            {submitting ? 'Creating…' : 'Create user'}
          </button>
        </form>
      )}
    </AppShell>
  );
}
