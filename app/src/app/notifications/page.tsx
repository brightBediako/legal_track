'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '../../components/layout/AppShell';
import { apiGet, apiPatch } from '../../lib/api';
import { useAuthStore } from '../../store/auth.store';

type NotificationItem = {
  id: string;
  title: string;
  body?: string | null;
  type: string;
  entity?: string | null;
  entityId?: string | null;
  href?: string | null;
  readAt?: string | null;
  createdAt: string;
};

export default function NotificationsPage() {
  const hydrate = useAuthStore((s) => s.hydrateFromStorage);
  const user = useAuthStore((s) => s.user);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [marking, setMarking] = useState(false);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  async function load() {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const qs = unreadOnly ? '?unreadOnly=true' : '';
      const data = await apiGet<NotificationItem[]>(`/notifications${qs}`);
      setItems(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, unreadOnly]);

  async function markOne(id: string) {
    try {
      await apiPatch(`/notifications/${id}/read`, {});
      setItems((prev) =>
        prev.map((n) => (n.id === id ? { ...n, readAt: n.readAt ?? new Date().toISOString() } : n)),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to mark as read');
    }
  }

  async function markAll() {
    setMarking(true);
    try {
      await apiPatch('/notifications/read-all', {});
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to mark all as read');
    } finally {
      setMarking(false);
    }
  }

  return (
    <AppShell
      title="Notifications"
      subtitle="Case, appointment, and document alerts"
      actions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="app-btn-muted h-10 px-4"
            disabled={marking || !user}
            onClick={markAll}
          >
            {marking ? 'Updating…' : 'Mark all read'}
          </button>
          <a className="app-btn-muted" href="/dashboard">
            Dashboard
          </a>
        </div>
      }
    >
      {!user ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          Sign in to view notifications.
        </p>
      ) : (
        <>
          <label className="mb-4 flex items-center gap-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              checked={unreadOnly}
              onChange={(e) => setUnreadOnly(e.target.checked)}
            />
            Unread only
          </label>

          {loading ? <p className="text-sm text-zinc-600">Loading…</p> : null}
          {error ? (
            <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
            {items.length === 0 && !loading ? (
              <p className="px-4 py-6 text-sm text-zinc-600">No notifications yet.</p>
            ) : (
              <ul className="divide-y divide-zinc-100">
                {items.map((n) => {
                  const unread = !n.readAt;
                  return (
                    <li
                      key={n.id}
                      className={`flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-start sm:justify-between ${
                        unread ? 'bg-zinc-50' : 'bg-white'
                      }`}
                    >
                      <div>
                        <p className="text-sm font-medium text-zinc-900">
                          {unread ? <span className="mr-2 inline-block size-2 rounded-full bg-zinc-900" /> : null}
                          {n.title}
                        </p>
                        {n.body ? <p className="mt-1 text-sm text-zinc-600">{n.body}</p> : null}
                        <p className="mt-1 text-xs text-zinc-500">
                          {n.type} · {new Date(n.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {n.href ? (
                          <a className="app-btn-muted h-9 px-3" href={n.href}>
                            Open
                          </a>
                        ) : null}
                        {unread ? (
                          <button
                            type="button"
                            className="app-btn-muted h-9 px-3"
                            onClick={() => markOne(n.id)}
                          >
                            Mark read
                          </button>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </>
      )}
    </AppShell>
  );
}
