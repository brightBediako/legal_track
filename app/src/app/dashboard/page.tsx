'use client';

import { useEffect } from 'react';
import { useAuthStore } from '../../store/auth.store';
import { AppShell } from '../../components/layout/AppShell';

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const hydrate = useAuthStore((s) => s.hydrateFromStorage);
  const clear = useAuthStore((s) => s.clear);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <AppShell
      title="Dashboard"
      subtitle="Overview of your workspace"
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
      <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-zinc-700">
            {user ? (
              <>
                Signed in as <span className="font-medium">{user.email}</span>{' '}
                (<span className="font-medium">{user.role}</span>).
              </>
            ) : (
              'You are not signed in.'
            )}
          </p>
      </section>
    </AppShell>
  );
}

