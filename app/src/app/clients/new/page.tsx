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
  portalAccount?: {
    email: string;
    temporaryPassword: string;
    mustChangePassword: boolean;
    message: string;
  };
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
      const name = String(form.get('name') || '');
      const email = String(form.get('email') || '');
      const phone = String(form.get('phone') || '');

      const created = await apiPost<Client>('/clients', {
        name,
        email,
        phone,
      });

      router.push(`/clients/${created.id}?portal=1`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create client');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell
      title="New client"
      subtitle="Register a client and create their portal login"
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
        <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
          A portal account is created automatically. The client signs in with their{' '}
          <span className="font-medium">email</span> and uses their{' '}
          <span className="font-medium">phone number as the temporary password</span>, then must
          change it on first login.
        </p>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">Name</span>
          <input name="name" className="app-input" placeholder="Client name" required />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">Email</span>
          <input
            type="email"
            name="email"
            className="app-input"
            placeholder="email@example.com"
            required
          />
          <span className="text-xs text-zinc-500">Used as the portal login username</span>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">Phone</span>
          <input
            name="phone"
            className="app-input"
            placeholder="0244123456"
            minLength={8}
            required
          />
          <span className="text-xs text-zinc-500">
            Temporary password (at least 8 characters). Share this with the client.
          </span>
        </label>

        {error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <button type="submit" disabled={submitting} className="app-btn-primary mt-2">
          {submitting ? 'Creating…' : 'Register client'}
        </button>
      </form>
    </AppShell>
  );
}
