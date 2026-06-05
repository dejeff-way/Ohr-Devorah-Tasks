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
      const result = await signUp(formData);
      setLoading(false);
      if (result.error) {
        setError(result.error);
      } else {
        toast.success(result.message ?? 'Account created! Check your email.');
        setIsRegistering(false);
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
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <Toaster richColors position="top-center" />
      <Card className="w-full max-w-md shadow-lg border-slate-200">
        <CardHeader className="space-y-1 text-center pb-4">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-slate-900">
            <span className="text-xl font-bold text-white">OD</span>
          </div>
          <CardTitle className="text-2xl font-semibold tracking-tight text-slate-900">
            Ohr Devora
          </CardTitle>
          <CardDescription className="text-slate-500">
            {isRegistering ? 'Create your account' : 'Staff Task Management Portal'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-slate-700">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-10 border-slate-300 focus:border-slate-900 focus:ring-slate-900"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-slate-700">
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
                className="h-10 border-slate-300 focus:border-slate-900 focus:ring-slate-900"
              />
            </div>
            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                {error}
              </p>
            )}
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-10 bg-slate-900 hover:bg-slate-800 text-white font-medium"
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
          <p className="text-xs text-slate-400 text-center">
            {isRegistering ? (
              <>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => { setIsRegistering(false); setError(''); }}
                  className="text-slate-700 font-medium hover:underline"
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
                  className="text-slate-700 font-medium hover:underline"
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
