'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '../../components/layout/AppShell';
import { apiGet } from '../../lib/api';
import { useAuthStore } from '../../store/auth.store';

type CaseItem = {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  clientId?: string | null;
  createdAt: string;
};

export default function CasesPage() {
  const hydrate = useAuthStore((s) => s.hydrateFromStorage);
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    async function run() {
      try {
        setError(null);
        const data = await apiGet<CaseItem[]>('/cases');
        setCases(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load cases');
      } finally {
        setLoading(false);
      }
    }
    run();
  }, []);

  return (
    <AppShell
      title="Cases"
      subtitle="Track active matters and statuses"
      actions={
        <div className="flex items-center gap-2">
          <a className="app-btn-primary h-10 px-4" href="/cases/new">
            New case
          </a>
          <a className="app-btn-muted" href="/clients">
            Clients
          </a>
        </div>
      }
    >
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
            </tr>
          </thead>
          <tbody className="text-sm">
            {cases.length === 0 ? (
              <tr>
                <td className="px-4 py-3 text-zinc-600" colSpan={3}>
                  No cases yet.
                </td>
              </tr>
            ) : (
              cases.map((c) => (
                <tr key={c.id} className="border-t border-zinc-200">
                  <td className="px-4 py-3 font-medium">{c.title}</td>
                  <td className="px-4 py-3 text-zinc-700">{c.status}</td>
                  <td className="px-4 py-3 text-zinc-700">{c.clientId ?? '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
