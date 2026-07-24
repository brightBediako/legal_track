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
  location?: string | null;
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
      const location = String(form.get('location') || '');

      const created = await apiPost<Client>('/clients', {
        name,
        email,
        phone,
        location,
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
        className="flex max-w-xl flex-col gap-4 app-panel"
      >
        <p className="app-alert-info">
          A portal account is created automatically. The client signs in with their{' '}
          <span className="font-medium">email</span> and uses their{' '}
          <span className="font-medium">phone number as the temporary password</span>, then must
          change it on first login.
        </p>

        <label className="flex flex-col gap-2">
          <span className="app-label">Name</span>
          <input name="name" className="app-input" placeholder="Client full name" required />
        </label>

        <label className="flex flex-col gap-2">
          <span className="app-label">Email</span>
          <input
            type="email"
            name="email"
            className="app-input"
            placeholder="email@example.com"
            required
          />
          <span className="app-help">Used as the portal login username</span>
        </label>

        <label className="flex flex-col gap-2">
          <span className="app-label">Phone</span>
          <input
            name="phone"
            className="app-input"
            placeholder="0244123456"
            minLength={8}
            required
          />
          <span className="app-help">
            Temporary password (at least 8 characters). Share this with the client.
          </span>
        </label>

        <label className="flex flex-col gap-2">
          <span className="app-label">Location</span>
          <input
            name="location"
            className="app-input"
            placeholder="City, region, or address"
            required
          />
        </label>

        {error ? (
          <p className="app-alert-error">
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
