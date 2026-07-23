import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <main className="w-full max-w-xl rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-medium text-zinc-500">LegalTrack</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900">Operations App</h1>
        <p className="mt-3 text-sm leading-7 text-zinc-600">
          Access client management, case workflows, and document uploads from a single workspace.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link href="/login" className="app-btn-primary">
            Sign in
          </Link>
          <Link href="/dashboard" className="app-btn-muted">
            Open dashboard
          </Link>
        </div>
      </main>
    </div>
  );
}
