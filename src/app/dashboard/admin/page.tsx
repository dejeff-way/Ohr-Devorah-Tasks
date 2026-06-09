'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { TaskBoard } from '@/components/task-board';
import { UserSwitcher } from '@/components/user-switcher';
import { updateUserRole, createStaffSlot, deleteStaffSlot, renameStaffSlot, adminResetPassword } from '@/app/auth/actions';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Shield, ListChecks, Users, ArrowUpFromLine, ArrowDownToLine,
  Plus, Trash2, Pencil, Check, X, KeyRound
} from 'lucide-react';
import type { Task, User } from '@/types/task';

type Tab = 'tasks' | 'staff';

type StaffSlot = {
  id: string;
  name: string;
};

export default function AdminDashboard() {
  const router = useRouter();
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState<Tab>('tasks');
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [staffSlots, setStaffSlots] = useState<StaffSlot[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  // Password reset state
  const [resettingUserId, setResettingUserId] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState('');

  // Staff slot management state
  const [newSlotName, setNewSlotName] = useState('');
  const [addingSlot, setAddingSlot] = useState(false);
  const [editingSlot, setEditingSlot] = useState<string | null>(null);
  const [editSlotName, setEditSlotName] = useState('');

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

      const { data: slots } = await supabase
        .from('staff_slots')
        .select('id, name')
        .order('name');

      if (slots) setStaffSlots(slots);

      const { data: tasks } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (!tasks) {
        setLoading(false);
        return;
      }

      const tasksWithAssignees: Task[] = await Promise.all(
        tasks.map(async (task) => {
          const { data: ta } = await supabase
            .from('task_assignees')
            .select('user_id')
            .eq('task_id', task.id);

          if (!ta) return task as Task;

          const assigneeUsers = ta
            .map((a) => allUsers?.find((u) => u.id === a.user_id))
            .filter(Boolean) as User[];

          return { ...task, assignees: assigneeUsers } as Task;
        })
      );

      setAllTasks(tasksWithAssignees);
      setLoading(false);
    }

    load();
  }, [router, supabase]);

  async function handleRoleToggle(targetUser: User) {
    const newRole = targetUser.role === 'admin' ? 'staff' : 'admin';

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
      const { data: allUsers } = await supabase
        .from('users')
        .select('*')
        .order('name');
      if (allUsers) setUsers(allUsers as User[]);
    }
  }

  async function handleResetPassword(userId: string) {
    if (!resetPassword || resetPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    const formData = new FormData();
    formData.set('userId', userId);
    formData.set('password', resetPassword);

    const result = await adminResetPassword(formData);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Password updated successfully');
      setResettingUserId(null);
      setResetPassword('');
    }
  }

  async function handleAddSlot() {
    if (!newSlotName.trim()) return;
    setAddingSlot(true);
    const formData = new FormData();
    formData.set('name', newSlotName);
    const result = await createStaffSlot(formData);
    setAddingSlot(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`Staff slot "${newSlotName}" added`);
      setNewSlotName('');
      const { data: slots } = await supabase.from('staff_slots').select('id, name').order('name');
      if (slots) setStaffSlots(slots);
    }
  }

  async function handleDeleteSlot(slotId: string) {
    const formData = new FormData();
    formData.set('slotId', slotId);
    const result = await deleteStaffSlot(formData);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Staff slot removed');
      const { data: slots } = await supabase.from('staff_slots').select('id, name').order('name');
      if (slots) setStaffSlots(slots);
    }
  }

  async function handleRenameSlot(slotId: string) {
    if (!editSlotName.trim()) return;
    const formData = new FormData();
    formData.set('slotId', slotId);
    formData.set('name', editSlotName);
    const result = await renameStaffSlot(formData);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Staff slot renamed');
      setEditingSlot(null);
      const { data: slots } = await supabase.from('staff_slots').select('id, name').order('name');
      if (slots) setStaffSlots(slots);
    }
  }

  const takenNames = users.map(u => u.name).filter(Boolean);

  const filteredTasks =
    selectedUserId === 'all'
      ? allTasks
      : allTasks.filter((t) =>
          t.assignees?.some((a) => a.id === selectedUserId)
        );

  const selectedUser = selectedUserId === 'all' ? null : users.find((u) => u.id === selectedUserId);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-foreground" />
      </div>
    );
  }

  if (!currentUser) return null;

  return (
    <div className="space-y-5">
      <Toaster richColors position="top-center" />

      {/* Admin banner */}
      <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-amber-50 border border-amber-200">
        <Shield size={18} className="text-amber-600 shrink-0" />
        <p className="text-sm text-amber-800">
          <span className="font-medium">Admin View</span> — You have full access to all tasks and staff management.
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-border">
        <button
          onClick={() => setActiveTab('tasks')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'tasks'
              ? 'border-border text-foreground'
              : 'border-transparent text-muted-foreground hover:text-secondary-foreground'
          }`}
        >
          <ListChecks size={16} />
          Tasks
        </button>
        <button
          onClick={() => setActiveTab('staff')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'staff'
              ? 'border-border text-foreground'
              : 'border-transparent text-muted-foreground hover:text-secondary-foreground'
          }`}
        >
          <Users size={16} />
          Staff ({users.length})
        </button>
      </div>

      {/* Tasks tab */}
      {activeTab === 'tasks' && (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="w-full sm:w-72">
              <UserSwitcher
                users={users}
                selectedUserId={selectedUserId}
                onChange={setSelectedUserId}
              />
            </div>
            <div className="text-xs text-muted-foreground">
              {selectedUserId === 'all'
                ? `Showing all ${allTasks.length} tasks across ${users.length} users`
                : `Showing ${filteredTasks.length} tasks assigned to ${selectedUser?.name ?? 'selected user'}`}
            </div>
          </div>

          <TaskBoard
            tasks={filteredTasks}
            users={users}
            currentUserId={currentUser.id}
            isAdmin={true}
            title={
              selectedUserId === 'all'
                ? 'All Tasks'
                : `Tasks: ${selectedUser?.name ?? 'Unknown User'}`
            }
          />
        </>
      )}

      {/* Staff tab */}
      {activeTab === 'staff' && (
        <div className="space-y-6">

          {/* ---- Existing Users Table ---- */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Registered Staff ({users.length})</CardTitle>
              <CardDescription>
                Manage user roles. Staff sign up with their own email, then pick their name on first login.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-background/50">
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Name</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Email</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Role</th>
                      <th className="text-right py-3 px-4 font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="border-b border-border hover:bg-background transition-colors">
                        <td className="py-3 px-4 font-medium text-foreground">{u.name}</td>
                        <td className="py-3 px-4 text-muted-foreground">{u.email}</td>
                        <td className="py-3 px-4">
                          <Badge
                            variant={u.role === 'admin' ? 'default' : 'secondary'}
                            className={
                              u.role === 'admin'
                                ? 'bg-amber-100 text-amber-800 hover:bg-amber-100 border-0'
                                : 'bg-muted text-secondary-foreground hover:bg-muted border-0'
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
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {resettingUserId === u.id ? (
                              <div className="flex items-center gap-1.5">
                                <Input
                                  type="password"
                                  placeholder="New password"
                                  value={resetPassword}
                                  onChange={(e) => setResetPassword(e.target.value)}
                                  className="h-8 w-36 text-xs"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleResetPassword(u.id);
                                    if (e.key === 'Escape') { setResettingUserId(null); setResetPassword(''); }
                                  }}
                                />
                                <Button size="sm" variant="ghost" onClick={() => handleResetPassword(u.id)}>
                                  <Check size={14} className="text-green-600" />
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => { setResettingUserId(null); setResetPassword(''); }}>
                                  <X size={14} className="text-muted-foreground" />
                                </Button>
                              </div>
                            ) : (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => { setResettingUserId(u.id); setResetPassword(''); }}
                                  disabled={u.id === currentUser?.id}
                                  className="text-xs text-muted-foreground hover:text-secondary-foreground"
                                  title="Reset password"
                                >
                                  <KeyRound size={14} />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleRoleToggle(u)}
                                  disabled={u.id === currentUser?.id}
                                  className="text-xs"
                                >
                                  {u.id === currentUser?.id ? (
                                    'Current User'
                                  ) : u.role === 'admin' ? (
                                    <span className="flex items-center gap-1">
                                      <ArrowDownToLine size={12} />
                                      Demote to Staff
                                    </span>
                                  ) : (
                                    <span className="flex items-center gap-1">
                                      <ArrowUpFromLine size={12} />
                                      Promote to Admin
                                    </span>
                                  )}
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* ---- Staff Slot Management ---- */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Staff Name Slots ({staffSlots.length})</CardTitle>
              <CardDescription>
                These are the names new staff can pick when they first log in. Add, rename, or delete slots.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add new slot */}
              <div className="flex gap-2">
                <Input
                  placeholder="e.g. Mrs. Cohen"
                  value={newSlotName}
                  onChange={(e) => setNewSlotName(e.target.value)}
                  className="max-w-xs"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddSlot(); }}
                />
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleAddSlot}
                  disabled={addingSlot || !newSlotName.trim()}
                  className="bg-primary hover:bg-secondary"
                >
                  <Plus size={14} className="mr-1" />
                  Add Slot
                </Button>
              </div>

              {/* Slots list */}
              <div className="grid gap-1.5">
                {staffSlots.map((slot) => {
                  const isTaken = takenNames.includes(slot.name);
                  const isEditing = editingSlot === slot.id;

                  return (
                    <div
                      key={slot.id}
                      className={`flex items-center justify-between px-3 py-2 rounded-md border text-sm ${
                        isTaken
                          ? 'bg-background border-border'
                          : 'bg-card border-dashed border-border'
                      }`}
                    >
                      {isEditing ? (
                        <div className="flex items-center gap-2 flex-1">
                          <Input
                            value={editSlotName}
                            onChange={(e) => setEditSlotName(e.target.value)}
                            className="h-8 text-sm max-w-xs"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleRenameSlot(slot.id);
                              if (e.key === 'Escape') setEditingSlot(null);
                            }}
                          />
                          <Button size="sm" variant="ghost" onClick={() => handleRenameSlot(slot.id)}>
                            <Check size={14} className="text-green-600" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingSlot(null)}>
                            <X size={14} className="text-muted-foreground" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground">{slot.name}</span>
                            {isTaken && (
                              <Badge variant="secondary" className="bg-green-50 text-green-700 border-0 text-xs">
                                Assigned
                              </Badge>
                            )}
                            {!isTaken && (
                              <Badge variant="secondary" className="bg-background text-muted-foreground border-0 text-xs">
                                Available
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => { setEditingSlot(slot.id); setEditSlotName(slot.name); }}
                              className="text-muted-foreground hover:text-secondary-foreground"
                            >
                              <Pencil size={14} />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteSlot(slot.id)}
                              className="text-muted-foreground hover:text-red-600"
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

        </div>
      )}
    </div>
  );
}
