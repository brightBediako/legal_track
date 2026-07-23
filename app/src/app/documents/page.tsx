'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '../../components/layout/AppShell';
import { apiGet, apiGetBlob } from '../../lib/api';
import { useAuthStore } from '../../store/auth.store';

type DocumentItem = {
  id: string;
  filename: string;
  provider: string;
  caseId?: string | null;
  createdAt: string;
  case?: { id: string; title: string } | null;
};

type AccessResponse = {
  url: string;
  provider?: string;
  requiresAuth?: boolean;
  expiresInSeconds?: number;
};

export default function DocumentsPage() {
  const hydrate = useAuthStore((s) => s.hydrateFromStorage);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    async function run() {
      try {
        setError(null);
        const data = await apiGet<DocumentItem[]>('/documents');
        setDocuments(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load documents');
      } finally {
        setLoading(false);
      }
    }
    run();
  }, []);

  async function openDocument(id: string) {
    setActionError(null);
    setOpeningId(id);
    try {
      const access = await apiGet<AccessResponse>(`/documents/${id}/access`);
      if (!access.url) {
        throw new Error('Access URL was not returned');
      }

      if (access.requiresAuth || access.provider === 'local') {
        const blob = await apiGetBlob(access.url);
        const objectUrl = URL.createObjectURL(blob);
        window.open(objectUrl, '_blank', 'noopener,noreferrer');
        window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
        return;
      }

      window.open(access.url, '_blank', 'noopener,noreferrer');
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Failed to open document');
    } finally {
      setOpeningId(null);
    }
  }

  return (
    <AppShell
      title="Documents"
      subtitle="Uploaded files linked to cases"
      actions={
        <div className="flex items-center gap-2">
          <a className="app-btn-primary h-10 px-4" href="/documents/upload">
            Upload document
          </a>
          <a className="app-btn-muted" href="/cases">
            Cases
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

      {actionError ? (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {actionError}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        <table className="w-full table-auto">
          <thead className="bg-zinc-50 text-left text-sm text-zinc-600">
            <tr>
              <th className="px-4 py-3 font-medium">Filename</th>
              <th className="px-4 py-3 font-medium">Case</th>
              <th className="px-4 py-3 font-medium">Provider</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {documents.length === 0 ? (
              <tr>
                <td className="px-4 py-3 text-zinc-600" colSpan={5}>
                  No documents yet.
                </td>
              </tr>
            ) : (
              documents.map((doc) => (
                <tr key={doc.id} className="border-t border-zinc-200">
                  <td className="px-4 py-3 font-medium">{doc.filename}</td>
                  <td className="px-4 py-3 text-zinc-700">{doc.case?.title ?? '—'}</td>
                  <td className="px-4 py-3 text-zinc-700">{doc.provider}</td>
                  <td className="px-4 py-3 text-zinc-700">
                    {new Date(doc.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      className="app-btn-muted h-9 px-3"
                      disabled={openingId === doc.id}
                      onClick={() => openDocument(doc.id)}
                    >
                      {openingId === doc.id ? 'Opening…' : 'Open'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
