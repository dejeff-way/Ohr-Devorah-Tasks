'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { claimStaffSlot } from '@/app/auth/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Toaster } from '@/components/ui/sonner';
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

      // Check if user already has a name
      const { data: profile } = await supabase
        .from('users')
        .select('name')
        .eq('id', user.id)
        .single();

      if (profile?.name && profile.name !== 'Unknown') {
        router.push('/dashboard');
        return;
      }

      // Load available slots
      const { data: allSlots } = await supabase
        .from('staff_slots')
        .select('id, name')
        .order('name');

      if (allSlots) setSlots(allSlots);

      // Find which names are already taken
      const { data: allUsers } = await supabase
        .from('users')
        .select('name');

      if (allUsers) {
        setTakenNames(allUsers.map(u => u.name).filter(Boolean));
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
      toast.success(`You are now ${result.name}!`);
      router.push('/dashboard');
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />
      </div>
    );
  }

  const availableSlots = slots.filter((s) => !takenNames.includes(s.name));

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <Toaster richColors position="top-center" />
      <Card className="w-full max-w-lg shadow-lg border-slate-200">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-slate-900">
            <span className="text-xl font-bold text-white">OD</span>
          </div>
          <CardTitle className="text-2xl font-semibold tracking-tight text-slate-900">
            Welcome to Ohr Devora
          </CardTitle>
          <CardDescription className="text-slate-500">
            Pick your staff name to get started. This will be your identity in the system.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {availableSlots.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-slate-500 mb-4">
                All staff names have been taken. Contact an admin to add more.
              </p>
            </div>
          ) : (
            <div className="grid gap-2">
              {availableSlots.map((slot) => (
                <Button
                  key={slot.id}
                  variant="outline"
                  onClick={() => handleClaim(slot)}
                  disabled={claiming === slot.id}
                  className="w-full justify-start text-left h-auto py-3 px-4 border-slate-200 hover:border-slate-900 hover:bg-slate-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-sm font-medium text-slate-700">
                      {slot.name.charAt(0)}
                    </div>
                    <span className="font-medium text-slate-900">{slot.name}</span>
                  </div>
                </Button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
