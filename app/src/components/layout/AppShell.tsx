'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import type { ReactNode, SVGProps } from 'react';

type NavItem = {
  href: string;
  label: string;
  icon: (props: Readonly<IconProps>) => ReactNode;
};

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: DashboardIcon },
  { href: '/clients', label: 'Clients', icon: ClientsIcon },
  { href: '/cases', label: 'Cases', icon: CasesIcon },
  { href: '/documents', label: 'Documents', icon: DocumentsIcon },
];

type IconProps = SVGProps<SVGSVGElement>;

function DashboardIcon(props: Readonly<IconProps>) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <path d="M3 3h6v6H3V3Zm8 0h6v4h-6V3ZM3 11h6v6H3v-6Zm8-2h6v8h-6V9Z" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function ClientsIcon(props: Readonly<IconProps>) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <circle cx="7" cy="7" r="3" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="14" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M2.5 16a4.5 4.5 0 0 1 9 0M11 16a3.5 3.5 0 0 1 7 0" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function CasesIcon(props: Readonly<IconProps>) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <rect x="3" y="3" width="14" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6.5 7.5h7M6.5 10h7M6.5 12.5h4" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function DocumentsIcon(props: Readonly<IconProps>) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <path d="M6 2.75h6.5L17 7.25V17a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 17V4.25A1.5 1.5 0 0 1 6 2.75Z" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12.5 2.75V7.5H17M10 10v5m0 0-2-2m2 2 2-2" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

const breadcrumbLabels: Record<string, string> = {
  dashboard: 'Dashboard',
  clients: 'Clients',
  cases: 'Cases',
  documents: 'Documents',
  upload: 'Upload',
  new: 'New',
  login: 'Login',
};

type AppShellProps = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
};

export function AppShell({ title, subtitle, actions, children }: Readonly<AppShellProps>) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const segments = pathname.split('/').filter(Boolean);
  const firstSegment = segments.find(() => true) ?? 'dashboard';

  let pageIcon = <DashboardIcon className="size-4" />;
  if (firstSegment === 'clients') {
    pageIcon = <ClientsIcon className="size-4" />;
  } else if (firstSegment === 'cases') {
    pageIcon = <CasesIcon className="size-4" />;
  } else if (firstSegment === 'documents') {
    pageIcon = <DocumentsIcon className="size-4" />;
  }

  const crumbs = segments.map((segment, idx, arr) => ({
      href: `/${arr.slice(0, idx + 1).join('/')}`,
      label: breadcrumbLabels[segment] ?? segment.replaceAll('-', ' '),
      isLast: idx === arr.length - 1,
    }));

  return (
    <div className="min-h-screen bg-slate-50 text-zinc-900">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-zinc-200 bg-white lg:block">
        <div className="flex h-full flex-col">
          <div className="border-b border-zinc-200 px-5 py-5">
            <p className="text-sm font-semibold text-zinc-900">LegalTrack</p>
            <p className="mt-1 text-xs text-zinc-500">Operations Dashboard</p>
          </div>
          <nav className="flex-1 px-3 py-4" aria-label="Sidebar Navigation">
            <ul className="space-y-1.5">
              {navItems.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`flex items-center rounded-lg px-3 py-2 text-sm transition-colors ${
                        active
                          ? 'bg-zinc-900 text-white'
                          : 'text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900'
                      }`}
                    >
                      <item.icon className="mr-2.5 size-4 shrink-0" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </aside>

      <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/95 backdrop-blur lg:ml-64">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="app-btn-muted px-3 lg:hidden"
              aria-label="Toggle sidebar navigation"
              aria-expanded={menuOpen}
              aria-controls="mobile-sidebar"
            >
              <svg viewBox="0 0 20 20" className="size-4" fill="none" aria-hidden="true">
                <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.6" />
              </svg>
            </button>
            <div>
              <div className="mb-0.5 flex items-center gap-1.5 text-xs text-zinc-500">
                <span className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[11px] font-medium text-zinc-600">
                  {pageIcon}
                  Module
                </span>
                {crumbs.length > 0 ? (
                  <nav aria-label="Breadcrumb">
                    <ol className="flex items-center gap-1">
                      {crumbs.map((crumb) => (
                        <li key={crumb.href} className="flex items-center gap-1">
                          {crumb.isLast ? (
                            <span className="font-medium text-zinc-700">{crumb.label}</span>
                          ) : (
                            <Link href={crumb.href} className="hover:text-zinc-700">
                              {crumb.label}
                            </Link>
                          )}
                          {crumb.isLast ? null : <span aria-hidden="true">/</span>}
                        </li>
                      ))}
                    </ol>
                  </nav>
                ) : null}
              </div>
              <h1 className="text-lg font-semibold tracking-tight text-zinc-900">{title}</h1>
              {subtitle ? <p className="text-xs text-zinc-500">{subtitle}</p> : null}
            </div>
          </div>
          <div className="flex items-center gap-2">{actions}</div>
        </div>
      </header>

      {menuOpen ? (
        <div className="fixed inset-0 z-20 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 h-full w-full bg-black/30"
            onClick={() => setMenuOpen(false)}
            aria-label="Close sidebar navigation"
          />
          <nav
            id="mobile-sidebar"
            className="relative z-10 h-full w-64 border-r border-zinc-200 bg-white p-4"
            aria-label="Mobile Sidebar Navigation"
          >
            <p className="mb-4 text-sm font-semibold text-zinc-900">Navigation</p>
            <ul className="space-y-1.5">
              {navItems.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setMenuOpen(false)}
                      className={`flex items-center rounded-lg px-3 py-2 text-sm transition-colors ${
                        active
                          ? 'bg-zinc-900 text-white'
                          : 'text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900'
                      }`}
                    >
                      <item.icon className="mr-2.5 size-4 shrink-0" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      ) : null}

      <main className="lg:ml-64">
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">{children}</div>
      </main>
    </div>
  );
}

