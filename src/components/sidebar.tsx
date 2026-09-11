'use client';

import { ReactNode, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  CalendarDays,
  ListChecks,
  LogOut,
  MessageSquare,
  Shield,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { logout } from '@/app/auth/actions';
import { getUnreadMessageCount } from '@/app/dashboard/messages/actions';
import { Toaster } from '@/components/ui/sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { UserAvatar } from '@/components/user-avatar';
import { User } from '@/types/task';
import { cn } from '@/lib/utils';

interface DashboardLayoutProps {
  children: ReactNode;
  user: User;
}

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  match: (pathname: string) => boolean;
  badge?: number;
}

/**
 * Page titles live here rather than in each route, so the shell renders exactly
 * one <h1>. Several pages used to print their own heading directly under the
 * one the layout had already drawn.
 */
const PAGE_META: { match: (p: string) => boolean; title: string; subtitle: string }[] = [
  {
    match: (p) => p === '/dashboard/admin' || p.startsWith('/dashboard/admin/'),
    title: 'Admin',
    subtitle: 'Every task in the school, plus staff and role management.',
  },
  {
    match: (p) => p === '/dashboard/calendar',
    title: 'Calendar',
    subtitle: 'Due dates and recurring work, month by month.',
  },
  {
    match: (p) => p.startsWith('/dashboard/messages'),
    title: 'Messages',
    subtitle: 'Direct notes, group threads and staff broadcasts.',
  },
  {
    match: (p) => p === '/dashboard',
    title: 'My Tasks',
    subtitle: 'Everything currently assigned to you.',
  },
];

function NavBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground tabular-nums">
      {count > 99 ? '99+' : count}
    </span>
  );
}

function Brand({ className }: { className?: string }) {
  return (
    <Link
      href="/dashboard"
      className={cn(
        'flex items-center gap-3 rounded-lg outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30',
        className
      )}
    >
      <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-sm font-extrabold tracking-tight text-primary-foreground shadow-sm">
        OD
      </span>
      <span className="leading-tight">
        <span className="block text-[0.95rem] font-bold tracking-tight text-foreground">
          Ohr Devora
        </span>
        <span className="block text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Staff Portal
        </span>
      </span>
    </Link>
  );
}

export default function DashboardLayout({ children, user }: DashboardLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);

  const isAdmin = user.role === 'admin';

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      const result = await getUnreadMessageCount();
      if (!cancelled && 'count' in result) setUnreadCount(result.count);
    }

    poll();
    const interval = setInterval(poll, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  async function handleLogout() {
    await logout();
    router.push('/auth/login');
  }

  const navItems: NavItem[] = [
    {
      label: 'Tasks',
      href: '/dashboard',
      icon: ListChecks,
      match: (p) => p === '/dashboard',
    },
    {
      label: 'Calendar',
      href: '/dashboard/calendar',
      icon: CalendarDays,
      match: (p) => p === '/dashboard/calendar',
    },
    {
      label: 'Messages',
      href: '/dashboard/messages',
      icon: MessageSquare,
      match: (p) => p.startsWith('/dashboard/messages'),
      badge: unreadCount,
    },
  ];

  // Admin used to be desktop-only, which left admins on a phone with no way
  // into the panel at all.
  if (isAdmin) {
    navItems.push({
      label: 'Admin',
      href: '/dashboard/admin',
      icon: Shield,
      match: (p) => p.startsWith('/dashboard/admin'),
    });
  }

  const meta =
    PAGE_META.find((m) => m.match(pathname)) ?? {
      title: 'Dashboard',
      subtitle: 'Ohr Devora staff coordination.',
    };

  return (
    <div className="min-h-svh bg-background">
      <Toaster richColors position="top-center" />

      {/* ---------------- Desktop rail ---------------- */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-border bg-card lg:flex">
        <div className="px-5 py-5">
          <Brand />
        </div>

        <nav className="flex-1 space-y-1 px-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = item.match(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors',
                  active
                    ? 'bg-secondary-soft text-secondary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <span
                  className={cn(
                    'absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-secondary transition-opacity',
                    active ? 'opacity-100' : 'opacity-0'
                  )}
                />
                <Icon size={18} className="shrink-0" />
                {item.label}
                <NavBadge count={item.badge ?? 0} />
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border p-3">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors outline-none hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/30"
                />
              }
            >
              <UserAvatar name={user.name} size="md" />
              <span className="min-w-0 flex-1 leading-tight">
                <span className="block truncate text-sm font-semibold text-foreground">
                  {user.name}
                </span>
                <span className="block text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                  {isAdmin ? 'Administrator' : 'Staff'}
                </span>
              </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="top" className="w-56">
              <DropdownMenuLabel className="truncate">{user.email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={handleLogout}>
                <LogOut size={15} />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* ---------------- Content column ---------------- */}
      <div className="flex min-h-svh flex-col lg:pl-64">
        {/* Mobile top bar */}
        <div className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border bg-card/90 px-4 py-3 backdrop-blur lg:hidden">
          <Brand />
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  aria-label="Account menu"
                  className="rounded-full outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30"
                />
              }
            >
              <UserAvatar name={user.name} size="md" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="truncate">
                {user.name} · {isAdmin ? 'Admin' : 'Staff'}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={handleLogout}>
                <LogOut size={15} />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Page heading */}
        <header className="border-b border-border bg-card px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
          <div className="mx-auto w-full max-w-7xl">
            <h1 className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
              {meta.title}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">{meta.subtitle}</p>
          </div>
        </header>

        <main className="flex-1 px-4 pb-24 pt-5 sm:px-6 lg:px-8 lg:pb-10 lg:pt-6">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>

      {/* ---------------- Mobile tab bar ---------------- */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 grid border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
        style={{ gridTemplateColumns: `repeat(${navItems.length}, minmax(0, 1fr))` }}
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = item.match(pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'relative flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-semibold transition-colors',
                active ? 'text-secondary' : 'text-muted-foreground'
              )}
            >
              <span
                className={cn(
                  'absolute inset-x-4 top-0 h-0.5 rounded-full bg-secondary transition-opacity',
                  active ? 'opacity-100' : 'opacity-0'
                )}
              />
              <span className="relative">
                <Icon size={19} />
                {item.badge != null && item.badge > 0 && (
                  <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground tabular-nums">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
