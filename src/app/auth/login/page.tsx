'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { login, signUp } from '@/app/auth/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
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
        toast.success(result.message ?? 'Account created! Sign in with your email and password.');
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
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Toaster richColors position="top-center" />
      <Card className="w-full max-w-md shadow-lg border-border">
        <CardHeader className="space-y-1 text-center pb-4">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary">
            <span className="text-xl font-bold text-primary-foreground">OD</span>
          </div>
          <CardTitle className="text-2xl font-semibold tracking-tight text-foreground">
            Ohr Devora
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            {isRegistering ? 'Create your staff account' : 'Staff Task Management Portal'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-secondary-foreground">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-10 border-border focus:border-border focus:ring-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-secondary-foreground">
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
                className="h-10 border-border focus:border-border focus:ring-foreground"
              />
            </div>
            {isRegistering && (
              <div className="space-y-2">
                <Label htmlFor="invite_code" className="text-sm font-medium text-secondary-foreground">
                  Invite Code
                </Label>
                <Input
                  id="invite_code"
                  type="text"
                  placeholder="Enter code from your admin"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  required
                  className="h-10 border-border focus:border-border focus:ring-foreground"
                />
              </div>
            )}
            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                {error}
              </p>
            )}
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-10 bg-primary hover:bg-secondary text-primary-foreground font-medium"
            >
              {loading
                ? 'Please wait...'
                : isRegistering
                  ? 'Create Account'
                  : 'Sign in'}
            </Button>
          </form>
        </CardContent>
        <Separator className="mx-6 w-auto" />
        <CardFooter className="pt-4 pb-6 justify-center">
          <p className="text-xs text-muted-foreground text-center">
            {isRegistering ? (
              <>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => { setIsRegistering(false); setError(''); }}
                  className="text-secondary-foreground font-medium hover:underline"
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
                  className="text-secondary-foreground font-medium hover:underline"
                >
                  Create an account
                </button>
              </>
            )}
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
