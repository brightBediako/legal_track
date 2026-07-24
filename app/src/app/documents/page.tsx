'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AppShell } from '../../components/layout/AppShell';
import { DOCUMENT_CATEGORIES, documentCategoryLabel } from '../../lib/document-categories';
import { apiGet, apiGetBlob } from '../../lib/api';
import { useAuthStore } from '../../store/auth.store';

type DocumentItem = {
  id: string;
  filename: string;
  provider: string;
  caseId?: string | null;
  category: string;
  version: number;
  isLatest: boolean;
  createdAt: string;
  case?: { id: string; title: string } | null;
};

type CaseOption = { id: string; title: string };

type AccessResponse = {
  url: string;
  provider?: string;
  requiresAuth?: boolean;
  expiresInSeconds?: number;
};

export default function DocumentsPage() {
  const hydrate = useAuthStore((s) => s.hydrateFromStorage);
  const searchParams = useSearchParams();
  const initialCaseId = searchParams.get('caseId') ?? '';
  const initialCategory = searchParams.get('category') ?? '';

  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [cases, setCases] = useState<CaseOption[]>([]);
  const [caseId, setCaseId] = useState(initialCaseId);
  const [category, setCategory] = useState(initialCategory);
  const [showAllVersions, setShowAllVersions] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    setCaseId(initialCaseId);
    setCategory(initialCategory);
  }, [initialCaseId, initialCategory]);

  useEffect(() => {
    async function loadCases() {
      try {
        const data = await apiGet<CaseOption[]>('/cases');
        setCases(data);
      } catch {
        setCases([]);
      }
    }
    loadCases();
  }, []);

  useEffect(() => {
    async function run() {
      try {
        setLoading(true);
        setError(null);
        const params = new URLSearchParams();
        if (caseId) params.set('caseId', caseId);
        if (category) params.set('category', category);
        if (showAllVersions) params.set('latestOnly', '0');
        const qs = params.toString();
        const data = await apiGet<DocumentItem[]>(`/documents${qs ? `?${qs}` : ''}`);
        setDocuments(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load documents');
      } finally {
        setLoading(false);
      }
    }
    const timer = window.setTimeout(run, 150);
    return () => window.clearTimeout(timer);
  }, [caseId, category, showAllVersions]);

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

  const uploadHref = caseId
    ? `/documents/upload?caseId=${encodeURIComponent(caseId)}`
    : '/documents/upload';

  return (
    <AppShell
      title="Documents"
      subtitle={caseId ? 'Filtered by case' : 'Uploaded files linked to cases'}
      actions={
        <div className="flex items-center gap-2">
          <a className="app-btn-primary h-10 px-4" href={uploadHref}>
            Upload document
          </a>
          <a className="app-btn-muted" href="/cases">
            Cases
          </a>
        </div>
      }
    >
      <div className="mb-4 grid max-w-4xl gap-4 sm:grid-cols-3">
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">Case</span>
          <select className="app-select" value={caseId} onChange={(e) => setCaseId(e.target.value)}>
            <option value="">All cases</option>
            {cases.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">Category</span>
          <select
            className="app-select"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">All categories</option>
            {DOCUMENT_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-end gap-2 pb-2">
          <input
            type="checkbox"
            checked={showAllVersions}
            onChange={(e) => setShowAllVersions(e.target.checked)}
          />
          <span className="text-sm font-medium">Show all versions</span>
        </label>
      </div>

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
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Version</th>
              <th className="px-4 py-3 font-medium">Case</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {!loading && documents.length === 0 ? (
              <tr>
                <td className="px-4 py-3 text-zinc-600" colSpan={6}>
                  No documents yet.
                </td>
              </tr>
            ) : (
              documents.map((doc) => (
                <tr key={doc.id} className="border-t border-zinc-200">
                  <td className="px-4 py-3 font-medium">{doc.filename}</td>
                  <td className="px-4 py-3 text-zinc-700">{documentCategoryLabel(doc.category)}</td>
                  <td className="px-4 py-3 text-zinc-700">
                    v{doc.version}
                    {!doc.isLatest ? (
                      <span className="ml-1 text-xs text-zinc-500">(old)</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-zinc-700">
                    {doc.case ? (
                      <a
                        href={`/cases/${doc.case.id}`}
                        className="underline-offset-2 hover:underline"
                      >
                        {doc.case.title}
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-3 text-zinc-700">
                    {new Date(doc.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="app-btn-muted h-9 px-3"
                        disabled={openingId === doc.id}
                        onClick={() => openDocument(doc.id)}
                      >
                        {openingId === doc.id ? 'Opening…' : 'Open'}
                      </button>
                      <a
                        className="app-btn-muted h-9 px-3 inline-flex items-center"
                        href={`/documents/upload?replacesDocumentId=${encodeURIComponent(doc.id)}${
                          doc.caseId ? `&caseId=${encodeURIComponent(doc.caseId)}` : ''
                        }`}
                      >
                        New version
                      </a>
                    </div>
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
