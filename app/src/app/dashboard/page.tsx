'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '../../components/layout/AppShell';
import { apiGet } from '../../lib/api';
import { useAuthStore } from '../../store/auth.store';

type DashboardSummary = {
  scope?: 'staff' | 'client' | 'lawyer';
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
  upcomingAppointments?: Array<{
    id: string;
    title: string;
    type: string;
    startsAt: string;
    status: string;
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

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [search, setSearch] = useState<SearchResult | null>(null);

  const isStaff = user?.role === 'admin' || user?.role === 'lawyer' || user?.role === 'clerk';
  const isClient = user?.role === 'client';
  const canView = isStaff || isClient;

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!canView) {
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
  }, [canView]);

  useEffect(() => {
    if (!canView) return;
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
  }, [q, canView]);

  return (
    <AppShell
      title="Dashboard"
      subtitle={
        isClient
          ? 'Your cases, documents, and upcoming dates'
          : user?.role === 'lawyer'
            ? 'Your assigned matters and upcoming dates'
            : 'What needs attention today'
      }
    >
      {canView ? (
        <div className="flex flex-col gap-6">
          <section className="app-panel">
            <p className="mb-1 text-xs font-medium tracking-wide text-slate-500 uppercase">
              Signed in
            </p>
            <p className="mb-4 text-sm text-slate-700">
              <span className="font-medium text-slate-900">{user?.email}</span>
              <span className="text-slate-400"> · </span>
              <span className="capitalize">{user?.role}</span>
            </p>
            <label className="flex max-w-xl flex-col gap-2">
              <span className="app-label">
                {isClient ? 'Search your cases' : 'Search clients and cases'}
              </span>
              <input
                className="app-input"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={
                  isClient
                    ? 'Type a case title or notes…'
                    : 'Type a name, email, title, or notes…'
                }
              />
            </label>

            {searching ? <p className="mt-3 text-sm text-slate-500">Searching…</p> : null}
            {searchError ? (
              <p className="mt-3 app-alert-error">
                {searchError}
              </p>
            ) : null}

            {search ? (
              <div className={`mt-4 grid gap-4 ${isStaff ? 'lg:grid-cols-2' : ''}`}>
                {isStaff ? (
                  <div>
                    <h2 className="mb-2 app-section-title">Clients</h2>
                    {search.clients.length === 0 ? (
                      <p className="text-sm text-slate-500">No matching clients.</p>
                    ) : (
                      <ul className="space-y-2 text-sm">
                        {search.clients.map((c) => (
                          <li key={c.id}>
                            <a
                              href={`/clients/${c.id}`}
                              className="font-medium text-slate-900 underline-offset-2 hover:underline"
                            >
                              {c.name}
                            </a>
                            <span className="ml-2 text-slate-500">
                              {c.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : null}
                <div>
                  <h2 className="mb-2 app-section-title">Cases</h2>
                  {search.cases.length === 0 ? (
                    <p className="text-sm text-slate-500">No matching cases.</p>
                  ) : (
                    <ul className="space-y-2 text-sm">
                      {search.cases.map((c) => (
                        <li key={c.id}>
                          <a
                            href={`/cases/${c.id}`}
                            className="font-medium text-slate-900 underline-offset-2 hover:underline"
                          >
                            {c.title}
                          </a>
                          <span className="ml-2 text-slate-500">{c.status}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ) : null}
          </section>

          {loading ? <p className="text-sm text-slate-500">Loading…</p> : null}
          {error ? (
            <p className="app-alert-error">
              {error}
            </p>
          ) : null}

          {summary ? (
            <>
              <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <MetricCard label="Open cases" value={summary.metrics.casesOpen} href="/cases?status=open" />
                <MetricCard label="Pending cases" value={summary.metrics.casesPending} href="/cases?status=pending" />
                {isStaff ? (
                  <MetricCard label="Active clients" value={summary.metrics.clientsActive} href="/clients" />
                ) : (
                  <MetricCard label="Closed cases" value={summary.metrics.casesClosed} href="/cases?status=closed" />
                )}
                <MetricCard label="Documents" value={summary.metrics.documentsTotal} href="/documents" />
              </section>

              <section className="grid gap-6 lg:grid-cols-2">
                <div className="app-panel">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="app-section-title">Upcoming court dates</h2>
                    <a className="app-help underline-offset-2 hover:underline" href="/cases">
                      All cases
                    </a>
                  </div>
                  {summary.upcomingCourtDates.length === 0 ? (
                    <p className="text-sm text-slate-500">No court dates in the next 30 days.</p>
                  ) : (
                    <ul className="space-y-3 text-sm">
                      {summary.upcomingCourtDates.map((c) => (
                        <li key={c.id} className="border-t border-slate-100 pt-3 first:border-t-0 first:pt-0">
                          <a
                            href={`/cases/${c.id}`}
                            className="font-medium text-slate-900 underline-offset-2 hover:underline"
                          >
                            {c.title}
                          </a>
                          <p className="mt-1 app-help">
                            {c.courtDate ? new Date(c.courtDate).toLocaleDateString() : '—'}
                            {isStaff && c.client ? ` · ${c.client.name}` : ''}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="app-panel">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="app-section-title">
                      {isClient ? 'Upcoming appointments' : 'Recent documents'}
                    </h2>
                    <a
                      className="app-help underline-offset-2 hover:underline"
                      href={isClient ? '/appointments' : '/documents'}
                    >
                      {isClient ? 'All appointments' : 'All documents'}
                    </a>
                  </div>
                  {isClient ? (
                    !summary.upcomingAppointments || summary.upcomingAppointments.length === 0 ? (
                      <p className="text-sm text-slate-500">No upcoming appointments.</p>
                    ) : (
                      <ul className="space-y-3 text-sm">
                        {summary.upcomingAppointments.map((a) => (
                          <li key={a.id} className="border-t border-slate-100 pt-3 first:border-t-0 first:pt-0">
                            <a
                              href={`/appointments/${a.id}`}
                              className="font-medium text-slate-900 underline-offset-2 hover:underline"
                            >
                              {a.title}
                            </a>
                            <p className="mt-1 app-help">
                              {new Date(a.startsAt).toLocaleString()} · {a.type}
                            </p>
                          </li>
                        ))}
                      </ul>
                    )
                  ) : summary.recentDocuments.length === 0 ? (
                    <p className="text-sm text-slate-500">No documents yet.</p>
                  ) : (
                    <ul className="space-y-3 text-sm">
                      {summary.recentDocuments.map((d) => (
                        <li key={d.id} className="border-t border-slate-100 pt-3 first:border-t-0 first:pt-0">
                          <span className="font-medium text-slate-900">{d.filename}</span>
                          <p className="mt-1 app-help">
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

              {isClient ? (
                <section className="app-panel">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="app-section-title">Recent documents</h2>
                    <a className="app-help underline-offset-2 hover:underline" href="/documents">
                      All documents
                    </a>
                  </div>
                  {summary.recentDocuments.length === 0 ? (
                    <p className="text-sm text-slate-500">No documents yet.</p>
                  ) : (
                    <ul className="space-y-3 text-sm">
                      {summary.recentDocuments.map((d) => (
                        <li key={d.id} className="border-t border-slate-100 pt-3 first:border-t-0 first:pt-0">
                          <span className="font-medium text-slate-900">{d.filename}</span>
                          <p className="mt-1 app-help">
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
                </section>
              ) : null}

              <section className="app-panel">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="app-section-title">Recently updated cases</h2>
                  {isStaff ? (
                    <a className="app-btn-muted h-9 px-3" href="/cases/new">
                      New case
                    </a>
                  ) : (
                    <a className="app-btn-muted h-9 px-3" href="/documents/upload">
                      Upload document
                    </a>
                  )}
                </div>
                {summary.recentCases.length === 0 ? (
                  <p className="text-sm text-slate-500">No cases yet.</p>
                ) : (
                  <ul className="divide-y divide-slate-100 text-sm">
                    {summary.recentCases.map((c) => (
                      <li key={c.id} className="flex items-center justify-between gap-3 py-3">
                        <div>
                          <a href={`/cases/${c.id}`} className="app-link">
                            {c.title}
                          </a>
                          <p className="mt-1 app-help">
                            <span className={`app-status app-status-${c.status}`}>{c.status}</span>
                            {isStaff && c.client ? ` · ${c.client.name}` : ''}
                          </p>
                        </div>
                        <span className="app-help">
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
    <a href={href} className="app-metric transition-all hover:border-slate-300 hover:shadow-md">
      <p className="app-metric-label">{label}</p>
      <p className="app-metric-value">{value}</p>
    </a>
  );
}
