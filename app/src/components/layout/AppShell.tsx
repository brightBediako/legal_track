'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import type { ReactNode, SVGProps } from 'react';
import { useAuthStore } from '../../store/auth.store';
import { apiGet, apiLogout } from '../../lib/api';

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
  { href: '/settings', label: 'Settings', icon: SettingsIcon, adminOnly: true },
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

function SettingsIcon(props: Readonly<IconProps>) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <circle cx="10" cy="10" r="2.75" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M10 2.75v1.5M10 15.75v1.5M2.75 10h1.5M15.75 10h1.5M4.6 4.6l1.06 1.06M14.34 14.34l1.06 1.06M4.6 15.4l1.06-1.06M14.34 5.66l1.06-1.06"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
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

type AppShellProps = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
};

function NavLink({
  item,
  active,
  unreadCount,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  unreadCount: number;
  onNavigate?: () => void;
}) {
  const showBadge = item.href === '/notifications' && unreadCount > 0;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={`group flex items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
        active
          ? 'bg-white/10 text-white shadow-sm ring-1 ring-white/10'
          : 'text-slate-300 hover:bg-white/5 hover:text-white'
      }`}
    >
      <item.icon className={`mr-2.5 size-4 shrink-0 ${active ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`} />
      <span className="flex-1">{item.label}</span>
      {showBadge ? (
        <span className="ml-2 rounded-full bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-900">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      ) : null}
    </Link>
  );
}

export function AppShell({ title, subtitle, actions, children }: Readonly<AppShellProps>) {
  const pathname = usePathname();
  const router = useRouter();
  const hydrate = useAuthStore((s) => s.hydrateFromStorage);
  const hydrated = useAuthStore((s) => s.hydrated);
  const accessToken = useAuthStore((s) => s.accessToken);
  const authUser = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);
  const [menuOpen, setMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [signingOut, setSigningOut] = useState(false);
  const isAdmin = authUser?.role === 'admin';
  const isClient = authUser?.role === 'client';
  const mustChangePassword = Boolean(authUser?.mustChangePassword);
  const isAuthenticated = Boolean(accessToken && authUser);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!hydrated) return;
    if (isAuthenticated) return;
    const next = encodeURIComponent(pathname || '/dashboard');
    router.replace(`/login?next=${next}`);
  }, [hydrated, isAuthenticated, pathname, router]);

  useEffect(() => {
    if (!mustChangePassword) return;
    if (pathname === '/account') return;
    router.replace('/account');
  }, [mustChangePassword, pathname, router]);

  useEffect(() => {
    if (!authUser || mustChangePassword) {
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
  }, [authUser?.id, pathname, mustChangePassword]);

  async function onSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await apiLogout();
    } finally {
      clear();
      router.replace('/login');
      setSigningOut(false);
    }
  }

  const navItems = useMemo(
    () =>
      baseNavItems.filter((item) => {
        if (item.adminOnly && !isAdmin) return false;
        if (item.staffOnly && isClient) return false;
        return true;
      }),
    [isAdmin, isClient],
  );

  if (!hydrated || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--app-bg)] text-sm text-slate-600">
        {hydrated ? 'Redirecting to sign in…' : 'Loading…'}
      </div>
    );
  }

  const sidebarBrand = (
    <div className="border-b border-white/10 px-5 py-5">
      <p className="text-[11px] font-semibold tracking-[0.2em] text-slate-400 uppercase">LegalTrack</p>
      <p className="mt-1 text-sm font-semibold text-white">Operations</p>
    </div>
  );

  const sidebarUser = (
    <div className="border-t border-white/10 p-4">
      <div className="rounded-xl bg-white/5 px-3 py-3 ring-1 ring-white/10">
        <p className="truncate text-sm font-medium text-white">{authUser?.email}</p>
        <p className="mt-0.5 text-xs capitalize text-slate-400">{authUser?.role}</p>
      </div>
    </div>
  );

  const headerActions = (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {actions}
      <button type="button" onClick={onSignOut} disabled={signingOut} className="app-btn-muted">
        {signingOut ? 'Signing out…' : 'Sign out'}
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-slate-900">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 bg-[var(--app-sidebar)] lg:block">
        <div className="flex h-full flex-col">
          {sidebarBrand}
          <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Sidebar Navigation">
            <ul className="space-y-1">
              {navItems.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <li key={item.href}>
                    <NavLink item={item} active={active} unreadCount={unreadCount} />
                  </li>
                );
              })}
            </ul>
          </nav>
          {sidebarUser}
        </div>
      </aside>

      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/80 backdrop-blur-md lg:ml-64">
        <div className="mx-auto flex w-full max-w-7xl items-start justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex min-w-0 items-start gap-3">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="app-btn-muted mt-0.5 px-3 lg:hidden"
              aria-label="Toggle sidebar navigation"
              aria-expanded={menuOpen}
              aria-controls="mobile-sidebar"
            >
              <svg viewBox="0 0 20 20" className="size-4" fill="none" aria-hidden="true">
                <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.6" />
              </svg>
            </button>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-semibold tracking-tight text-slate-900">{title}</h1>
              {subtitle ? <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p> : null}
            </div>
          </div>
          {headerActions}
        </div>
      </header>

      {menuOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 h-full w-full bg-slate-950/50 backdrop-blur-[2px]"
            onClick={() => setMenuOpen(false)}
            aria-label="Close sidebar navigation"
          />
          <nav
            id="mobile-sidebar"
            className="relative z-10 flex h-full w-72 flex-col bg-[var(--app-sidebar)]"
            aria-label="Mobile Sidebar Navigation"
          >
            {sidebarBrand}
            <ul className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
              {navItems.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <li key={item.href}>
                    <NavLink
                      item={item}
                      active={active}
                      unreadCount={unreadCount}
                      onNavigate={() => setMenuOpen(false)}
                    />
                  </li>
                );
              })}
            </ul>
            {sidebarUser}
          </nav>
        </div>
      ) : null}

      <main className="lg:ml-64">
        <div className="app-page-enter mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8">{children}</div>
      </main>
    </div>
  );
}
