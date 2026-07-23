'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiPost } from '../../../lib/api';
import { AppShell } from '../../../components/layout/AppShell';
import { useAuthStore } from '../../../store/auth.store';

type Client = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
};

export default function NewClientPage() {
  const router = useRouter();
  const hydrate = useAuthStore((s) => s.hydrateFromStorage);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  async function onSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const form = new FormData(e.currentTarget);
      const nameRaw = form.get('name');
      const emailRaw = form.get('email');
      const phoneRaw = form.get('phone');

      const name = typeof nameRaw === 'string' ? nameRaw : '';
      const email = typeof emailRaw === 'string' ? emailRaw : '';
      const phone = typeof phoneRaw === 'string' ? phoneRaw : '';

      const created = await apiPost<Client>('/clients', {
        name,
        email: email || undefined,
        phone: phone || undefined,
      });

      router.push(`/clients/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create client');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell
      title="New client"
      subtitle="Create a client profile"
      actions={
        <a className="app-btn-muted" href="/clients">
          Back to clients
        </a>
      }
    >
      <form
        onSubmit={onSubmit}
        className="flex max-w-xl flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm"
      >
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">Name</span>
          <input name="name" className="app-input" placeholder="Client name" required />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">Email (optional)</span>
          <input
            type="email"
            name="email"
            className="app-input"
            placeholder="email@example.com"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">Phone (optional)</span>
          <input name="phone" className="app-input" placeholder="+233..." />
        </label>

        {error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <button type="submit" disabled={submitting} className="app-btn-primary mt-2">
          {submitting ? 'Creating…' : 'Create client'}
        </button>
      </form>
    </AppShell>
  );
}
