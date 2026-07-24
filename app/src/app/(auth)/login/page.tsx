'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { apiPost } from '../../../lib/api';
import { useAuthStore } from '../../../store/auth.store';

type LoginResponse = {
  accessToken: string;
  refreshToken?: string;
  user: {
    id: string;
    email: string;
    role: string;
    clientId?: string | null;
    mustChangePassword?: boolean;
  };
};

function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg viewBox="0 0 24 24" className="size-5" fill="none" aria-hidden="true">
        <path
          d="M3 3l18 18M10.5 10.6a2.5 2.5 0 0 0 3 3M9.9 5.2A10.4 10.4 0 0 1 12 5c5 0 9.3 3.1 11 7.5a12.3 12.3 0 0 1-4.2 5.1M6.1 6.1A12.2 12.2 0 0 0 1 12.5C2.7 16.9 7 20 12 20c1.6 0 3.1-.3 4.5-.9"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" aria-hidden="true">
      <path
        d="M2 12.5C3.7 8.1 8 5 12 5s8.3 3.1 10 7.5c-1.7 4.4-6 7.5-10 7.5S3.7 16.9 2 12.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <circle cx="12" cy="12.5" r="2.75" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setSession = useAuthStore((s) => s.setSession);
  const hydrate = useAuthStore((s) => s.hydrateFromStorage);
  const hydrated = useAuthStore((s) => s.hydrated);
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const nextPath = searchParams.get('next') || '/dashboard';

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!hydrated) return;
    if (accessToken && user) {
      router.replace(
        user.mustChangePassword ? '/account' : nextPath.startsWith('/') ? nextPath : '/dashboard',
      );
    }
  }, [hydrated, accessToken, user, nextPath, router]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const form = new FormData(e.currentTarget);
      const email = String(form.get('email') || '');
      const password = String(form.get('password') || '');

      const res = await apiPost<LoginResponse>('/auth/login', { email, password }, { auth: false });
      setSession({
        accessToken: res.accessToken,
        refreshToken: res.refreshToken,
        user: res.user,
      });
      router.replace(
        res.user.mustChangePassword
          ? '/account'
          : nextPath.startsWith('/')
            ? nextPath
            : '/dashboard',
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setSubmitting(false);
    }
  }

  if (!hydrated || (accessToken && user)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-sm text-zinc-600">
        Loading…
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0b1220] text-zinc-900">
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

      <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center gap-10 px-6 py-16 lg:flex-row lg:items-center lg:gap-16 lg:px-10">
        <section className="login-fade-up max-w-lg text-white lg:flex-1">
          <p className="text-sm font-semibold tracking-[0.18em] text-slate-300 uppercase">
            LegalTrack
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Secure operations for your practice
          </h1>
          <p className="mt-4 max-w-md text-base leading-7 text-slate-300">
            Sign in to manage clients, cases, documents, and appointments with role-based access
            built for legal teams.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-slate-300">
            <li className="flex items-start gap-3">
              <span className="mt-1 inline-block size-1.5 shrink-0 rounded-full bg-slate-400" />
              Encrypted sessions with role-scoped data access
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1 inline-block size-1.5 shrink-0 rounded-full bg-slate-400" />
              Client portal, case timelines, and document control
            </li>
          </ul>
        </section>

        <section className="login-fade-up-delay w-full max-w-md lg:flex-none">
          <form
            onSubmit={onSubmit}
            className="rounded-2xl border border-white/10 bg-white/95 p-8 shadow-2xl shadow-black/30 backdrop-blur-sm"
          >
            <div className="mb-6">
              <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">Sign in</h2>
              <p className="mt-1.5 text-sm text-zinc-600">
                Enter your firm credentials to open the dashboard.
              </p>
            </div>

            <div className="flex flex-col gap-4">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-zinc-800">Email</span>
                <input
                  type="email"
                  name="email"
                  className="app-input h-12 border-zinc-200 bg-zinc-50/80 focus:border-zinc-900 focus:bg-white"
                  placeholder="you@firm.com"
                  autoComplete="email"
                  required
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-zinc-800">Password</span>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    className="app-input h-12 w-full border-zinc-200 bg-zinc-50/80 pr-12 focus:border-zinc-900 focus:bg-white"
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute top-1/2 right-2.5 flex size-9 -translate-y-1/2 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                  >
                    <EyeIcon open={showPassword} />
                  </button>
                </div>
              </label>

              {error ? (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={submitting}
                className="app-btn-primary mt-2 h-12 w-full text-[15px] shadow-sm shadow-zinc-900/20"
              >
                {submitting ? 'Signing in…' : 'Sign in'}
              </button>
            </div>

            <p className="mt-6 text-center text-xs leading-5 text-zinc-500">
              Authorized personnel only. Activity may be audited for compliance.
            </p>
          </form>
        </section>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-100 text-sm text-zinc-600">
          Loading…
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
