'use client';

import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '../../components/layout/AppShell';
import { apiGet } from '../../lib/api';
import { useAuthStore } from '../../store/auth.store';

type UserItem = {
  id: string;
  name?: string | null;
  email: string;
  phone?: string | null;
  role: string;
  createdAt: string;
};

export default function UsersPage() {
  const hydrate = useAuthStore((s) => s.hydrateFromStorage);
  const user = useAuthStore((s) => s.user);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [q, setQ] = useState('');
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    async function run() {
      try {
        setLoading(true);
        setError(null);
        const params = new URLSearchParams();
        if (q.trim()) params.set('q', q.trim());
        if (role) params.set('role', role);
        const qs = params.toString();
        const data = await apiGet<UserItem[]>(`/users${qs ? `?${qs}` : ''}`);
        setUsers(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load users');
      } finally {
        setLoading(false);
      }
    }

    const timer = window.setTimeout(run, 200);
    return () => window.clearTimeout(timer);
  }, [q, role, isAdmin]);

  const subtitle = useMemo(
    () => (isAdmin ? 'Create and manage staff and client accounts' : 'Admin access required'),
    [isAdmin],
  );

  return (
    <AppShell
      title="Users"
      subtitle={subtitle}
      actions={
        isAdmin ? (
          <div className="flex items-center gap-2">
            <a className="app-btn-primary h-10 px-4" href="/users/new">
              New user
            </a>
            <a className="app-btn-muted" href="/dashboard">
              Dashboard
            </a>
          </div>
        ) : (
          <a className="app-btn-muted" href="/dashboard">
            Dashboard
          </a>
        )
      }
    >
      {!isAdmin ? (
        <p className="app-alert-error">
          Only administrators can manage users.
        </p>
      ) : (
        <>
          <div className="app-panel mb-6 grid max-w-2xl gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-2">
              <span className="app-label">Search</span>
              <input
                className="app-input"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Name, email, or phone"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="app-label">Role</span>
              <select className="app-select" value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="">All</option>
                <option value="admin">Admin</option>
                <option value="lawyer">Lawyer</option>
                <option value="clerk">Clerk</option>
                <option value="client">Client</option>
              </select>
            </label>
          </div>

          {loading ? <p className="text-sm text-slate-500">Loading…</p> : null}

          {error ? (
            <p className="app-alert-error mb-4">
              {error}
            </p>
          ) : null}

          <div className="app-table-wrap">
            <table className="app-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Role</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {!loading && users.length === 0 ? (
                  <tr>
                    <td className="text-slate-500" colSpan={5}>
                      No users found.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id}>
                      <td className="font-medium">
                        <a className="app-link" href={`/users/${u.id}`}>
                          {u.name || u.email}
                        </a>
                      </td>
                      <td>{u.email}</td>
                      <td>{u.phone ?? '—'}</td>
                      <td className="capitalize">{u.role}</td>
                      <td>
                        {new Date(u.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </AppShell>
  );
}
