'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AppShell } from '../../../components/layout/AppShell';
import { apiGet, apiPatch } from '../../../lib/api';
import { useAuthStore } from '../../../store/auth.store';

type ClientOption = {
  id: string;
  name: string;
};

type CaseDocument = {
  id: string;
  filename: string;
  provider: string;
  createdAt: string;
};

type CaseDetail = {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  notes?: string | null;
  courtDate?: string | null;
  clientId?: string | null;
  client?: {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    isActive: boolean;
  } | null;
  documents: CaseDocument[];
};

function toDateInputValue(value?: string | null) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

export default function CaseDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const hydrate = useAuthStore((s) => s.hydrateFromStorage);

  const [item, setItem] = useState<CaseDetail | null>(null);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('open');
  const [notes, setNotes] = useState('');
  const [courtDate, setCourtDate] = useState('');
  const [clientId, setClientId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const [data, clientList] = await Promise.all([
          apiGet<CaseDetail>(`/cases/${id}`),
          apiGet<ClientOption[]>('/clients'),
        ]);
        setItem(data);
        setClients(clientList);
        setTitle(data.title);
        setDescription(data.description ?? '');
        {
          const s = data.status.toLowerCase();
          setStatus(['open', 'pending', 'closed'].includes(s) ? s : 'open');
        }
        setNotes(data.notes ?? '');
        setCourtDate(toDateInputValue(data.courtDate));
        setClientId(data.clientId ?? '');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load case');
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
      const updated = await apiPatch<CaseDetail>(`/cases/${id}`, {
        title,
        description: description || null,
        status,
        notes: notes || null,
        courtDate: courtDate || null,
        clientId: clientId || null,
      });
      setItem(updated);
      setSuccess('Case updated.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update case');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell
      title={item?.title ?? 'Case'}
      subtitle="Status, notes, court date, and documents"
      actions={
        <div className="flex items-center gap-2">
          <a className="app-btn-muted" href="/cases">
            Back to cases
          </a>
          <a className="app-btn-muted" href="/documents/upload">
            Upload document
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

      {item ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <form
            onSubmit={onSave}
            className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm"
          >
            <h2 className="text-sm font-semibold text-zinc-900">Edit case</h2>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium">Title</span>
              <input className="app-input" value={title} onChange={(e) => setTitle(e.target.value)} required />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium">Description</span>
              <textarea
                className="app-textarea"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium">Status</span>
              <select className="app-select" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="open">Open</option>
                <option value="pending">Pending</option>
                <option value="closed">Closed</option>
              </select>
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium">Court date</span>
              <input
                type="date"
                className="app-input"
                value={courtDate}
                onChange={(e) => setCourtDate(e.target.value)}
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium">Notes</span>
              <textarea
                className="app-textarea"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Case notes / progress"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium">Client</span>
              <select
                className="app-select"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
              >
                <option value="">No client</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>

            <button type="submit" disabled={saving} className="app-btn-primary mt-2">
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </form>

          <div className="flex flex-col gap-6">
            <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold text-zinc-900">Client</h2>
              {item.client ? (
                <div className="text-sm text-zinc-700">
                  <a
                    href={`/clients/${item.client.id}`}
                    className="font-medium text-zinc-900 underline-offset-2 hover:underline"
                  >
                    {item.client.name}
                  </a>
                  <p className="mt-1">{item.client.email ?? 'No email'}</p>
                  <p>{item.client.phone ?? 'No phone'}</p>
                </div>
              ) : (
                <p className="text-sm text-zinc-600">No client linked.</p>
              )}
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold text-zinc-900">Documents</h2>
              {item.documents.length === 0 ? (
                <p className="text-sm text-zinc-600">No documents on this case.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {item.documents.map((d) => (
                    <li key={d.id} className="flex items-center justify-between gap-2">
                      <span className="font-medium text-zinc-900">{d.filename}</span>
                      <span className="text-xs text-zinc-500">{d.provider}</span>
                    </li>
                  ))}
                </ul>
              )}
              <a className="app-btn-muted mt-4 inline-flex h-10 px-4" href="/documents">
                Open documents
              </a>
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
