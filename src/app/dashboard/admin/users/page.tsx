'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { updateUserRole } from '@/app/auth/actions';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, UserCog, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { User } from '@/types/task';

export default function ManageUsersPage() {
  const router = useRouter();
  const supabase = createClient();
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
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

      if (!profile || profile.role !== 'admin') {
        router.push('/dashboard');
        return;
      }

      setCurrentUser(profile as User);

      const { data: allUsers } = await supabase
        .from('users')
        .select('*')
        .order('name');

      if (allUsers) setUsers(allUsers as User[]);
      setLoading(false);
    }

    load();
  }, [router, supabase]);

  async function handleRoleToggle(targetUser: User) {
    const newRole = targetUser.role === 'admin' ? 'staff' : 'admin';

    // Don't let an admin demote themselves
    if (targetUser.id === currentUser?.id && newRole === 'staff') {
      toast.error("You can't demote yourself. Have another admin do it.");
      return;
    }

    const formData = new FormData();
    formData.set('userId', targetUser.id);
    formData.set('role', newRole);

    const result = await updateUserRole(formData);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`${targetUser.name} is now ${newRole}`);
      // Refetch users
      const { data: allUsers } = await supabase
        .from('users')
        .select('*')
        .order('name');
      if (allUsers) setUsers(allUsers as User[]);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-foreground" />
      </div>
    );
  }

  if (!currentUser) return null;

  return (
    <div className="space-y-6">
      <Toaster richColors position="top-center" />

      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/admin"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Admin Panel
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
          <UserCog size={24} />
          Manage Users
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Promote staff to admin or demote admins back to staff.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">All Users ({users.length})</CardTitle>
          <CardDescription>
            Click the toggle button to change a user&apos;s role.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Name</th>
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Email</th>
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Role</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-border hover:bg-background">
                    <td className="py-3 px-2 font-medium text-foreground">{u.name}</td>
                    <td className="py-3 px-2 text-muted-foreground">{u.email}</td>
                    <td className="py-3 px-2">
                      <Badge
                        variant={u.role === 'admin' ? 'default' : 'secondary'}
                        className={
                          u.role === 'admin'
                            ? 'bg-amber-100 text-amber-800 hover:bg-amber-100 border-0'
                            : 'bg-muted text-secondary hover:bg-muted border-0'
                        }
                      >
                        {u.role === 'admin' ? (
                          <span className="flex items-center gap-1">
                            <Shield size={12} />
                            Admin
                          </span>
                        ) : (
                          'Staff'
                        )}
                      </Badge>
                    </td>
                    <td className="py-3 px-2 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRoleToggle(u)}
                        disabled={u.id === currentUser?.id}
                        className={
                          u.id === currentUser?.id
                            ? 'text-xs opacity-50'
                            : 'text-xs'
                        }
                      >
                        {u.id === currentUser?.id
                          ? 'Current User'
                          : u.role === 'admin'
                            ? 'Demote to Staff'
                            : 'Promote to Admin'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
