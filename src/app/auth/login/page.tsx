'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { login, signUp } from '@/app/auth/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';

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

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <Toaster richColors position="top-center" />

      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-center justify-center">
        <div className="grid w-full gap-4 lg:grid-cols-[1fr_0.9fr]">
          <section className="flex flex-col justify-center rounded-[2rem] border-4 border-secondary bg-background p-7 md:p-10">
            <div className="mb-8 flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-primary text-2xl font-extrabold text-primary-foreground">
                OD
              </div>
              <div>
                <p className="text-sm font-extrabold uppercase tracking-wide text-secondary">Ohr Devora</p>
                <p className="text-sm font-bold text-muted-foreground">Staff coordination portal</p>
              </div>
            </div>

            <h1 className="max-w-xl text-4xl font-extrabold leading-[1.05] tracking-tight text-foreground md:text-5xl">
              A clear place for school tasks, calendars, and staff messages.
            </h1>
            <p className="mt-5 max-w-xl text-base font-semibold leading-7 text-muted-foreground md:text-lg">
              Built for teachers and administrators who need simple coordination without hunting through emails, texts, and hallway reminders.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border-4 border-primary bg-background p-4">
                <p className="text-lg font-extrabold text-primary">Tasks</p>
                <p className="mt-1 text-sm font-semibold text-muted-foreground">Know what needs doing.</p>
              </div>
              <div className="rounded-2xl border-4 border-[#ffd166] bg-background p-4">
                <p className="text-lg font-extrabold text-secondary">Calendar</p>
                <p className="mt-1 text-sm font-semibold text-muted-foreground">See the week clearly.</p>
              </div>
              <div className="rounded-2xl border-4 border-accent bg-background p-4">
                <p className="text-lg font-extrabold text-secondary">Messages</p>
                <p className="mt-1 text-sm font-semibold text-muted-foreground">Keep staff in sync.</p>
              </div>
            </div>
          </section>

          <section className="flex items-center">
            <Card className="w-full border-4 border-primary p-2">
              <CardContent className="p-5 md:p-7">
                <div className="mb-7">
                  <p className="text-sm font-extrabold text-primary">
                    {isRegistering ? 'Create staff account' : 'Welcome back'}
                  </p>
                  <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-foreground">
                    {isRegistering ? 'Join the portal' : 'Sign in'}
                  </h2>
                  <p className="mt-2 text-sm font-semibold text-muted-foreground">
                    {isRegistering
                      ? 'Use the invite code from your administrator.'
                      : 'Use your staff email and password.'}
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-extrabold text-foreground">
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="h-12 rounded-xl border-2 border-input bg-background px-4 text-base font-semibold"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-extrabold text-foreground">
                      Password
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className="h-12 rounded-xl border-2 border-input bg-background px-4 text-base font-semibold"
                    />
                  </div>

                  {isRegistering && (
                    <div className="space-y-2">
                      <Label htmlFor="invite_code" className="text-sm font-extrabold text-foreground">
                        Invite Code
                      </Label>
                      <Input
                        id="invite_code"
                        type="text"
                        placeholder="Enter code from your admin"
                        value={inviteCode}
                        onChange={(e) => setInviteCode(e.target.value)}
                        required
                        className="h-12 rounded-xl border-2 border-input bg-background px-4 text-base font-semibold"
                      />
                    </div>
                  )}

                  {error && (
                    <p className="rounded-xl border-2 border-primary bg-background px-4 py-3 text-sm font-bold text-primary">
                      {error}
                    </p>
                  )}

                  <Button type="submit" disabled={loading} className="h-12 w-full text-base">
                    {loading ? 'Please wait...' : isRegistering ? 'Create account' : 'Sign in'}
                  </Button>
                </form>

                <div className="mt-6 rounded-2xl border-2 border-border bg-muted p-4 text-center text-sm font-bold text-muted-foreground">
                  {isRegistering ? (
                    <>
                      Already have an account?{' '}
                      <button
                        type="button"
                        onClick={() => { setIsRegistering(false); setError(''); }}
                        className="font-extrabold text-secondary underline-offset-4 hover:underline"
                      >
                        Sign in
                      </button>
                    </>
                  ) : (
                    <>
                      New staff member?{' '}
                      <button
                        type="button"
                        onClick={() => { setIsRegistering(true); setError(''); }}
                        className="font-extrabold text-secondary underline-offset-4 hover:underline"
                      >
                        Create an account
                      </button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    </div>
  );
}
