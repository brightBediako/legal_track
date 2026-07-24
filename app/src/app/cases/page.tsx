'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AppShell } from '../../components/layout/AppShell';
import { apiGet } from '../../lib/api';
import { useAuthStore } from '../../store/auth.store';

type CaseItem = {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  courtDate?: string | null;
  clientId?: string | null;
  client?: { id: string; name: string } | null;
  assignee?: { id: string; email: string; role: string } | null;
  createdAt: string;
};

type AssigneeOption = { id: string; name?: string | null; email: string; role: string };

export default function CasesPage() {
  const hydrate = useAuthStore((s) => s.hydrateFromStorage);
  const user = useAuthStore((s) => s.user);
  const isClient = user?.role === 'client';
  const canFilterAssignee = user?.role === 'admin' || user?.role === 'clerk';
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get('status') ?? '';
  const initialAssigneeId = searchParams.get('assigneeId') ?? '';
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [assignees, setAssignees] = useState<AssigneeOption[]>([]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState(initialStatus);
  const [assigneeId, setAssigneeId] = useState(initialAssigneeId);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    setStatus(initialStatus);
    setAssigneeId(initialAssigneeId);
  }, [initialStatus, initialAssigneeId]);

  useEffect(() => {
    if (!canFilterAssignee) return;
    async function loadAssignees() {
      try {
        const data = await apiGet<AssigneeOption[]>('/users/assignable');
        setAssignees(data);
      } catch {
        setAssignees([]);
      }
    }
    loadAssignees();
  }, [canFilterAssignee]);

  useEffect(() => {
    async function run() {
      try {
        setLoading(true);
        setError(null);
        const params = new URLSearchParams();
        if (q.trim()) params.set('q', q.trim());
        if (status) params.set('status', status);
        if (canFilterAssignee && assigneeId) params.set('assigneeId', assigneeId);
        const qs = params.toString();
        const data = await apiGet<CaseItem[]>(`/cases${qs ? `?${qs}` : ''}`);
        setCases(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load cases');
      } finally {
        setLoading(false);
      }
    }
    const timer = window.setTimeout(run, 200);
    return () => window.clearTimeout(timer);
  }, [q, status, assigneeId, canFilterAssignee]);

  return (
    <AppShell
      title="Cases"
      subtitle={isClient ? 'Your matters and statuses' : 'Track active matters and statuses'}
      actions={
        isClient ? (
          <a className="app-btn-muted" href="/documents/upload">
            Upload document
          </a>
        ) : (
          <div className="flex items-center gap-2">
            <a className="app-btn-primary h-10 px-4" href="/cases/new">
              New case
            </a>
            <a className="app-btn-muted" href="/clients">
              Clients
            </a>
          </div>
        )
      }
    >
      <div
        className={`app-panel mb-6 grid max-w-4xl gap-4 ${
          canFilterAssignee ? 'sm:grid-cols-3' : 'sm:grid-cols-2'
        }`}
      >
        <label className="flex flex-col gap-2">
          <span className="app-label">Search</span>
          <input
            className="app-input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Title, notes, or client"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="app-label">Status</span>
          <select className="app-select" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All</option>
            <option value="open">Open</option>
            <option value="pending">Pending</option>
            <option value="closed">Closed</option>
          </select>
        </label>
        {canFilterAssignee ? (
          <label className="flex flex-col gap-2">
            <span className="app-label">Assignee</span>
            <select
              className="app-select"
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
            >
              <option value="">All</option>
              {assignees.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name ? `${a.name} (${a.email})` : a.email}
                </option>
              ))}
            </select>
          </label>
        ) : null}
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
              <th>Title</th>
              <th>Status</th>
              <th>Client</th>
              {!isClient ? <th>Assignee</th> : null}
              <th>Court date</th>
            </tr>
          </thead>
          <tbody>
            {!loading && cases.length === 0 ? (
              <tr>
                <td className="text-slate-500" colSpan={isClient ? 4 : 5}>
                  No cases yet.
                </td>
              </tr>
            ) : (
              cases.map((c) => (
                <tr key={c.id}>
                  <td className="font-medium">
                    <a className="app-link" href={`/cases/${c.id}`}>
                      {c.title}
                    </a>
                  </td>
                  <td>
                    <span className={`app-status app-status-${c.status}`}>{c.status}</span>
                  </td>
                  <td>
                    {c.client ? (
                      isClient ? (
                        c.client.name
                      ) : (
                        <a
                          href={`/clients/${c.client.id}`}
                          className="underline-offset-2 hover:underline"
                        >
                          {c.client.name}
                        </a>
                      )
                    ) : (
                      '—'
                    )}
                  </td>
                  {!isClient ? (
                    <td>{c.assignee?.email ?? '—'}</td>
                  ) : null}
                  <td>
                    {c.courtDate ? new Date(c.courtDate).toLocaleDateString() : '—'}
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
