'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '../../../components/layout/AppShell';
import { apiGet, apiUpload } from '../../../lib/api';
import { useAuthStore } from '../../../store/auth.store';

type CaseItem = {
  id: string;
  title: string;
};

type DocumentResponse = {
  id: string;
  filename: string;
  url: string;
  provider: string;
  caseId?: string | null;
};

export default function UploadDocumentPage() {
  const hydrate = useAuthStore((s) => s.hydrateFromStorage);
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [loadingCases, setLoadingCases] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [provider, setProvider] = useState<'cloudinary' | 's3'>('cloudinary');
  const [caseId, setCaseId] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<DocumentResponse | null>(null);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

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

  async function onSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!file) {
      setError('Please choose a file to upload.');
      return;
    }

    try {
      setSubmitting(true);

      const form = new FormData();
      form.append('file', file);
      form.append('provider', provider);
      if (caseId) form.append('caseId', caseId);

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
      title="Upload document"
      subtitle="Store files using configured providers"
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
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">File</span>
          <input
            type="file"
            name="file"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="text-sm"
            required
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">Provider</span>
          <select
            name="provider"
            value={provider}
            onChange={(e) => setProvider(e.target.value as 'cloudinary' | 's3')}
            className="app-select"
          >
            <option value="cloudinary">Cloudinary</option>
            <option value="s3">S3</option>
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">Case (optional)</span>
          <select
            name="caseId"
            value={caseId}
            onChange={(e) => setCaseId(e.target.value)}
            className="app-select"
            disabled={loadingCases}
          >
            <option value="">No case</option>
            {cases.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </label>

        {error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        {success ? (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            Uploaded <span className="font-medium">{success.filename}</span> via{' '}
            <span className="font-medium">{success.provider}</span>.
          </p>
        ) : null}

        <button type="submit" disabled={submitting} className="app-btn-primary mt-2">
          {submitting ? 'Uploading…' : 'Upload document'}
        </button>
      </form>
    </AppShell>
  );
}
