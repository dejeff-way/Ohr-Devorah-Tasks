'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Loader2, UserX } from 'lucide-react';

import { createClient } from '@/lib/supabase/client';
import { claimStaffSlot } from '@/app/auth/actions';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { PageLoader } from '@/components/ui/spinner';
import { Toaster } from '@/components/ui/sonner';
import { UserAvatar } from '@/components/user-avatar';
import { toast } from 'sonner';

type StaffSlot = {
  id: string;
  name: string;
};

export default function PickNamePage() {
  const router = useRouter();
  const supabase = createClient();
  const [slots, setSlots] = useState<StaffSlot[]>([]);
  const [takenNames, setTakenNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/login');
        return;
      }

      const { data: profile } = await supabase
        .from('users')
        .select('name')
        .eq('id', user.id)
        .single();

      if (profile?.name && profile.name !== 'Unknown') {
        router.push('/dashboard');
        return;
      }

      const { data: allSlots } = await supabase
        .from('staff_slots')
        .select('id, name')
        .order('name');

      if (allSlots) setSlots(allSlots);

      const { data: allUsers } = await supabase.from('users').select('name');

      if (allUsers) {
        setTakenNames(allUsers.map((u) => u.name).filter(Boolean));
      }

      setLoading(false);
    }

    load();
  }, [router, supabase]);

  async function handleClaim(slot: StaffSlot) {
    setClaiming(slot.id);
    const formData = new FormData();
    formData.set('slotId', slot.id);
    formData.set('slotName', slot.name);

    const result = await claimStaffSlot(formData);
    setClaiming(null);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`You are now ${result.name}`);
      router.push('/dashboard');
    }
  }

  if (loading) {
    return (
      <div className="min-h-svh bg-background">
        <PageLoader label="Loading" className="min-h-svh" />
      </div>
    );
  }

  const availableSlots = slots.filter((s) => !takenNames.includes(s.name));

  return (
    <div className="flex min-h-svh items-center justify-center bg-background px-4 py-10">
      <Toaster richColors position="top-center" />

      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-lg sm:p-8">
        <div className="mb-7 text-center">
          <span className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary text-lg font-extrabold text-primary-foreground shadow-sm">
            OD
          </span>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
            Welcome to Ohr Devora
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Choose your staff name. This is how you will appear on tasks and messages, so
            pick carefully — you only do this once.
          </p>
        </div>

        {availableSlots.length === 0 ? (
          <EmptyState
            icon={UserX}
            title="Every name has been claimed"
            description="Ask an administrator to add a new name slot for you, then reload this page."
          />
        ) : (
          <ul className="grid gap-2">
            {availableSlots.map((slot) => {
              const isClaiming = claiming === slot.id;
              return (
                <li key={slot.id}>
                  <Button
                    variant="outline"
                    onClick={() => handleClaim(slot)}
                    disabled={claiming !== null}
                    className="h-auto w-full justify-start gap-3 px-3 py-3 text-left"
                  >
                    <UserAvatar name={slot.name} size="sm" />
                    <span className="flex-1 text-sm font-semibold text-foreground">
                      {slot.name}
                    </span>
                    {isClaiming ? (
                      <Loader2 size={15} className="animate-spin text-muted-foreground" />
                    ) : (
                      <Check size={15} className="text-muted-foreground opacity-0" />
                    )}
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
