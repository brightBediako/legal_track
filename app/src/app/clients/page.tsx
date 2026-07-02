'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '../../components/layout/AppShell';

type Client = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  createdAt: string;
};

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function run() {
      try {
        setError(null);
        const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
        if (!baseUrl) throw new Error('NEXT_PUBLIC_API_BASE_URL is not configured');
        const res = await fetch(`${baseUrl}/clients`);
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        const data = (await res.json()) as Client[];
        setClients(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load clients');
      } finally {
        setLoading(false);
      }
    }
    run();
  }, []);

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
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Phone</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {clients.length === 0 ? (
                <tr>
                  <td className="px-4 py-3 text-zinc-600" colSpan={3}>
                    No clients yet.
                  </td>
                </tr>
              ) : (
                clients.map((c) => (
                  <tr key={c.id} className="border-t border-zinc-200">
                    <td className="px-4 py-3 font-medium">{c.name}</td>
                    <td className="px-4 py-3 text-zinc-700">{c.email ?? '—'}</td>
                    <td className="px-4 py-3 text-zinc-700">{c.phone ?? '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
    </AppShell>
  );
}

