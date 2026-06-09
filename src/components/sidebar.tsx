'use client';

import { ReactNode, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { CalendarDays, ListChecks, LogOut, MessageSquare, Shield } from 'lucide-react';
import { logout } from '@/app/auth/actions';
import { getUnreadMessageCount } from '@/app/dashboard/messages/actions';
import { Toaster } from '@/components/ui/sonner';
import { User } from '@/types/task';

interface DashboardLayoutProps {
  children: ReactNode;
  user: User;
}

export default function DashboardLayout({ children, user }: DashboardLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);

  const isAdmin = user.role === 'admin';

  useEffect(() => {
    async function poll() {
      const result = await getUnreadMessageCount();
      if ('count' in result) setUnreadCount(result.count);
    }

    poll();
    const interval = setInterval(poll, 30000);
    return () => clearInterval(interval);
  }, []);

  async function handleLogout() {
    await logout();
    router.push('/auth/login');
  }

  const navItems = [
    {
      label: 'Tasks',
      href: '/dashboard',
      icon: ListChecks,
      active: pathname === '/dashboard',
      color: 'red',
    },
    {
      label: 'Calendar',
      href: '/dashboard/calendar',
      icon: CalendarDays,
      active: pathname === '/dashboard/calendar',
      color: 'blue',
    },
    {
      label: 'Messages',
      href: '/dashboard/messages',
      icon: MessageSquare,
      active: pathname.startsWith('/dashboard/messages'),
      badge: unreadCount,
      color: 'cyan',
    },
  ];

  const pageTitle = pathname === '/dashboard/admin'
    ? 'Admin'
    : pathname === '/dashboard/calendar'
      ? 'Calendar'
      : pathname.startsWith('/dashboard/messages')
        ? 'Messages'
        : 'Tasks';

  return (
    <div className="min-h-screen bg-background">
      <Toaster richColors position="top-center" />

      <header className="sticky top-0 z-40 border-b-4 border-secondary bg-background">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 lg:px-6">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-base font-extrabold text-primary-foreground">
              OD
            </div>
            <div className="leading-tight">
              <p className="text-lg font-extrabold tracking-tight text-foreground">Ohr Devora</p>
              <p className="text-xs font-bold uppercase tracking-wide text-secondary">Staff Portal</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-2 md:flex">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative inline-flex items-center gap-2 rounded-full border-2 px-4 py-2 text-sm font-extrabold transition-colors ${
                    item.active
                      ? item.color === 'red'
                        ? 'border-primary bg-primary text-primary-foreground'
                        : item.color === 'blue'
                          ? 'border-secondary bg-secondary text-secondary-foreground'
                          : 'border-accent bg-accent text-accent-foreground'
                      : 'border-border bg-background text-foreground hover:border-secondary hover:bg-muted'
                  }`}
                >
                  <Icon size={17} />
                  {item.label}
                  {item.badge != null && item.badge > 0 && (
                    <span className="ml-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-extrabold text-primary-foreground">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </Link>
              );
            })}

            {isAdmin && (
              <Link
                href="/dashboard/admin"
                className={`inline-flex items-center gap-2 rounded-full border-2 px-4 py-2 text-sm font-extrabold transition-colors ${
                  pathname === '/dashboard/admin'
                    ? 'border-secondary bg-secondary text-secondary-foreground'
                    : 'border-border bg-background text-foreground hover:border-secondary hover:bg-muted'
                }`}
              >
                <Shield size={17} />
                Admin
              </Link>
            )}
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-extrabold text-foreground">{user.name}</p>
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                {isAdmin ? 'Admin' : 'Staff'}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border-2 border-border bg-background text-foreground transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground"
              title="Sign out"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>

        <nav className="grid grid-cols-3 border-t-2 border-border bg-background md:hidden">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex items-center justify-center gap-1.5 px-2 py-3 text-xs font-extrabold ${
                  item.active
                    ? item.color === 'red'
                      ? 'bg-primary text-primary-foreground'
                      : item.color === 'blue'
                        ? 'bg-secondary text-secondary-foreground'
                        : 'bg-accent text-accent-foreground'
                    : 'bg-background text-foreground'
                }`}
              >
                <Icon size={16} />
                {item.label}
                {item.badge != null && item.badge > 0 && (
                  <span className="absolute right-3 top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] text-primary-foreground">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 lg:px-6">
        <div className="mb-5 flex items-center justify-between border-b-2 border-border pb-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">{pageTitle}</h1>
            <p className="text-sm font-semibold text-muted-foreground">Ohr Devora staff coordination</p>
          </div>
        </div>
        {children}
      </main>
    </div>
  );
}
