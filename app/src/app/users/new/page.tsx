'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AppShell } from '../../../components/layout/AppShell';
import { apiGet, apiPost } from '../../../lib/api';
import { useAuthStore } from '../../../store/auth.store';

type UserItem = {
  id: string;
  email: string;
  role: string;
  clientId?: string | null;
};

type ClientOption = {
  id: string;
  name: string;
};

export default function NewUserPage() {
  const router = useRouter();
  const hydrate = useAuthStore((s) => s.hydrateFromStorage);
  const user = useAuthStore((s) => s.user);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState('clerk');
  const [clientId, setClientId] = useState('');
  const [clients, setClients] = useState<ClientOption[]>([]);
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!isAdmin) return;
    async function loadClients() {
      try {
        const data = await apiGet<ClientOption[]>('/clients');
        setClients(data);
      } catch {
        setClients([]);
      }
    }
    loadClients();
  }, [isAdmin]);

  async function onSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!isAdmin) return;
    setError(null);
    setSubmitting(true);

    try {
      const form = new FormData(e.currentTarget);
      const email = String(form.get('email') ?? '');
      const password = String(form.get('password') ?? '');
      const nextRole = String(form.get('role') ?? 'clerk');

      if (nextRole === 'client' && !clientId) {
        setError('Client role requires a linked client profile.');
        setSubmitting(false);
        return;
      }

      const body: {
        email: string;
        password: string;
        role: string;
        clientId?: string;
      } = { email, password, role: nextRole };
      if (nextRole === 'client') body.clientId = clientId;

      const created = await apiPost<UserItem>('/users', body);
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
            <select
              name="role"
              className="app-select"
              value={role}
              onChange={(e) => {
                setRole(e.target.value);
                if (e.target.value !== 'client') setClientId('');
              }}
              required
            >
              <option value="admin">Admin</option>
              <option value="lawyer">Lawyer</option>
              <option value="clerk">Clerk</option>
              <option value="client">Client</option>
            </select>
          </label>

          {role === 'client' ? (
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium">Linked client profile</span>
              <select
                className="app-select"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                required
              >
                <option value="">Select client</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <span className="text-xs text-zinc-500">
                Portal access is scoped to this client&apos;s cases and documents.
              </span>
            </label>
          ) : null}

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
