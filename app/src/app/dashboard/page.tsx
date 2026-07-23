'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '../../components/layout/AppShell';
import { apiGet } from '../../lib/api';
import { useAuthStore } from '../../store/auth.store';

type DashboardSummary = {
  metrics: {
    clientsActive: number;
    clientsInactive: number;
    casesOpen: number;
    casesPending: number;
    casesClosed: number;
    casesTotal: number;
    documentsTotal: number;
  };
  recentDocuments: Array<{
    id: string;
    filename: string;
    provider: string;
    createdAt: string;
    case?: { id: string; title: string } | null;
  }>;
  upcomingCourtDates: Array<{
    id: string;
    title: string;
    status: string;
    courtDate?: string | null;
    client?: { id: string; name: string } | null;
  }>;
  recentCases: Array<{
    id: string;
    title: string;
    status: string;
    updatedAt: string;
    client?: { id: string; name: string } | null;
  }>;
};

type SearchResult = {
  clients: Array<{
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    isActive: boolean;
  }>;
  cases: Array<{
    id: string;
    title: string;
    status: string;
    courtDate?: string | null;
    client?: { id: string; name: string } | null;
  }>;
};

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const hydrate = useAuthStore((s) => s.hydrateFromStorage);
  const clear = useAuthStore((s) => s.clear);

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [search, setSearch] = useState<SearchResult | null>(null);

  const isStaff = user?.role === 'admin' || user?.role === 'lawyer' || user?.role === 'clerk';

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!isStaff) {
      setLoading(false);
      setSummary(null);
      return;
    }

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const data = await apiGet<DashboardSummary>('/dashboard/summary');
        setSummary(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [isStaff]);

  useEffect(() => {
    if (!isStaff) return;
    const term = q.trim();
    if (!term) {
      setSearch(null);
      setSearchError(null);
      setSearching(false);
      return;
    }

    async function run() {
      try {
        setSearching(true);
        setSearchError(null);
        const data = await apiGet<SearchResult>(`/dashboard/search?q=${encodeURIComponent(term)}`);
        setSearch(data);
      } catch (e) {
        setSearchError(e instanceof Error ? e.message : 'Search failed');
      } finally {
        setSearching(false);
      }
    }

    const timer = window.setTimeout(run, 250);
    return () => window.clearTimeout(timer);
  }, [q, isStaff]);

  return (
    <AppShell
      title="Dashboard"
      subtitle="What needs attention today"
      actions={
        user ? (
          <button type="button" onClick={clear} className="app-btn-muted">
            Sign out
          </button>
        ) : (
          <a href="/login" className="app-btn-muted">
            Sign in
          </a>
        )
      }
    >
      {!user ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          Sign in to view your dashboard.
        </p>
      ) : null}

      {user && !isStaff ? (
        <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-zinc-700">
            Signed in as <span className="font-medium">{user.email}</span> ({user.role}).
          </p>
          <p className="mt-2 text-sm text-zinc-600">
            Firm-wide metrics are available to staff. Client portal views come next.
          </p>
          <div className="mt-4 flex gap-2">
            <a className="app-btn-muted h-10 px-4" href="/documents/upload">
              Upload document
            </a>
            <a className="app-btn-muted h-10 px-4" href="/account">
              Account
            </a>
          </div>
        </section>
      ) : null}

      {isStaff ? (
        <div className="flex flex-col gap-6">
          <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
            <p className="mb-3 text-sm text-zinc-700">
              Signed in as <span className="font-medium">{user?.email}</span> ({user?.role}).
            </p>
            <label className="flex max-w-xl flex-col gap-2">
              <span className="text-sm font-medium">Search clients and cases</span>
              <input
                className="app-input"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Type a name, email, title, or notes…"
              />
            </label>

            {searching ? <p className="mt-3 text-sm text-zinc-600">Searching…</p> : null}
            {searchError ? (
              <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {searchError}
              </p>
            ) : null}

            {search ? (
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <div>
                  <h2 className="mb-2 text-sm font-semibold text-zinc-900">Clients</h2>
                  {search.clients.length === 0 ? (
                    <p className="text-sm text-zinc-600">No matching clients.</p>
                  ) : (
                    <ul className="space-y-2 text-sm">
                      {search.clients.map((c) => (
                        <li key={c.id}>
                          <a
                            href={`/clients/${c.id}`}
                            className="font-medium text-zinc-900 underline-offset-2 hover:underline"
                          >
                            {c.name}
                          </a>
                          <span className="ml-2 text-zinc-500">
                            {c.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <h2 className="mb-2 text-sm font-semibold text-zinc-900">Cases</h2>
                  {search.cases.length === 0 ? (
                    <p className="text-sm text-zinc-600">No matching cases.</p>
                  ) : (
                    <ul className="space-y-2 text-sm">
                      {search.cases.map((c) => (
                        <li key={c.id}>
                          <a
                            href={`/cases/${c.id}`}
                            className="font-medium text-zinc-900 underline-offset-2 hover:underline"
                          >
                            {c.title}
                          </a>
                          <span className="ml-2 text-zinc-500">{c.status}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ) : null}
          </section>

          {loading ? <p className="text-sm text-zinc-600">Loading…</p> : null}
          {error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          {summary ? (
            <>
              <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <MetricCard label="Open cases" value={summary.metrics.casesOpen} href="/cases?status=open" />
                <MetricCard label="Pending cases" value={summary.metrics.casesPending} href="/cases" />
                <MetricCard label="Active clients" value={summary.metrics.clientsActive} href="/clients" />
                <MetricCard label="Documents" value={summary.metrics.documentsTotal} href="/documents" />
              </section>

              <section className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-zinc-900">Upcoming court dates</h2>
                    <a className="text-xs text-zinc-500 underline-offset-2 hover:underline" href="/cases">
                      All cases
                    </a>
                  </div>
                  {summary.upcomingCourtDates.length === 0 ? (
                    <p className="text-sm text-zinc-600">No court dates in the next 30 days.</p>
                  ) : (
                    <ul className="space-y-3 text-sm">
                      {summary.upcomingCourtDates.map((c) => (
                        <li key={c.id} className="border-t border-zinc-100 pt-3 first:border-t-0 first:pt-0">
                          <a
                            href={`/cases/${c.id}`}
                            className="font-medium text-zinc-900 underline-offset-2 hover:underline"
                          >
                            {c.title}
                          </a>
                          <p className="mt-1 text-xs text-zinc-500">
                            {c.courtDate ? new Date(c.courtDate).toLocaleDateString() : '—'}
                            {c.client ? ` · ${c.client.name}` : ''}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-zinc-900">Recent documents</h2>
                    <a className="text-xs text-zinc-500 underline-offset-2 hover:underline" href="/documents">
                      All documents
                    </a>
                  </div>
                  {summary.recentDocuments.length === 0 ? (
                    <p className="text-sm text-zinc-600">No documents yet.</p>
                  ) : (
                    <ul className="space-y-3 text-sm">
                      {summary.recentDocuments.map((d) => (
                        <li key={d.id} className="border-t border-zinc-100 pt-3 first:border-t-0 first:pt-0">
                          <span className="font-medium text-zinc-900">{d.filename}</span>
                          <p className="mt-1 text-xs text-zinc-500">
                            {new Date(d.createdAt).toLocaleString()}
                            {d.case ? (
                              <>
                                {' · '}
                                <a
                                  href={`/cases/${d.case.id}`}
                                  className="underline-offset-2 hover:underline"
                                >
                                  {d.case.title}
                                </a>
                              </>
                            ) : null}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>

              <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-zinc-900">Recently updated cases</h2>
                  <a className="app-btn-muted h-9 px-3" href="/cases/new">
                    New case
                  </a>
                </div>
                {summary.recentCases.length === 0 ? (
                  <p className="text-sm text-zinc-600">No cases yet.</p>
                ) : (
                  <ul className="divide-y divide-zinc-100 text-sm">
                    {summary.recentCases.map((c) => (
                      <li key={c.id} className="flex items-center justify-between gap-3 py-3">
                        <div>
                          <a
                            href={`/cases/${c.id}`}
                            className="font-medium text-zinc-900 underline-offset-2 hover:underline"
                          >
                            {c.title}
                          </a>
                          <p className="mt-1 text-xs text-zinc-500">
                            {c.status}
                            {c.client ? ` · ${c.client.name}` : ''}
                          </p>
                        </div>
                        <span className="text-xs text-zinc-500">
                          {new Date(c.updatedAt).toLocaleString()}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          ) : null}
        </div>
      ) : null}
    </AppShell>
  );
}

function MetricCard({
  label,
  value,
  href,
}: {
  label: string;
  value: number;
  href: string;
}) {
  return (
    <a
      href={href}
      className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition-colors hover:border-zinc-300"
    >
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-zinc-900">{value}</p>
    </a>
  );
}
