'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiGet, apiPost } from '../../../lib/api';
import { AppShell } from '../../../components/layout/AppShell';
import { useAuthStore } from '../../../store/auth.store';

type Client = {
  id: string;
  name: string;
};

type AssigneeOption = {
  id: string;
  email: string;
  role: string;
};

type CaseItem = {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  clientId?: string | null;
  assigneeId?: string | null;
};

export default function NewCasePage() {
  const router = useRouter();
  const hydrate = useAuthStore((s) => s.hydrateFromStorage);
  const user = useAuthStore((s) => s.user);
  const isLawyer = user?.role === 'lawyer';
  const canAssign = user?.role === 'admin' || user?.role === 'clerk';
  const [clients, setClients] = useState<Client[]>([]);
  const [assignees, setAssignees] = useState<AssigneeOption[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [loadingClients, setLoadingClients] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    async function load() {
      try {
        const clientList = await apiGet<Client[]>('/clients');
        setClients(clientList);
        if (canAssign) {
          const assigneeList = await apiGet<AssigneeOption[]>('/users/assignable');
          setAssignees(assigneeList);
        }
      } catch {
        setClients([]);
        setAssignees([]);
      } finally {
        setLoadingClients(false);
      }
    }
    if (user) load();
  }, [user, canAssign]);

  async function onSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const form = new FormData(e.currentTarget);
      const titleRaw = form.get('title');
      const descriptionRaw = form.get('description');
      const statusRaw = form.get('status');
      const clientIdRaw = form.get('clientId');
      const assigneeIdRaw = form.get('assigneeId');
      const notesRaw = form.get('notes');
      const courtDateRaw = form.get('courtDate');

      const title = typeof titleRaw === 'string' ? titleRaw : '';
      const description = typeof descriptionRaw === 'string' ? descriptionRaw : '';
      const status = typeof statusRaw === 'string' ? statusRaw : '';
      const clientId = typeof clientIdRaw === 'string' ? clientIdRaw : '';
      const assigneeId = typeof assigneeIdRaw === 'string' ? assigneeIdRaw : '';
      const notes = typeof notesRaw === 'string' ? notesRaw : '';
      const courtDate = typeof courtDateRaw === 'string' ? courtDateRaw : '';

      const created = await apiPost<CaseItem>('/cases', {
        title,
        description: description || undefined,
        status,
        clientId: clientId || undefined,
        ...(canAssign && assigneeId ? { assigneeId } : {}),
        notes: notes || undefined,
        courtDate: courtDate || undefined,
      });

      router.push(`/cases/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create case');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell
      title="New case"
      subtitle="Create, assign a lawyer, and optionally link a client"
      actions={
        <a className="app-btn-muted" href="/cases">
          Back to cases
        </a>
      }
    >
      <form
        onSubmit={onSubmit}
        className="flex max-w-xl flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm"
      >
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">Title</span>
          <input name="title" className="app-input" placeholder="Case title" required />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">Description (optional)</span>
          <textarea
            name="description"
            className="app-textarea"
            placeholder="Short description"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">Status</span>
          <select name="status" className="app-select" defaultValue="open" required>
            <option value="open">Open</option>
            <option value="pending">Pending</option>
            <option value="closed">Closed</option>
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">Court date (optional)</span>
          <input type="date" name="courtDate" className="app-input" />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">Notes (optional)</span>
          <textarea name="notes" className="app-textarea" placeholder="Initial notes" />
        </label>

        {canAssign ? (
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium">Assigned lawyer (optional)</span>
            <select
              name="assigneeId"
              className="app-select"
              defaultValue=""
              disabled={loadingClients}
            >
              <option value="">Unassigned</option>
              {assignees.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.email} ({a.role})
                </option>
              ))}
            </select>
          </label>
        ) : isLawyer ? (
          <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-600">
            New cases you create are assigned to you automatically.
          </p>
        ) : null}

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">Client (optional)</span>
          <select
            name="clientId"
            className="app-select"
            defaultValue=""
            disabled={loadingClients}
          >
            <option value="">No client</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        {error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <button type="submit" disabled={submitting} className="app-btn-primary mt-2">
          {submitting ? 'Creating…' : 'Create case'}
        </button>
      </form>
    </AppShell>
  );
}
