'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AppShell } from '../../../components/layout/AppShell';
import { DOCUMENT_CATEGORIES } from '../../../lib/document-categories';
import { apiGet, apiUpload } from '../../../lib/api';
import { useAuthStore } from '../../../store/auth.store';

type CaseItem = {
  id: string;
  title: string;
};

type DocumentResponse = {
  id: string;
  filename: string;
  provider: string;
  caseId?: string | null;
  category: string;
  version: number;
};

type Provider = 'local' | 'cloudinary' | 's3';

const ALLOWED_EXTENSIONS = [
  'png',
  'jpeg',
  'jpg',
  'docx',
  'doc',
  'pdf',
  'mp3',
  'mp4',
] as const;

const ALLOWED_ACCEPT = '.png,.jpeg,.jpg,.docx,.doc,.pdf,.mp3,.mp4';

function getExtension(filename: string): string {
  const parts = filename.toLowerCase().split('.');
  return parts.length > 1 ? (parts.pop() ?? '') : '';
}

function isAllowedFile(filename: string): boolean {
  const ext = getExtension(filename);
  return (ALLOWED_EXTENSIONS as readonly string[]).includes(ext);
}

export default function UploadDocumentPage() {
  const hydrate = useAuthStore((s) => s.hydrateFromStorage);
  const user = useAuthStore((s) => s.user);
  const isClient = user?.role === 'client';
  const searchParams = useSearchParams();
  const initialCaseId = searchParams.get('caseId') ?? '';
  const replacesDocumentId = searchParams.get('replacesDocumentId') ?? '';

  const [cases, setCases] = useState<CaseItem[]>([]);
  const [loadingCases, setLoadingCases] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [provider, setProvider] = useState<Provider>('local');
  const [caseId, setCaseId] = useState(initialCaseId);
  const [category, setCategory] = useState('other');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<DocumentResponse | null>(null);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    setCaseId(initialCaseId);
  }, [initialCaseId]);

  useEffect(() => {
    async function loadCases() {
      try {
        const data = await apiGet<CaseItem[]>('/cases');
        setCases(data);
      } catch {
        setCases([]);
      } finally {
        setLoadingCases(false);
      }
    }
    loadCases();
  }, []);

  useEffect(() => {
    if (!replacesDocumentId) return;
    async function loadPrevious() {
      try {
        const versions = await apiGet<DocumentResponse[]>(
          `/documents/${replacesDocumentId}/versions`,
        );
        const current = versions.find((d) => d.id === replacesDocumentId) ?? versions[0];
        if (current?.category) setCategory(current.category);
        if (current?.caseId) setCaseId(current.caseId);
      } catch {
        // keep defaults
      }
    }
    loadPrevious();
  }, [replacesDocumentId]);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    setSuccess(null);
    const next = e.target.files?.[0] ?? null;
    if (next && !isAllowedFile(next.name)) {
      setFile(null);
      e.target.value = '';
      setError(`Unsupported file type. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`);
      return;
    }
    setFile(next);
  }

  async function onSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!file) {
      setError('Please choose a file to upload.');
      return;
    }

    if (!isAllowedFile(file.name)) {
      setError(`Unsupported file type. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`);
      return;
    }

    if (isClient && !caseId && !replacesDocumentId) {
      setError('Please select one of your cases for this upload.');
      return;
    }

    try {
      setSubmitting(true);

      const form = new FormData();
      form.append('file', file);
      form.append('provider', provider);
      form.append('category', category);
      if (caseId) form.append('caseId', caseId);
      if (replacesDocumentId) form.append('replacesDocumentId', replacesDocumentId);

      const data = await apiUpload<DocumentResponse>('/documents/upload', form);
      setSuccess(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell
      title={replacesDocumentId ? 'Upload new version' : 'Upload document'}
      subtitle="Local upload for testing (Cloudinary/S3 optional)"
      actions={
        <div className="flex items-center gap-2">
          <a className="app-btn-muted" href="/documents">
            Documents
          </a>
          <a className="app-btn-muted" href="/cases">
            Cases
          </a>
          <a className="app-btn-muted" href="/dashboard">
            Dashboard
          </a>
        </div>
      }
    >
      <form
        onSubmit={onSubmit}
        className="flex max-w-xl flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm"
      >
        {replacesDocumentId ? (
          <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
            Creating a new version of document <span className="font-medium">{replacesDocumentId}</span>.
          </p>
        ) : null}

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">File</span>
          <input
            type="file"
            name="file"
            accept={ALLOWED_ACCEPT}
            onChange={onFileChange}
            className="text-sm"
            required
          />
          <span className="text-xs text-zinc-500">
            Allowed: png, jpeg, jpg, docx, doc, pdf, mp3, mp4
          </span>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">Category</span>
          <select
            className="app-select"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            disabled={Boolean(replacesDocumentId)}
          >
            {DOCUMENT_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">Provider</span>
          <select
            name="provider"
            value={provider}
            onChange={(e) => setProvider(e.target.value as Provider)}
            className="app-select"
          >
            <option value="local">Local (/upload)</option>
            <option value="cloudinary">Cloudinary</option>
            <option value="s3">S3</option>
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">{isClient ? 'Case' : 'Case (optional)'}</span>
          <select
            name="caseId"
            value={caseId}
            onChange={(e) => setCaseId(e.target.value)}
            className="app-select"
            disabled={loadingCases || Boolean(replacesDocumentId)}
            required={isClient && !replacesDocumentId}
          >
            <option value="">{isClient ? 'Select a case' : 'No case'}</option>
            {cases.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
          {isClient ? (
            <span className="text-xs text-zinc-500">Uploads must be attached to one of your cases.</span>
          ) : null}
        </label>

        {error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        {success ? (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            Uploaded <span className="font-medium">{success.filename}</span> as{' '}
            <span className="font-medium">v{success.version}</span> ({success.category}).
          </p>
        ) : null}

        <button type="submit" disabled={submitting} className="app-btn-primary mt-2">
          {submitting ? 'Uploading…' : replacesDocumentId ? 'Upload new version' : 'Upload document'}
        </button>
      </form>
    </AppShell>
  );
}
