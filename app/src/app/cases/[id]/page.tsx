'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AppShell } from '../../../components/layout/AppShell';
import { documentCategoryLabel } from '../../../lib/document-categories';
import { apiDelete, apiGet, apiPatch, apiPost } from '../../../lib/api';
import { useAuthStore } from '../../../store/auth.store';

type ClientOption = {
  id: string;
  name: string;
};

type AssigneeOption = {
  id: string;
  name?: string | null;
  email: string;
  role: string;
};

type CaseDocument = {
  id: string;
  filename: string;
  provider: string;
  category?: string;
  version?: number;
  createdAt: string;
};

type TimelineEvent = {
  id: string;
  type: string;
  title: string;
  body?: string | null;
  createdAt: string;
  createdBy?: { id: string; email: string; role: string } | null;
};

type CaseDetail = {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  notes?: string | null;
  courtDate?: string | null;
  clientId?: string | null;
  assigneeId?: string | null;
  assignee?: AssigneeOption | null;
  client?: {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    isActive: boolean;
  } | null;
  documents: CaseDocument[];
  timelineEvents?: TimelineEvent[];
};

function toDateInputValue(value?: string | null) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

export default function CaseDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const hydrate = useAuthStore((s) => s.hydrateFromStorage);
  const user = useAuthStore((s) => s.user);
  const isClient = user?.role === 'client';
  const isAdmin = user?.role === 'admin';
  const isLawyer = user?.role === 'lawyer';
  const canEdit =
    user?.role === 'admin' || user?.role === 'lawyer' || user?.role === 'clerk';
  const canAssign = user?.role === 'admin' || user?.role === 'clerk';

  const [item, setItem] = useState<CaseDetail | null>(null);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [assignees, setAssignees] = useState<AssigneeOption[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('open');
  const [notes, setNotes] = useState('');
  const [courtDate, setCourtDate] = useState('');
  const [clientId, setClientId] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [timelineTitle, setTimelineTitle] = useState('');
  const [timelineBody, setTimelineBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [addingNote, setAddingNote] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const data = await apiGet<CaseDetail>(`/cases/${id}`);
        setItem(data);
        setTitle(data.title);
        setDescription(data.description ?? '');
        {
          const s = data.status.toLowerCase();
          setStatus(['open', 'pending', 'closed'].includes(s) ? s : 'open');
        }
        setNotes(data.notes ?? '');
        setCourtDate(toDateInputValue(data.courtDate));
        setClientId(data.clientId ?? '');
        setAssigneeId(data.assigneeId ?? '');

        if (canEdit) {
          const clientList = await apiGet<ClientOption[]>('/clients');
          setClients(clientList);
          if (canAssign) {
            const assigneeList = await apiGet<AssigneeOption[]>('/users/assignable');
            setAssignees(assigneeList);
          }
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load case');
      } finally {
        setLoading(false);
      }
    }
    if (id && user) load();
  }, [id, user, canEdit, canAssign]);

  async function onSave(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canEdit) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const updated = await apiPatch<CaseDetail>(`/cases/${id}`, {
        title,
        description: description || null,
        status,
        notes: notes || null,
        courtDate: courtDate || null,
        clientId: clientId || null,
        ...(canAssign ? { assigneeId: assigneeId || null } : {}),
      });
      setItem(updated);
      setAssigneeId(updated.assigneeId ?? '');
      setSuccess('Case updated.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update case');
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!isAdmin) return;
    const confirmed = window.confirm(
      'Delete this case? Documents stay in the system but are unlinked from the case.',
    );
    if (!confirmed) return;
    setDeleting(true);
    setError(null);
    try {
      await apiDelete(`/cases/${id}`);
      router.push('/cases');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete case');
    } finally {
      setDeleting(false);
    }
  }

  async function onAddTimelineNote(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canEdit) return;
    setAddingNote(true);
    setError(null);
    setSuccess(null);
    try {
      const created = await apiPost<TimelineEvent>(`/cases/${id}/timeline`, {
        title: timelineTitle,
        body: timelineBody || undefined,
      });
      setItem((prev) =>
        prev
          ? {
              ...prev,
              timelineEvents: [created, ...(prev.timelineEvents ?? [])],
            }
          : prev,
      );
      setTimelineTitle('');
      setTimelineBody('');
      setSuccess('Timeline note added.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add timeline note');
    } finally {
      setAddingNote(false);
    }
  }

  const timeline = item?.timelineEvents ?? [];

  return (
    <AppShell
      title={item?.title ?? 'Case'}
      subtitle={
        canEdit
          ? 'Assignment, timeline, notes, and documents'
          : 'Case details, timeline, and documents'
      }
      actions={
        <div className="flex items-center gap-2">
          <a className="app-btn-muted" href="/cases">
            Back to cases
          </a>
          <a className="app-btn-muted" href="/documents/upload">
            Upload document
          </a>
        </div>
      }
    >
      {loading ? <p className="text-sm text-zinc-600">Loading…</p> : null}

      {error ? (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {success ? (
        <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {success}
        </p>
      ) : null}

      {item ? (
        <div className="grid gap-6 lg:grid-cols-2">
          {canEdit ? (
            <form
              onSubmit={onSave}
              className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm"
            >
              <h2 className="text-sm font-semibold text-zinc-900">Edit case</h2>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium">Title</span>
                <input className="app-input" value={title} onChange={(e) => setTitle(e.target.value)} required />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium">Description</span>
                <textarea
                  className="app-textarea"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium">Status</span>
                <select className="app-select" value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="open">Open</option>
                  <option value="pending">Pending</option>
                  <option value="closed">Closed</option>
                </select>
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium">Assigned lawyer</span>
                {canAssign ? (
                  <select
                    className="app-select"
                    value={assigneeId}
                    onChange={(e) => setAssigneeId(e.target.value)}
                  >
                    <option value="">Unassigned</option>
                    {assignees.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name ? `${a.name} (${a.email})` : a.email} ({a.role})
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
                    {item?.assignee?.email ?? (isLawyer ? 'You' : '—')}
                  </p>
                )}
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium">Court date</span>
                <input
                  type="date"
                  className="app-input"
                  value={courtDate}
                  onChange={(e) => setCourtDate(e.target.value)}
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium">Notes</span>
                <textarea
                  className="app-textarea"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Case notes / progress"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium">Client</span>
                <select
                  className="app-select"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                >
                  <option value="">No client</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>

              <button type="submit" disabled={saving} className="app-btn-primary mt-2">
                {saving ? 'Saving…' : 'Save changes'}
              </button>

              {isAdmin ? (
                <button
                  type="button"
                  disabled={deleting}
                  onClick={onDelete}
                  className="app-btn-muted mt-2 border-red-200 text-red-700 hover:bg-red-50"
                >
                  {deleting ? 'Deleting…' : 'Delete case'}
                </button>
              ) : null}
            </form>
          ) : (
            <div className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h2 className="text-sm font-semibold text-zinc-900">Case details</h2>
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-zinc-500">Status</dt>
                  <dd className="font-medium text-zinc-900">{item.status}</dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Assignee</dt>
                  <dd className="text-zinc-900">{item.assignee?.email ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Court date</dt>
                  <dd className="text-zinc-900">
                    {item.courtDate ? new Date(item.courtDate).toLocaleDateString() : '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Description</dt>
                  <dd className="whitespace-pre-wrap text-zinc-900">{item.description || '—'}</dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Notes</dt>
                  <dd className="whitespace-pre-wrap text-zinc-900">{item.notes || '—'}</dd>
                </div>
              </dl>
            </div>
          )}

          <div className="flex flex-col gap-6">
            {!isClient ? (
              <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
                <h2 className="mb-3 text-sm font-semibold text-zinc-900">Client</h2>
                {item.client ? (
                  <div className="text-sm text-zinc-700">
                    <a
                      href={`/clients/${item.client.id}`}
                      className="font-medium text-zinc-900 underline-offset-2 hover:underline"
                    >
                      {item.client.name}
                    </a>
                    <p className="mt-1">{item.client.email ?? 'No email'}</p>
                    <p>{item.client.phone ?? 'No phone'}</p>
                  </div>
                ) : (
                  <p className="text-sm text-zinc-600">No client linked.</p>
                )}
                {item.assignee ? (
                  <p className="mt-3 text-sm text-zinc-600">
                    Assigned to <span className="font-medium text-zinc-900">{item.assignee.email}</span>
                  </p>
                ) : (
                  <p className="mt-3 text-sm text-zinc-600">No lawyer assigned.</p>
                )}
              </div>
            ) : null}

            <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold text-zinc-900">Timeline</h2>
              {timeline.length === 0 ? (
                <p className="text-sm text-zinc-600">No timeline events yet.</p>
              ) : (
                <ul className="space-y-3 text-sm">
                  {timeline.map((ev) => (
                    <li key={ev.id} className="border-t border-zinc-100 pt-3 first:border-t-0 first:pt-0">
                      <p className="font-medium text-zinc-900">{ev.title}</p>
                      {ev.body ? <p className="mt-1 text-zinc-700 whitespace-pre-wrap">{ev.body}</p> : null}
                      <p className="mt-1 text-xs text-zinc-500">
                        {ev.type} · {new Date(ev.createdAt).toLocaleString()}
                        {ev.createdBy ? ` · ${ev.createdBy.email}` : ''}
                      </p>
                    </li>
                  ))}
                </ul>
              )}

              {canEdit ? (
                <form onSubmit={onAddTimelineNote} className="mt-4 flex flex-col gap-3 border-t border-zinc-100 pt-4">
                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-medium">Add timeline note</span>
                    <input
                      className="app-input"
                      value={timelineTitle}
                      onChange={(e) => setTimelineTitle(e.target.value)}
                      placeholder="Short title"
                      required
                    />
                  </label>
                  <textarea
                    className="app-textarea"
                    value={timelineBody}
                    onChange={(e) => setTimelineBody(e.target.value)}
                    placeholder="Optional details"
                  />
                  <button type="submit" disabled={addingNote} className="app-btn-muted h-10 px-4 self-start">
                    {addingNote ? 'Adding…' : 'Add note'}
                  </button>
                </form>
              ) : null}
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-zinc-900">Documents</h2>
                <a
                  className="text-xs text-zinc-500 underline-offset-2 hover:underline"
                  href={`/documents?caseId=${encodeURIComponent(item.id)}`}
                >
                  Full list
                </a>
              </div>
              {item.documents.length === 0 ? (
                <p className="text-sm text-zinc-600">No documents on this case.</p>
              ) : (
                <ul className="space-y-3 text-sm">
                  {item.documents.map((d) => (
                    <li key={d.id} className="border-t border-zinc-100 pt-3 first:border-t-0 first:pt-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-zinc-900">{d.filename}</p>
                          <p className="mt-1 text-xs text-zinc-500">
                            {documentCategoryLabel(d.category)} · v{d.version ?? 1}
                          </p>
                        </div>
                        <a
                          className="app-btn-muted h-9 shrink-0 px-3"
                          href={`/documents/upload?caseId=${encodeURIComponent(item.id)}&replacesDocumentId=${encodeURIComponent(d.id)}`}
                        >
                          New version
                        </a>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                <a
                  className="app-btn-muted inline-flex h-10 px-4"
                  href={`/documents/upload?caseId=${encodeURIComponent(item.id)}`}
                >
                  Upload document
                </a>
                <a
                  className="app-btn-muted inline-flex h-10 px-4"
                  href={`/documents?caseId=${encodeURIComponent(item.id)}`}
                >
                  View all versions
                </a>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
