'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '../../components/layout/AppShell';
import { apiGet } from '../../lib/api';
import { useAuthStore } from '../../store/auth.store';

type AppointmentItem = {
  id: string;
  title: string;
  type: string;
  status: string;
  startsAt: string;
  endsAt?: string | null;
  client?: { id: string; name: string } | null;
  case?: { id: string; title: string } | null;
};

export default function AppointmentsPage() {
  const hydrate = useAuthStore((s) => s.hydrateFromStorage);
  const user = useAuthStore((s) => s.user);
  const isClient = user?.role === 'client';
  const [items, setItems] = useState<AppointmentItem[]>([]);
  const [q, setQ] = useState('');
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
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
        const params = new URLSearchParams();
        if (q.trim()) params.set('q', q.trim());
        if (type) params.set('type', type);
        if (status) params.set('status', status);
        const qs = params.toString();
        const data = await apiGet<AppointmentItem[]>(`/appointments${qs ? `?${qs}` : ''}`);
        setItems(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load appointments');
      } finally {
        setLoading(false);
      }
    }
    const timer = window.setTimeout(run, 200);
    return () => window.clearTimeout(timer);
  }, [q, type, status]);

  return (
    <AppShell
      title="Appointments"
      subtitle={
        isClient
          ? 'Your consultations, court dates, and meetings'
          : 'Consultations, court schedules, and meetings'
      }
      actions={
        isClient ? (
          <a className="app-btn-muted" href="/dashboard">
            Dashboard
          </a>
        ) : (
          <div className="flex items-center gap-2">
            <a className="app-btn-primary h-10 px-4" href="/appointments/new">
              New appointment
            </a>
            <a className="app-btn-muted" href="/dashboard">
              Dashboard
            </a>
          </div>
        )
      }
    >
      <div className="app-panel mb-6 grid max-w-4xl gap-4 sm:grid-cols-3">
        <label className="flex flex-col gap-2">
          <span className="app-label">Search</span>
          <input
            className="app-input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Title, client, or case"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="app-label">Type</span>
          <select className="app-select" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">All</option>
            <option value="consultation">Consultation</option>
            <option value="court">Court</option>
            <option value="meeting">Meeting</option>
          </select>
        </label>
        <label className="flex flex-col gap-2">
          <span className="app-label">Status</span>
          <select className="app-select" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All</option>
            <option value="scheduled">Scheduled</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
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
              <th>When</th>
              <th>Title</th>
              <th>Type</th>
              <th>Status</th>
              <th>Client / Case</th>
            </tr>
          </thead>
          <tbody>
            {!loading && items.length === 0 ? (
              <tr>
                <td className="text-slate-500" colSpan={5}>
                  No appointments yet.
                </td>
              </tr>
            ) : (
              items.map((a) => (
                <tr key={a.id}>
                  <td className="whitespace-nowrap">
                    {new Date(a.startsAt).toLocaleString()}
                  </td>
                  <td className="font-medium">
                    <a href={`/appointments/${a.id}`} className="app-link">
                      {a.title}
                    </a>
                  </td>
                  <td className="capitalize">{a.type}</td>
                  <td>
                    <span className={`app-status app-status-${a.status}`}>{a.status}</span>
                  </td>
                  <td>
                    {a.client?.name ?? '—'}
                    {a.case ? ` · ${a.case.title}` : ''}
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
