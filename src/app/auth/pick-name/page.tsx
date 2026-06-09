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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-foreground" />
      </div>
    );
  }

  const availableSlots = slots.filter((s) => !takenNames.includes(s.name));

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <Toaster richColors position="top-center" />
      <Card className="w-full max-w-xl border-4 border-secondary p-2">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-primary">
            <span className="text-2xl font-extrabold text-primary-foreground">OD</span>
          </div>
          <CardTitle className="text-3xl font-extrabold tracking-tight text-foreground">
            Welcome to Ohr Devora
          </CardTitle>
          <CardDescription className="text-base font-semibold text-muted-foreground">
            Pick your staff name to get started. This will be your identity in the system.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {availableSlots.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground mb-4">
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
                  className="w-full justify-start text-left h-auto py-4 px-4 border-2 border-border hover:border-primary hover:bg-muted"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-sm font-medium text-secondary">
                      {slot.name.charAt(0)}
                    </div>
                    <span className="font-medium text-foreground">{slot.name}</span>
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
