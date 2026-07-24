'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '../../components/layout/AppShell';
import { apiGet, apiPatch } from '../../lib/api';
import { useAuthStore } from '../../store/auth.store';

type SystemSettings = {
  id: string;
  firmName: string;
  supportEmail?: string | null;
  supportPhone?: string | null;
  timezone: string;
  updatedAt: string;
};

type RbacRole = {
  role: string;
  summary: string;
  capabilities: string[];
};

export default function SettingsPage() {
  const hydrate = useAuthStore((s) => s.hydrateFromStorage);
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'admin';

  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [roles, setRoles] = useState<RbacRole[]>([]);
  const [firmName, setFirmName] = useState('');
  const [supportEmail, setSupportEmail] = useState('');
  const [supportPhone, setSupportPhone] = useState('');
  const [timezone, setTimezone] = useState('Africa/Accra');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const [s, matrix] = await Promise.all([
          apiGet<SystemSettings>('/settings'),
          apiGet<{ roles: RbacRole[] }>('/settings/rbac'),
        ]);
        setSettings(s);
        setFirmName(s.firmName);
        setSupportEmail(s.supportEmail ?? '');
        setSupportPhone(s.supportPhone ?? '');
        setTimezone(s.timezone);
        setRoles(matrix.roles);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load settings');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [isAdmin]);

  async function onSave(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!isAdmin) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const updated = await apiPatch<SystemSettings>('/settings', {
        firmName,
        supportEmail: supportEmail || null,
        supportPhone: supportPhone || null,
        timezone,
      });
      setSettings(updated);
      setSuccess('Settings saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell
      title="Settings"
      subtitle="Firm configuration and role permissions"
      actions={
        <a className="app-btn-muted" href="/dashboard">
          Dashboard
        </a>
      }
    >
      {!isAdmin ? (
        <p className="app-alert-error">
          Only administrators can manage settings and permissions.
        </p>
      ) : null}

      {loading ? <p className="text-sm text-slate-500">Loading…</p> : null}

      {error ? (
        <p className="app-alert-error mb-4">
          {error}
        </p>
      ) : null}

      {success ? (
        <p className="app-alert-success mb-4">
          {success}
        </p>
      ) : null}

      {isAdmin && settings ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <form
            onSubmit={onSave}
            className="flex flex-col gap-4 app-panel"
          >
            <h2 className="app-section-title">System settings</h2>

            <label className="flex flex-col gap-2">
              <span className="app-label">Firm name</span>
              <input
                className="app-input"
                value={firmName}
                onChange={(e) => setFirmName(e.target.value)}
                required
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="app-label">Support email</span>
              <input
                type="email"
                className="app-input"
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="app-label">Support phone</span>
              <input
                className="app-input"
                value={supportPhone}
                onChange={(e) => setSupportPhone(e.target.value)}
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="app-label">Timezone</span>
              <input
                className="app-input"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                required
              />
            </label>

            <p className="app-help">
              Updated {new Date(settings.updatedAt).toLocaleString()}
            </p>

            <button type="submit" disabled={saving} className="app-btn-primary mt-2">
              {saving ? 'Saving…' : 'Save settings'}
            </button>
          </form>

          <div className="app-panel">
            <h2 className="mb-4 app-section-title">Role permissions</h2>
            <p className="mb-4 text-sm text-slate-500">
              Permissions are role-based. Assign roles under Users; this matrix documents what each
              role can do.
            </p>
            <ul className="space-y-4">
              {roles.map((r) => (
                <li key={r.role} className="border-t border-slate-100 pt-4 first:border-t-0 first:pt-0">
                  <p className="font-medium capitalize text-slate-900">{r.role}</p>
                  <p className="mt-1 app-help">{r.summary}</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
                    {r.capabilities.map((c) => (
                      <li key={c}>{c}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
            <a className="app-btn-muted mt-4 inline-flex h-10 px-4" href="/users">
              Manage users & roles
            </a>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
