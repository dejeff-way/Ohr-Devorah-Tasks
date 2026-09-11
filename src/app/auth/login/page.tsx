'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, CalendarDays, ListChecks, Loader2, MessageSquare } from 'lucide-react';

import { login, signUp } from '@/app/auth/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';

const HIGHLIGHTS = [
  {
    icon: ListChecks,
    title: 'Tasks',
    body: 'See exactly what is assigned to you and how far along it is.',
  },
  {
    icon: CalendarDays,
    title: 'Calendar',
    body: 'Due dates and recurring duties laid out a month at a time.',
  },
  {
    icon: MessageSquare,
    title: 'Messages',
    body: 'Direct notes, group threads and school-wide announcements.',
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData();
    formData.set('email', email);
    formData.set('password', password);

    if (isRegistering) {
      formData.set('invite_code', inviteCode);
      const result = await signUp(formData);
      setLoading(false);
      if (result.error) {
        setError(result.error);
      } else {
        toast.success(result.message ?? 'Account created. Sign in with your email and password.');
        setIsRegistering(false);
        setInviteCode('');
      }
    } else {
      const result = await login(formData);
      setLoading(false);
      if (result.error) {
        setError(result.error);
      } else if (result.needsName) {
        router.push('/auth/pick-name');
      } else {
        router.push('/dashboard');
      }
    }
  }

  function switchMode(registering: boolean) {
    setIsRegistering(registering);
    setError('');
  }

  return (
    <div className="min-h-svh bg-background">
      <Toaster richColors position="top-center" />

      <div className="mx-auto grid min-h-svh max-w-6xl items-center gap-10 px-4 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:px-8">
        {/* ---------------- Pitch ---------------- */}
        <section className="hidden flex-col justify-center lg:flex">
          <div className="mb-8 flex items-center gap-3">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-primary text-base font-extrabold text-primary-foreground shadow-sm">
              OD
            </span>
            <span className="leading-tight">
              <span className="block text-base font-bold tracking-tight text-foreground">
                Ohr Devora
              </span>
              <span className="block text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Staff Portal
              </span>
            </span>
          </div>

          <h1 className="max-w-xl text-4xl font-extrabold leading-[1.1] tracking-tight text-foreground xl:text-5xl">
            One clear place for school tasks, calendars and staff messages.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-muted-foreground">
            Built for teachers and administrators who need simple coordination without
            hunting through emails, texts and hallway reminders.
          </p>

          <ul className="mt-10 space-y-3">
            {HIGHLIGHTS.map(({ icon: Icon, title, body }) => (
              <li
                key={title}
                className="flex items-start gap-3.5 rounded-xl border border-border bg-card p-4 shadow-xs"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary-soft text-secondary">
                  <Icon size={17} />
                </span>
                <span className="leading-tight">
                  <span className="block text-sm font-bold text-foreground">{title}</span>
                  <span className="mt-1 block text-sm text-muted-foreground">{body}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* ---------------- Form ---------------- */}
        <section className="flex items-center justify-center">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-lg sm:p-8">
            <div className="mb-7 lg:hidden">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-primary text-base font-extrabold text-primary-foreground shadow-sm">
                OD
              </span>
            </div>

            <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">
              {isRegistering ? 'Create staff account' : 'Welcome back'}
            </p>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-foreground">
              {isRegistering ? 'Join the portal' : 'Sign in'}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {isRegistering
                ? 'You will need the invite code from your administrator.'
                : 'Use your staff email and password.'}
            </p>

            <form onSubmit={handleSubmit} className="mt-7 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-semibold text-foreground">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-semibold text-foreground">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete={isRegistering ? 'new-password' : 'current-password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="h-11"
                />
                {isRegistering && (
                  <p className="text-xs text-muted-foreground">At least 6 characters.</p>
                )}
              </div>

              {isRegistering && (
                <div className="space-y-2">
                  <Label htmlFor="invite_code" className="text-sm font-semibold text-foreground">
                    Invite code
                  </Label>
                  <Input
                    id="invite_code"
                    type="text"
                    placeholder="Code from your admin"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    required
                    className="h-11"
                  />
                </div>
              )}

              {error && (
                <p
                  role="alert"
                  className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive-soft px-3.5 py-3 text-sm font-medium text-destructive"
                >
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  {error}
                </p>
              )}

              <Button type="submit" disabled={loading} size="lg" className="w-full">
                {loading && <Loader2 size={16} className="animate-spin" />}
                {loading ? 'Please wait…' : isRegistering ? 'Create account' : 'Sign in'}
              </Button>
            </form>

            <p className="mt-6 border-t border-border pt-5 text-center text-sm text-muted-foreground">
              {isRegistering ? 'Already have an account?' : 'New staff member?'}{' '}
              <button
                type="button"
                onClick={() => switchMode(!isRegistering)}
                className="font-bold text-secondary underline-offset-4 hover:underline"
              >
                {isRegistering ? 'Sign in' : 'Create an account'}
              </button>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
