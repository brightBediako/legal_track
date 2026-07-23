'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AppShell } from '../../../components/layout/AppShell';
import { apiGet, apiPatch } from '../../../lib/api';
import { useAuthStore } from '../../../store/auth.store';

type ClientOption = { id: string; name: string };
type CaseOption = { id: string; title: string };

type AppointmentDetail = {
  id: string;
  title: string;
  type: string;
  status: string;
  description?: string | null;
  startsAt: string;
  endsAt?: string | null;
  clientId?: string | null;
  caseId?: string | null;
  client?: { id: string; name: string } | null;
  case?: { id: string; title: string } | null;
};

function toLocalInputValue(value?: string | null) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function AppointmentDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const hydrate = useAuthStore((s) => s.hydrateFromStorage);
  const user = useAuthStore((s) => s.user);
  const canEdit =
    user?.role === 'admin' || user?.role === 'lawyer' || user?.role === 'clerk';

  const [item, setItem] = useState<AppointmentDetail | null>(null);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [cases, setCases] = useState<CaseOption[]>([]);
  const [title, setTitle] = useState('');
  const [type, setType] = useState('consultation');
  const [status, setStatus] = useState('scheduled');
  const [description, setDescription] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [clientId, setClientId] = useState('');
  const [caseId, setCaseId] = useState('');
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
        const data = await apiGet<AppointmentDetail>(`/appointments/${id}`);
        setItem(data);
        setTitle(data.title);
        setType(data.type);
        setStatus(data.status);
        setDescription(data.description ?? '');
        setStartsAt(toLocalInputValue(data.startsAt));
        setEndsAt(toLocalInputValue(data.endsAt));
        setClientId(data.clientId ?? '');
        setCaseId(data.caseId ?? '');

        if (canEdit) {
          const [clientList, caseList] = await Promise.all([
            apiGet<ClientOption[]>('/clients'),
            apiGet<CaseOption[]>('/cases'),
          ]);
          setClients(clientList);
          setCases(caseList);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load appointment');
      } finally {
        setLoading(false);
      }
    }
    if (id && user) load();
  }, [id, user, canEdit]);

  async function onSave(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canEdit) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const updated = await apiPatch<AppointmentDetail>(`/appointments/${id}`, {
        title,
        type,
        status,
        description: description || null,
        startsAt: startsAt ? new Date(startsAt).toISOString() : undefined,
        endsAt: endsAt ? new Date(endsAt).toISOString() : null,
        clientId: clientId || null,
        caseId: caseId || null,
      });
      setItem(updated);
      setSuccess('Appointment updated.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update appointment');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell
      title={item?.title ?? 'Appointment'}
      subtitle={canEdit ? 'Edit schedule details' : 'Appointment details'}
      actions={
        <a className="app-btn-muted" href="/appointments">
          Back to appointments
        </a>
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

      {item && canEdit ? (
        <form
          onSubmit={onSave}
          className="flex max-w-xl flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm"
        >
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium">Title</span>
            <input className="app-input" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium">Type</span>
            <select className="app-select" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="consultation">Consultation</option>
              <option value="court">Court</option>
              <option value="meeting">Meeting</option>
            </select>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium">Status</span>
            <select className="app-select" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium">Starts at</span>
            <input
              type="datetime-local"
              className="app-input"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              required
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium">Ends at</span>
            <input
              type="datetime-local"
              className="app-input"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
            />
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
            <span className="text-sm font-medium">Client</span>
            <select className="app-select" value={clientId} onChange={(e) => setClientId(e.target.value)}>
              <option value="">No client</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium">Case</span>
            <select className="app-select" value={caseId} onChange={(e) => setCaseId(e.target.value)}>
              <option value="">No case</option>
              {cases.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </label>

          <button type="submit" disabled={saving} className="app-btn-primary mt-2">
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      ) : null}

      {item && !canEdit ? (
        <div className="flex max-w-xl flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-zinc-500">Type</dt>
              <dd className="font-medium text-zinc-900">{item.type}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Status</dt>
              <dd className="font-medium text-zinc-900">{item.status}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Starts</dt>
              <dd className="text-zinc-900">{new Date(item.startsAt).toLocaleString()}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Ends</dt>
              <dd className="text-zinc-900">
                {item.endsAt ? new Date(item.endsAt).toLocaleString() : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500">Case</dt>
              <dd className="text-zinc-900">
                {item.case ? (
                  <a
                    href={`/cases/${item.case.id}`}
                    className="underline-offset-2 hover:underline"
                  >
                    {item.case.title}
                  </a>
                ) : (
                  '—'
                )}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500">Description</dt>
              <dd className="whitespace-pre-wrap text-zinc-900">{item.description || '—'}</dd>
            </div>
          </dl>
        </div>
      ) : null}
    </AppShell>
  );
}
