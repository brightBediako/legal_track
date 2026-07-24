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

type AssigneeOption = { id: string; email: string; role: string };

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
        className={`mb-4 grid max-w-4xl gap-4 ${
          canFilterAssignee ? 'sm:grid-cols-3' : 'sm:grid-cols-2'
        }`}
      >
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">Search</span>
          <input
            className="app-input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Title, notes, or client"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">Status</span>
          <select className="app-select" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All</option>
            <option value="open">Open</option>
            <option value="pending">Pending</option>
            <option value="closed">Closed</option>
          </select>
        </label>
        {canFilterAssignee ? (
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium">Assignee</span>
            <select
              className="app-select"
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
            >
              <option value="">All</option>
              {assignees.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.email}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      {loading ? <p className="text-sm text-zinc-600">Loading…</p> : null}

      {error ? (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        <table className="w-full table-auto">
          <thead className="bg-zinc-50 text-left text-sm text-zinc-600">
            <tr>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Client</th>
              {!isClient ? <th className="px-4 py-3 font-medium">Assignee</th> : null}
              <th className="px-4 py-3 font-medium">Court date</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {!loading && cases.length === 0 ? (
              <tr>
                <td className="px-4 py-3 text-zinc-600" colSpan={isClient ? 4 : 5}>
                  No cases yet.
                </td>
              </tr>
            ) : (
              cases.map((c) => (
                <tr key={c.id} className="border-t border-zinc-200">
                  <td className="px-4 py-3 font-medium">
                    <a className="text-zinc-900 underline-offset-2 hover:underline" href={`/cases/${c.id}`}>
                      {c.title}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-zinc-700">{c.status}</td>
                  <td className="px-4 py-3 text-zinc-700">
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
                    <td className="px-4 py-3 text-zinc-700">{c.assignee?.email ?? '—'}</td>
                  ) : null}
                  <td className="px-4 py-3 text-zinc-700">
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
