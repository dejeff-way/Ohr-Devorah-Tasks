'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import DashboardLayout from '@/components/sidebar';
import { PageLoader } from '@/components/ui/spinner';
import { User } from '@/types/task';

export default function DashboardWrapper({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        router.push('/auth/login');
        return;
      }

      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (profile) {
        setUser(profile as User);
      }
      setLoading(false);
    }

    loadUser();
  }, [router, supabase]);

  if (loading) {
    return (
      <div className="min-h-svh bg-background">
        <PageLoader label="Loading your portal" className="min-h-svh" />
      </div>
    );
  }

  if (!user) return null;

  return <DashboardLayout user={user}>{children}</DashboardLayout>;
}
