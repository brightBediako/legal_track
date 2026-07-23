'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import type { ReactNode, SVGProps } from 'react';
import { useAuthStore } from '../../store/auth.store';
import { apiGet } from '../../lib/api';

type NavItem = {
  href: string;
  label: string;
  icon: (props: Readonly<IconProps>) => ReactNode;
  adminOnly?: boolean;
  staffOnly?: boolean;
};

const baseNavItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: DashboardIcon },
  { href: '/clients', label: 'Clients', icon: ClientsIcon, staffOnly: true },
  { href: '/cases', label: 'Cases', icon: CasesIcon },
  { href: '/appointments', label: 'Appointments', icon: AppointmentsIcon },
  { href: '/documents', label: 'Documents', icon: DocumentsIcon },
  { href: '/notifications', label: 'Notifications', icon: NotificationsIcon },
  { href: '/users', label: 'Users', icon: UsersIcon, adminOnly: true },
  { href: '/audit', label: 'Audit', icon: AuditIcon, adminOnly: true },
  { href: '/account', label: 'Account', icon: AccountIcon },
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

function AppointmentsIcon(props: Readonly<IconProps>) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <rect x="3.5" y="4.5" width="13" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 3v3M13 3v3M3.5 8.5h13" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function NotificationsIcon(props: Readonly<IconProps>) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <path
        d="M10 2.75a4.25 4.25 0 0 0-4.25 4.25v2.1c0 .5-.2.98-.55 1.33L4 11.63V13h12v-1.37l-1.2-1.2a1.88 1.88 0 0 1-.55-1.33v-2.1A4.25 4.25 0 0 0 10 2.75Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path d="M8.25 15.25a1.75 1.75 0 0 0 3.5 0" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function UsersIcon(props: Readonly<IconProps>) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <circle cx="10" cy="6.5" r="2.75" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4 16.25a6 6 0 0 1 12 0" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function AuditIcon(props: Readonly<IconProps>) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <path d="M4.5 3.75h11v12.5h-11V3.75Z" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 7h6M7 10h6M7 13h3.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function AccountIcon(props: Readonly<IconProps>) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <circle cx="10" cy="10" r="7.25" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 6.5v4l2.5 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

const breadcrumbLabels: Record<string, string> = {
  dashboard: 'Dashboard',
  clients: 'Clients',
  cases: 'Cases',
  appointments: 'Appointments',
  documents: 'Documents',
  notifications: 'Notifications',
  users: 'Users',
  audit: 'Audit',
  account: 'Account',
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
  const hydrate = useAuthStore((s) => s.hydrateFromStorage);
  const authUser = useAuthStore((s) => s.user);
  const [menuOpen, setMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const segments = pathname.split('/').filter(Boolean);
  const firstSegment = segments.find(() => true) ?? 'dashboard';
  const isAdmin = authUser?.role === 'admin';
  const isClient = authUser?.role === 'client';

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!authUser) {
      setUnreadCount(0);
      return;
    }

    let cancelled = false;

    async function refreshUnread() {
      try {
        const data = await apiGet<{ count: number }>('/notifications/unread-count');
        if (!cancelled) setUnreadCount(data.count);
      } catch {
        if (!cancelled) setUnreadCount(0);
      }
    }

    refreshUnread();
    const timer = window.setInterval(refreshUnread, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [authUser?.id, pathname]);

  const navItems = useMemo(
    () =>
      baseNavItems.filter((item) => {
        if (item.adminOnly && !isAdmin) return false;
        if (item.staffOnly && isClient) return false;
        return true;
      }),
    [isAdmin, isClient],
  );

  let pageIcon = <DashboardIcon className="size-4" />;
  if (firstSegment === 'clients') {
    pageIcon = <ClientsIcon className="size-4" />;
  } else if (firstSegment === 'cases') {
    pageIcon = <CasesIcon className="size-4" />;
  } else if (firstSegment === 'appointments') {
    pageIcon = <AppointmentsIcon className="size-4" />;
  } else if (firstSegment === 'documents') {
    pageIcon = <DocumentsIcon className="size-4" />;
  } else if (firstSegment === 'notifications') {
    pageIcon = <NotificationsIcon className="size-4" />;
  } else if (firstSegment === 'users') {
    pageIcon = <UsersIcon className="size-4" />;
  } else if (firstSegment === 'audit') {
    pageIcon = <AuditIcon className="size-4" />;
  } else if (firstSegment === 'account') {
    pageIcon = <AccountIcon className="size-4" />;
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
                const showBadge = item.href === '/notifications' && unreadCount > 0;
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
                      <span className="flex-1">{item.label}</span>
                      {showBadge ? (
                        <span
                          className={`ml-2 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                            active ? 'bg-white text-zinc-900' : 'bg-zinc-900 text-white'
                          }`}
                        >
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                      ) : null}
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
                const showBadge = item.href === '/notifications' && unreadCount > 0;
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
                      <span className="flex-1">{item.label}</span>
                      {showBadge ? (
                        <span
                          className={`ml-2 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                            active ? 'bg-white text-zinc-900' : 'bg-zinc-900 text-white'
                          }`}
                        >
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                      ) : null}
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
