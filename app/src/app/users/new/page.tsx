'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AppShell } from '../../../components/layout/AppShell';
import { apiPost } from '../../../lib/api';
import { useAuthStore } from '../../../store/auth.store';

type UserItem = {
  id: string;
  name?: string | null;
  email: string;
  phone?: string | null;
  role: string;
  mustChangePassword?: boolean;
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
      const name = String(form.get('name') ?? '');
      const email = String(form.get('email') ?? '');
      const phone = String(form.get('phone') ?? '');
      const role = String(form.get('role') ?? 'clerk');

      const created = await apiPost<UserItem>('/users', { name, email, phone, role });
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
      subtitle="Create a staff account and assign a role"
      actions={
        <a className="app-btn-muted" href="/users">
          Back to users
        </a>
      }
    >
      {!isAdmin ? (
        <p className="app-alert-error">
          Only administrators can create users and assign roles.
        </p>
      ) : (
        <form
          onSubmit={onSubmit}
          className="flex max-w-xl flex-col gap-4 app-panel"
        >
          <p className="app-alert-info">
            Staff sign in with their <span className="font-medium">email</span>. The{' '}
            <span className="font-medium">phone number is the temporary password</span> and must be
            changed on first login. Client portal accounts are created when registering a client.
          </p>

          <label className="flex flex-col gap-2">
            <span className="app-label">Name</span>
            <input name="name" className="app-input" placeholder="Full name" required />
          </label>

          <label className="flex flex-col gap-2">
            <span className="app-label">Email</span>
            <input type="email" name="email" className="app-input" required />
            <span className="app-help">Login username</span>
          </label>

          <label className="flex flex-col gap-2">
            <span className="app-label">Phone</span>
            <input name="phone" className="app-input" placeholder="0244123456" minLength={8} required />
            <span className="app-help">
              Temporary password (at least 8 characters)
            </span>
          </label>

          <label className="flex flex-col gap-2">
            <span className="app-label">Role</span>
            <select name="role" className="app-select" defaultValue="clerk" required>
              <option value="admin">Admin</option>
              <option value="lawyer">Lawyer</option>
              <option value="clerk">Clerk</option>
            </select>
          </label>

          {error ? (
            <p className="app-alert-error">
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
