'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AppShell } from '../../../components/layout/AppShell';
import { apiGet, apiPatch } from '../../../lib/api';
import { useAuthStore } from '../../../store/auth.store';

type UserDetail = {
  id: string;
  email: string;
  role: string;
  clientId?: string | null;
  createdAt: string;
  updatedAt: string;
  client?: { id: string; name: string; email?: string | null } | null;
};

type ClientOption = {
  id: string;
  name: string;
};

export default function UserDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const hydrate = useAuthStore((s) => s.hydrateFromStorage);
  const authUser = useAuthStore((s) => s.user);
  const isAdmin = authUser?.role === 'admin';

  const [item, setItem] = useState<UserDetail | null>(null);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('clerk');
  const [clientId, setClientId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!isAdmin || !id) {
      setLoading(false);
      return;
    }

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const [data, clientList] = await Promise.all([
          apiGet<UserDetail>(`/users/${id}`),
          apiGet<ClientOption[]>('/clients'),
        ]);
        setItem(data);
        setClients(clientList);
        setEmail(data.email);
        setRole(data.role);
        setClientId(data.clientId ?? '');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load user');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, isAdmin]);

  async function onSave(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!isAdmin) return;
    if (role === 'client' && !clientId) {
      setError('Client role requires a linked client profile.');
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const body: {
        email: string;
        role: string;
        password?: string;
        clientId?: string | null;
      } = {
        email,
        role,
        clientId: role === 'client' ? clientId : null,
      };
      if (password.trim()) body.password = password.trim();
      const updated = await apiPatch<UserDetail>(`/users/${id}`, body);
      setItem(updated);
      setClientId(updated.clientId ?? '');
      setPassword('');
      setSuccess(password.trim() ? 'User and password updated.' : 'User updated.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell
      title={item?.email ?? 'User'}
      subtitle="Role assignment, portal link, and password reset"
      actions={
        <a className="app-btn-muted" href="/users">
          Back to users
        </a>
      }
    >
      {!isAdmin ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          Only administrators can manage users.
        </p>
      ) : null}

      {loading ? <p className="text-sm text-zinc-600">Loading…</p> : null}

      {error ? (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {success ? (
        <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {success}
        </p>
      ) : null}

      {isAdmin && item ? (
        <form
          onSubmit={onSave}
          className="flex max-w-xl flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm"
        >
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium">Email</span>
            <input
              type="email"
              className="app-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium">Role</span>
            <select
              className="app-select"
              value={role}
              onChange={(e) => {
                setRole(e.target.value);
                if (e.target.value !== 'client') setClientId('');
              }}
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
              {item.client ? (
                <span className="text-xs text-zinc-500">Currently linked to {item.client.name}.</span>
              ) : null}
            </label>
          ) : null}

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium">Reset password (optional)</span>
            <input
              type="password"
              className="app-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              placeholder="Leave blank to keep current"
            />
          </label>

          <p className="text-xs text-zinc-500">
            Created {new Date(item.createdAt).toLocaleString()} · Updated{' '}
            {new Date(item.updatedAt).toLocaleString()}
          </p>

          <button type="submit" disabled={saving} className="app-btn-primary mt-2">
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      ) : null}
    </AppShell>
  );
}
