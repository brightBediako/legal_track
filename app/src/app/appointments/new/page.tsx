'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AppShell } from '../../../components/layout/AppShell';
import { apiGet, apiPost } from '../../../lib/api';
import { useAuthStore } from '../../../store/auth.store';

type ClientOption = { id: string; name: string };
type CaseOption = { id: string; title: string };
type AppointmentItem = { id: string };

function toLocalInputValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function NewAppointmentPage() {
  const router = useRouter();
  const hydrate = useAuthStore((s) => s.hydrateFromStorage);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [cases, setCases] = useState<CaseOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const defaultStart = toLocalInputValue(new Date(Date.now() + 60 * 60 * 1000));

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    async function load() {
      try {
        const [clientList, caseList] = await Promise.all([
          apiGet<ClientOption[]>('/clients'),
          apiGet<CaseOption[]>('/cases'),
        ]);
        setClients(clientList);
        setCases(caseList);
      } catch {
        setClients([]);
        setCases([]);
      } finally {
        setLoadingOptions(false);
      }
    }
    load();
  }, []);

  async function onSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const form = new FormData(e.currentTarget);
      const title = String(form.get('title') ?? '');
      const type = String(form.get('type') ?? 'consultation');
      const status = String(form.get('status') ?? 'scheduled');
      const description = String(form.get('description') ?? '');
      const startsAtRaw = String(form.get('startsAt') ?? '');
      const endsAtRaw = String(form.get('endsAt') ?? '');
      const clientId = String(form.get('clientId') ?? '');
      const caseId = String(form.get('caseId') ?? '');

      const created = await apiPost<AppointmentItem>('/appointments', {
        title,
        type,
        status,
        description: description || undefined,
        startsAt: startsAtRaw ? new Date(startsAtRaw).toISOString() : '',
        endsAt: endsAtRaw ? new Date(endsAtRaw).toISOString() : undefined,
        clientId: clientId || undefined,
        caseId: caseId || undefined,
      });
      router.push(`/appointments/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create appointment');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell
      title="New appointment"
      subtitle="Schedule a consultation, court date, or meeting"
      actions={
        <a className="app-btn-muted" href="/appointments">
          Back to appointments
        </a>
      }
    >
      <form
        onSubmit={onSubmit}
        className="flex max-w-xl flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm"
      >
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">Title</span>
          <input name="title" className="app-input" required placeholder="Client consultation" />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">Type</span>
          <select name="type" className="app-select" defaultValue="consultation" required>
            <option value="consultation">Consultation</option>
            <option value="court">Court</option>
            <option value="meeting">Meeting</option>
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">Status</span>
          <select name="status" className="app-select" defaultValue="scheduled" required>
            <option value="scheduled">Scheduled</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">Starts at</span>
          <input
            type="datetime-local"
            name="startsAt"
            className="app-input"
            defaultValue={defaultStart}
            required
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">Ends at (optional)</span>
          <input type="datetime-local" name="endsAt" className="app-input" />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">Description (optional)</span>
          <textarea name="description" className="app-textarea" />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">Client (optional)</span>
          <select name="clientId" className="app-select" defaultValue="" disabled={loadingOptions}>
            <option value="">No client</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">Case (optional)</span>
          <select name="caseId" className="app-select" defaultValue="" disabled={loadingOptions}>
            <option value="">No case</option>
            {cases.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </label>

        {error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <button type="submit" disabled={submitting} className="app-btn-primary mt-2">
          {submitting ? 'Creating…' : 'Create appointment'}
        </button>
      </form>
    </AppShell>
  );
}
