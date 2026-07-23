'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '../../components/layout/AppShell';
import { apiGet } from '../../lib/api';
import { useAuthStore } from '../../store/auth.store';

type AuditUser = {
  id: string;
  email: string;
  role: string;
};

type AuditLogItem = {
  id: string;
  action: string;
  entity: string;
  entityId?: string | null;
  userId?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  user?: AuditUser | null;
};

export default function AuditLogsPage() {
  const hydrate = useAuthStore((s) => s.hydrateFromStorage);
  const authUser = useAuthStore((s) => s.user);
  const isAdmin = authUser?.role === 'admin';

  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [q, setQ] = useState('');
  const [action, setAction] = useState('');
  const [entity, setEntity] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
        if (action) params.set('action', action);
        if (entity) params.set('entity', entity);
        params.set('limit', '150');
        const qs = params.toString();
        const data = await apiGet<AuditLogItem[]>(`/audit-logs?${qs}`);
        setLogs(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load audit logs');
      } finally {
        setLoading(false);
      }
    }

    const timer = window.setTimeout(run, 200);
    return () => window.clearTimeout(timer);
  }, [q, action, entity, isAdmin]);

  return (
    <AppShell
      title="Audit log"
      subtitle="Login history and critical activity"
      actions={
        <a className="app-btn-muted" href="/dashboard">
          Dashboard
        </a>
      }
    >
      {!isAdmin ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          Only administrators can view audit logs.
        </p>
      ) : (
        <>
          <div className="mb-4 grid max-w-4xl gap-4 sm:grid-cols-3">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium">Search</span>
              <input
                className="app-input"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Action, entity, or id"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium">Action</span>
              <select className="app-select" value={action} onChange={(e) => setAction(e.target.value)}>
                <option value="">All</option>
                <option value="create">create</option>
                <option value="update">update</option>
                <option value="delete">delete</option>
                <option value="login_success">login_success</option>
                <option value="login_failure">login_failure</option>
              </select>
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium">Entity</span>
              <select className="app-select" value={entity} onChange={(e) => setEntity(e.target.value)}>
                <option value="">All</option>
                <option value="User">User</option>
                <option value="Client">Client</option>
                <option value="Case">Case</option>
                <option value="Document">Document</option>
              </select>
            </label>
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
                  <th className="px-4 py-3 font-medium">When</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                  <th className="px-4 py-3 font-medium">Entity</th>
                  <th className="px-4 py-3 font-medium">Actor</th>
                  <th className="px-4 py-3 font-medium">Details</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {!loading && logs.length === 0 ? (
                  <tr>
                    <td className="px-4 py-3 text-zinc-600" colSpan={5}>
                      No audit events yet.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="border-t border-zinc-200 align-top">
                      <td className="px-4 py-3 text-zinc-700 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 font-medium">{log.action}</td>
                      <td className="px-4 py-3 text-zinc-700">
                        {log.entity}
                        {log.entityId ? (
                          <span className="mt-1 block text-xs text-zinc-500">{log.entityId}</span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-zinc-700">
                        {log.user ? (
                          <>
                            {log.user.email}
                            <span className="mt-1 block text-xs text-zinc-500">{log.user.role}</span>
                          </>
                        ) : (
                          log.userId ?? '—'
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {log.metadata ? (
                          <button
                            type="button"
                            className="app-btn-muted h-9 px-3"
                            onClick={() =>
                              setExpandedId((prev) => (prev === log.id ? null : log.id))
                            }
                          >
                            {expandedId === log.id ? 'Hide' : 'View'}
                          </button>
                        ) : (
                          <span className="text-zinc-500">—</span>
                        )}
                        {expandedId === log.id && log.metadata ? (
                          <pre className="mt-2 max-w-md overflow-x-auto rounded-lg bg-zinc-50 p-2 text-xs text-zinc-700">
                            {JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        ) : null}
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
