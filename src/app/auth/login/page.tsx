'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { login, seedAdmin, seedStaffUsers } from '@/app/auth/actions';
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
  const [seeding, setSeeding] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData();
    formData.set('email', email);
    formData.set('password', password);

    const result = await login(formData);
    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      router.push('/dashboard');
    }
  }

  async function handleSeed() {
    setSeeding(true);
    try {
      const adminResult = await seedAdmin();
      if (adminResult.error) {
        toast.error(adminResult.error);
      } else {
        toast.success(adminResult.message);
      }

      const staffResults = await seedStaffUsers();
      const created = staffResults.filter((r) => r.status === 'created').length;
      const existing = staffResults.filter((r) => r.status === 'already exists').length;
      toast.success(`${created} staff created, ${existing} already exist`);
    } catch {
      toast.error('Seeding failed');
    }
    setSeeding(false);
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
            Staff Task Management Portal
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
                placeholder="you@ohrdevora.org"
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
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>
        </CardContent>
        <Separator className="mx-6 w-auto" />
        <CardFooter className="flex flex-col pt-4 pb-6">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSeed}
            disabled={seeding}
            className="w-full text-xs text-slate-500 border-slate-200 hover:bg-slate-100"
          >
            {seeding ? 'Seeding...' : 'Seed Admin & Staff Accounts'}
          </Button>
          <p className="mt-3 text-xs text-slate-400 text-center">
            First time? Click above to seed accounts, then sign in.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
