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
  createdAt: string;
  updatedAt: string;
};

export default function UserDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const hydrate = useAuthStore((s) => s.hydrateFromStorage);
  const authUser = useAuthStore((s) => s.user);
  const isAdmin = authUser?.role === 'admin';

  const [item, setItem] = useState<UserDetail | null>(null);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('clerk');
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
        const data = await apiGet<UserDetail>(`/users/${id}`);
        setItem(data);
        setEmail(data.email);
        setRole(data.role);
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
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const body: { email: string; role: string; password?: string } = { email, role };
      if (password.trim()) body.password = password.trim();
      const updated = await apiPatch<UserDetail>(`/users/${id}`, body);
      setItem(updated);
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
      subtitle="Role assignment and password reset"
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
            <select className="app-select" value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="admin">Admin</option>
              <option value="lawyer">Lawyer</option>
              <option value="clerk">Clerk</option>
              <option value="client">Client</option>
            </select>
          </label>

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
