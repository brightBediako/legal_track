'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AppShell } from '../../../components/layout/AppShell';
import { apiDelete, apiGet, apiPatch } from '../../../lib/api';
import { useAuthStore } from '../../../store/auth.store';

type LinkedDocument = {
  id: string;
  filename: string;
  provider: string;
  createdAt: string;
};

type LinkedCase = {
  id: string;
  title: string;
  status: string;
  courtDate?: string | null;
  createdAt: string;
  documents: LinkedDocument[];
};

type ClientDetail = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  isActive: boolean;
  createdAt: string;
  cases: LinkedCase[];
  portalUser?: {
    id: string;
    email: string;
    name?: string | null;
    phone?: string | null;
    mustChangePassword: boolean;
    createdAt?: string;
  } | null;
};

export default function ClientDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const searchParams = useSearchParams();
  const showPortalHint = searchParams.get('portal') === '1';
  const hydrate = useAuthStore((s) => s.hydrateFromStorage);
  const authUser = useAuthStore((s) => s.user);
  const isAdmin = authUser?.role === 'admin';

  const [client, setClient] = useState<ClientDetail | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(
    showPortalHint
      ? 'Client registered. Portal login uses their email; temporary password is their phone number.'
      : null,
  );

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const data = await apiGet<ClientDetail>(`/clients/${id}`);
        setClient(data);
        setName(data.name);
        setEmail(data.email ?? '');
        setPhone(data.phone ?? '');
        setLocation(data.location ?? '');
        setIsActive(data.isActive);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load client');
      } finally {
        setLoading(false);
      }
    }
    if (id) load();
  }, [id]);

  async function onSave(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const updated = await apiPatch<ClientDetail>(`/clients/${id}`, {
        name,
        email,
        phone,
        location,
        isActive,
      });
      setClient((prev) => (prev ? { ...prev, ...updated, cases: prev.cases } : prev));
      setSuccess('Client updated.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update client');
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!isAdmin) return;
    const confirmed = window.confirm(
      'Delete this client? This only works when the client has no linked cases.',
    );
    if (!confirmed) return;
    setDeleting(true);
    setError(null);
    try {
      await apiDelete(`/clients/${id}`);
      router.push('/clients');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete client');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AppShell
      title={client?.name ?? 'Client'}
      subtitle="Profile, edit, and history"
      actions={
        <div className="flex items-center gap-2">
          <a className="app-btn-muted" href="/clients">
            Back to clients
          </a>
          <a className="app-btn-muted" href="/cases/new">
            New case
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

      {success ? (
        <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {success}
        </p>
      ) : null}

      {client ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <form
            onSubmit={onSave}
            className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm"
          >
            <h2 className="text-sm font-semibold text-zinc-900">Edit profile</h2>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium">Name</span>
              <input className="app-input" value={name} onChange={(e) => setName(e.target.value)} required />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium">Email</span>
              <input
                type="email"
                className="app-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <span className="text-xs text-zinc-500">Portal login username</span>
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium">Phone</span>
              <input
                className="app-input"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                minLength={8}
                required
              />
              <span className="text-xs text-zinc-500">
                Temporary password at registration (changing phone here does not reset the password)
              </span>
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium">Location</span>
              <input
                className="app-input"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                required
              />
            </label>

            {client.portalUser ? (
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
                <p>
                  Portal account: <span className="font-medium">{client.portalUser.email}</span>
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  {client.portalUser.mustChangePassword
                    ? 'Awaiting first-login password change'
                    : 'Password has been updated by the client'}
                </p>
              </div>
            ) : null}

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              Active client
            </label>
            <button type="submit" disabled={saving} className="app-btn-primary mt-2">
              {saving ? 'Saving…' : 'Save changes'}
            </button>

            {isAdmin ? (
              <button
                type="button"
                disabled={deleting || (client?.cases.length ?? 0) > 0}
                onClick={onDelete}
                className="app-btn-muted mt-2 border-red-200 text-red-700 hover:bg-red-50"
              >
                {deleting
                  ? 'Deleting…'
                  : (client?.cases.length ?? 0) > 0
                    ? 'Delete blocked (has cases)'
                    : 'Delete client'}
              </button>
            ) : null}
          </form>

          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-zinc-900">History</h2>
            {client.cases.length === 0 ? (
              <p className="text-sm text-zinc-600">No linked cases yet.</p>
            ) : (
              <ul className="flex flex-col gap-4">
                {client.cases.map((c) => (
                  <li key={c.id} className="border-t border-zinc-100 pt-4 first:border-t-0 first:pt-0">
                    <a
                      href={`/cases/${c.id}`}
                      className="font-medium text-zinc-900 underline-offset-2 hover:underline"
                    >
                      {c.title}
                    </a>
                    <p className="mt-1 text-xs text-zinc-500">
                      Status: {c.status}
                      {c.courtDate
                        ? ` · Court: ${new Date(c.courtDate).toLocaleDateString()}`
                        : ''}
                    </p>
                    {c.documents.length > 0 ? (
                      <ul className="mt-2 space-y-1 text-sm text-zinc-700">
                        {c.documents.map((d) => (
                          <li key={d.id}>
                            <a
                              href="/documents"
                              className="underline-offset-2 hover:underline"
                            >
                              {d.filename}
                            </a>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 text-xs text-zinc-500">No documents on this case.</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
