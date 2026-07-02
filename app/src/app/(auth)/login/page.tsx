'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { apiPost } from '../../../lib/api';
import { useAuthStore } from '../../../store/auth.store';

type LoginResponse = {
  accessToken: string;
  user: { id: string; email: string; role: string };
};

export default function LoginPage() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const form = new FormData(e.currentTarget);
      const email = String(form.get('email') || '');
      const password = String(form.get('password') || '');

      const res = await apiPost<LoginResponse>('/auth/login', { email, password });
      setSession({ accessToken: res.accessToken, user: res.user });
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-zinc-900">
      <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-6 py-20">
        <header className="flex flex-col gap-2 text-center">
          <h1 className="text-3xl font-semibold tracking-tight">Sign in</h1>
          <p className="text-sm text-zinc-600">
            Use your credentials to access the dashboard.
          </p>
        </header>

        <form
          onSubmit={onSubmit}
          className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-7 shadow-sm"
        >
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium">Email</span>
            <input
              type="email"
              name="email"
              className="app-input"
              placeholder="you@company.com"
              autoComplete="email"
              required
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium">Password</span>
            <input
              type="password"
              name="password"
              className="app-input"
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
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
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </main>
    </div>
  );
}

