'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiPost } from '../../../lib/api';
import { AppShell } from '../../../components/layout/AppShell';

type Client = {
  id: string;
  name: string;
};

type CaseItem = {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  clientId?: string | null;
};

export default function NewCasePage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [loadingClients, setLoadingClients] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
        if (!baseUrl) throw new Error('NEXT_PUBLIC_API_BASE_URL is not configured');
        const res = await fetch(`${baseUrl}/clients`);
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        const data = (await res.json()) as Client[];
        setClients(data);
      } catch {
        setClients([]);
      } finally {
        setLoadingClients(false);
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
      const titleRaw = form.get('title');
      const descriptionRaw = form.get('description');
      const statusRaw = form.get('status');
      const clientIdRaw = form.get('clientId');

      const title = typeof titleRaw === 'string' ? titleRaw : '';
      const description = typeof descriptionRaw === 'string' ? descriptionRaw : '';
      const status = typeof statusRaw === 'string' ? statusRaw : '';
      const clientId = typeof clientIdRaw === 'string' ? clientIdRaw : '';

      await apiPost<CaseItem>('/cases', {
        title,
        description: description || undefined,
        status,
        clientId: clientId || undefined,
      });

      router.push('/cases');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create case');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell
      title="New case"
      subtitle="Create and optionally assign a client"
      actions={
        <a className="app-btn-muted" href="/cases">
          Back to cases
        </a>
      }
    >

        <form
          onSubmit={onSubmit}
          className="flex max-w-xl flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm"
        >
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium">Title</span>
            <input
              name="title"
              className="app-input"
              placeholder="Case title"
              required
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium">Description (optional)</span>
            <textarea
              name="description"
              className="app-textarea"
              placeholder="Short description"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium">Status</span>
            <input
              name="status"
              className="app-input"
              placeholder="open"
              required
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium">Client (optional)</span>
            <select
              name="clientId"
              className="app-select"
              defaultValue=""
              disabled={loadingClients}
            >
              <option value="">No client</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          {error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="app-btn-primary mt-2"
          >
            {submitting ? 'Creating…' : 'Create case'}
          </button>
        </form>
    </AppShell>
  );
}

