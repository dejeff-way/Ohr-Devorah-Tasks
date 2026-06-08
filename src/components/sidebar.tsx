'use client';

import { ReactNode, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { logout } from '@/app/auth/actions';
import { Toaster } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  X,
  Users,
  Shield,
  CalendarDays,
} from 'lucide-react';
import { User } from '@/types/task';

interface DashboardLayoutProps {
  children: ReactNode;
  user: User;
}

export default function DashboardLayout({ children, user }: DashboardLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isAdmin = user.role === 'admin';

  const navItems = [
    {
      label: 'My Tasks',
      href: '/dashboard',
      icon: ListChecks,
      active: pathname === '/dashboard',
    },
    {
      label: 'Calendar',
      href: '/dashboard/calendar',
      icon: CalendarDays,
      active: pathname === '/dashboard/calendar',
    },
    ...(isAdmin
      ? [
          {
            label: 'Admin Panel',
            href: '/dashboard/admin',
            icon: Shield,
            active: pathname === '/dashboard/admin',
          },
        ]
      : []),
  ];

  async function handleLogout() {
    await logout();
    router.push('/auth/login');
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Toaster richColors position="top-center" />

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-64 flex flex-col bg-slate-900 text-white
          transform transition-transform duration-200 ease-in-out
          lg:relative lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Sidebar header */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-700">
              <span className="text-sm font-bold">OD</span>
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight">Ohr Devora</p>
              <p className="text-xs text-slate-400 leading-tight">Task Manager</p>
            </div>
          </div>
          <button
            className="lg:hidden text-slate-400 hover:text-white"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        {/* User info */}
        <div className="px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-700 text-sm font-medium">
              {user.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{user.name}</p>
              <span
                className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${
                  isAdmin
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'bg-slate-700 text-slate-300'
                }`}
              >
                {isAdmin ? 'Admin' : 'Staff'}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                item.active
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <item.icon size={18} />
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Logout */}
        <div className="px-3 py-4 border-t border-slate-800">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors"
          >
            <LogOut size={18} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center justify-between px-4 lg:px-6 py-3 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden text-slate-600 hover:text-slate-900"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={22} />
            </button>
            <h2 className="text-lg font-semibold text-slate-900 hidden sm:block">
              {pathname === '/dashboard/admin'
                ? 'Admin Panel'
                : pathname === '/dashboard/calendar'
                  ? 'Calendar'
                  : 'Task Dashboard'}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500 hidden sm:inline">
              {user.name}
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-sm font-medium text-slate-700 sm:hidden">
              {user.name.charAt(0)}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
