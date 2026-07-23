'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '../../components/layout/AppShell';
import { apiPost } from '../../lib/api';
import { useAuthStore } from '../../store/auth.store';

export default function AccountPage() {
  const hydrate = useAuthStore((s) => s.hydrateFromStorage);
  const user = useAuthStore((s) => s.user);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  async function onSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }

    setSubmitting(true);
    try {
      await apiPost<{ ok: boolean }>('/users/me/password', {
        currentPassword,
        newPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSuccess('Password updated.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell
      title="Account"
      subtitle="Change your password"
      actions={
        <a className="app-btn-muted" href="/dashboard">
          Dashboard
        </a>
      }
    >
      {!user ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          Sign in to manage your account.
        </p>
      ) : (
        <form
          onSubmit={onSubmit}
          className="flex max-w-xl flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm"
        >
          <p className="text-sm text-zinc-600">
            Signed in as <span className="font-medium text-zinc-900">{user.email}</span> ({user.role})
          </p>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium">Current password</span>
            <input
              type="password"
              className="app-input"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium">New password</span>
            <input
              type="password"
              className="app-input"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={8}
              required
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium">Confirm new password</span>
            <input
              type="password"
              className="app-input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={8}
              required
            />
          </label>

          {error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          {success ? (
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              {success}
            </p>
          ) : null}

          <button type="submit" disabled={submitting} className="app-btn-primary mt-2">
            {submitting ? 'Saving…' : 'Update password'}
          </button>
        </form>
      )}
    </AppShell>
  );
}
