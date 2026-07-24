'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuthStore } from '../store/auth.store';

export default function Home() {
  const router = useRouter();
  const hydrate = useAuthStore((s) => s.hydrateFromStorage);
  const hydrated = useAuthStore((s) => s.hydrated);
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!hydrated) return;
    if (accessToken && user) {
      router.replace(user.mustChangePassword ? '/account' : '/dashboard');
    }
  }, [hydrated, accessToken, user, router]);

  if (!hydrated || (accessToken && user)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0b1220] text-sm text-slate-400">
        Loading…
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0b1220] text-slate-900">
      <div
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 15% 20%, rgba(148,163,184,0.22), transparent 55%), radial-gradient(ellipse 70% 50% at 90% 80%, rgba(71,85,105,0.35), transparent 50%), linear-gradient(160deg, #0b1220 0%, #111827 45%, #1e293b 100%)',
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center px-6 py-16 text-center">
        <div className="login-fade-up">
          <p className="text-sm font-semibold tracking-[0.18em] text-slate-300 uppercase">
            LegalTrack
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Operations for modern legal teams
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-base leading-7 text-slate-300">
            Client records, case workflows, documents, and appointments in one secure workspace.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/login"
              className="inline-flex h-12 items-center justify-center rounded-xl bg-white px-6 text-sm font-medium text-slate-900 shadow-lg shadow-black/20 transition hover:bg-slate-100"
            >
              Sign in
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
