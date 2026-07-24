'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '../../components/layout/AppShell';
import { apiGet } from '../../lib/api';
import { useAuthStore } from '../../store/auth.store';

type Client = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  isActive: boolean;
  createdAt: string;
};

export default function ClientsPage() {
  const hydrate = useAuthStore((s) => s.hydrateFromStorage);
  const [clients, setClients] = useState<Client[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    async function run() {
      try {
        setLoading(true);
        setError(null);
        const params = q.trim() ? `?q=${encodeURIComponent(q.trim())}` : '';
        const data = await apiGet<Client[]>(`/clients${params}`);
        setClients(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load clients');
      } finally {
        setLoading(false);
      }
    }
    const timer = window.setTimeout(run, 200);
    return () => window.clearTimeout(timer);
  }, [q]);

  return (
    <AppShell
      title="Clients"
      subtitle="Manage client records and details"
      actions={
        <div className="flex items-center gap-2">
          <a className="app-btn-primary h-10 px-4" href="/clients/new">
            New client
          </a>
          <a className="app-btn-muted" href="/dashboard">
            Dashboard
          </a>
        </div>
      }
    >
      <div className="app-panel mb-6">
        <label className="flex max-w-md flex-col gap-2">
          <span className="app-label">Search</span>
          <input
            className="app-input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Name, email, phone, or location"
          />
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
              <th>Location</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {!loading && clients.length === 0 ? (
              <tr>
                <td className="text-slate-500" colSpan={5}>
                  No clients yet.
                </td>
              </tr>
            ) : (
              clients.map((c) => (
                <tr key={c.id}>
                  <td className="font-medium">
                    <a className="app-link" href={`/clients/${c.id}`}>
                      {c.name}
                    </a>
                  </td>
                  <td>{c.email ?? '—'}</td>
                  <td>{c.phone ?? '—'}</td>
                  <td>{c.location ?? '—'}</td>
                  <td>
                    <span className={`app-status ${c.isActive ? 'app-status-active' : 'app-status-inactive'}`}>
                      {c.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
