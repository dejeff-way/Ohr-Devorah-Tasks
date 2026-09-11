'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Check,
  KeyRound,
  ListChecks,
  Pencil,
  Plus,
  Shield,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react';

import { createClient } from '@/lib/supabase/client';
import {
  adminResetPassword,
  createStaffSlot,
  deleteStaffSlot,
  renameStaffSlot,
  updateUserRole,
} from '@/app/auth/actions';
import { TaskBoard } from '@/components/task-board';
import { UserSwitcher } from '@/components/user-switcher';
import { UserAvatar } from '@/components/user-avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageLoader } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
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

  const [resettingUserId, setResettingUserId] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState('');

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

  async function refreshUsers() {
    const { data } = await supabase.from('users').select('*').order('name');
    if (data) setUsers(data as User[]);
  }

  async function refreshSlots() {
    const { data } = await supabase.from('staff_slots').select('id, name').order('name');
    if (data) setStaffSlots(data);
  }

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
      await refreshUsers();
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
      toast.success('Password updated');
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
      toast.success(`Added "${newSlotName}"`);
      setNewSlotName('');
      await refreshSlots();
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
      await refreshSlots();
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
      await refreshSlots();
    }
  }

  const takenNames = users.map((u) => u.name).filter(Boolean);

  const filteredTasks =
    selectedUserId === 'all'
      ? allTasks
      : allTasks.filter((t) => t.assignees?.some((a) => a.id === selectedUserId));

  const selectedUser =
    selectedUserId === 'all' ? null : users.find((u) => u.id === selectedUserId);

  if (loading) {
    return <PageLoader label="Loading admin panel" />;
  }

  if (!currentUser) return null;

  const tabs: { key: Tab; label: string; icon: typeof ListChecks; count?: number }[] = [
    { key: 'tasks', label: 'Tasks', icon: ListChecks, count: allTasks.length },
    { key: 'staff', label: 'Staff', icon: Users, count: users.length },
  ];

  return (
    <div className="space-y-5">
      {/* The Toaster lives in the app shell. Mounting a second one here meant
          every toast on this page rendered twice. */}

      <div className="flex items-start gap-3 rounded-xl border border-status-review/20 bg-status-review-soft px-4 py-3">
        <Shield size={17} className="mt-0.5 shrink-0 text-status-review-fg" />
        <p className="text-sm text-status-review-fg">
          <span className="font-bold">Admin view.</span> You can see and edit every task in
          the school, and manage staff accounts and name slots.
        </p>
      </div>

      {/* ---------------- Tabs ---------------- */}
      <div
        role="tablist"
        aria-label="Admin sections"
        className="flex gap-1 border-b border-border"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              role="tab"
              aria-selected={active}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                '-mb-px flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30',
                // The active tab used to be `border-border`, the same colour as
                // the rule underneath it, so nothing looked selected.
                active
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon size={16} />
              {tab.label}
              {tab.count != null && (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1.5 text-[11px] font-bold tabular-nums text-muted-foreground">
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ---------------- Tasks ---------------- */}
      {activeTab === 'tasks' && (
        <div className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <div className="w-full sm:w-72">
              <UserSwitcher
                users={users}
                selectedUserId={selectedUserId}
                onChange={setSelectedUserId}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {selectedUserId === 'all'
                ? `All ${allTasks.length} tasks across ${users.length} staff members`
                : `${filteredTasks.length} assigned to ${selectedUser?.name ?? 'this person'}`}
            </p>
          </div>

          <TaskBoard
            tasks={filteredTasks}
            users={users}
            currentUserId={currentUser.id}
            isAdmin
            title={selectedUserId === 'all' ? undefined : `Tasks: ${selectedUser?.name ?? ''}`}
          />
        </div>
      )}

      {/* ---------------- Staff ---------------- */}
      {activeTab === 'staff' && (
        <div className="space-y-5">
          <Card>
            <CardHeader className="border-b">
              <CardTitle>Registered staff ({users.length})</CardTitle>
              <CardDescription>
                Staff sign up with their own email, then claim a name on first login.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              <ul className="divide-y divide-border">
                {users.map((u) => {
                  const isSelf = u.id === currentUser.id;
                  const isResetting = resettingUserId === u.id;

                  return (
                    <li
                      key={u.id}
                      className="flex flex-col gap-3 px-5 py-3.5 sm:flex-row sm:items-center sm:gap-4"
                    >
                      <UserAvatar name={u.name} size="md" className="shrink-0" />

                      <div className="min-w-0 flex-1 leading-tight">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-bold text-foreground">{u.name}</span>
                          {u.role === 'admin' ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary-soft px-2 py-0.5 text-[11px] font-bold text-primary">
                              <Shield size={10} />
                              Admin
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                              Staff
                            </span>
                          )}
                          {isSelf && (
                            <span className="text-[11px] font-semibold text-muted-foreground">
                              (you)
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">{u.email}</p>
                      </div>

                      {isResetting ? (
                        <div className="flex items-center gap-1.5">
                          <Input
                            type="password"
                            placeholder="New password"
                            value={resetPassword}
                            onChange={(e) => setResetPassword(e.target.value)}
                            className="h-9 w-40 text-sm"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleResetPassword(u.id);
                              if (e.key === 'Escape') {
                                setResettingUserId(null);
                                setResetPassword('');
                              }
                            }}
                          />
                          <Button
                            size="icon-sm"
                            variant="outline"
                            aria-label="Save password"
                            onClick={() => handleResetPassword(u.id)}
                          >
                            <Check size={15} className="text-status-done" />
                          </Button>
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            aria-label="Cancel"
                            onClick={() => {
                              setResettingUserId(null);
                              setResetPassword('');
                            }}
                          >
                            <X size={15} />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex shrink-0 items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            disabled={isSelf}
                            title="Reset password"
                            aria-label={`Reset password for ${u.name}`}
                            onClick={() => {
                              setResettingUserId(u.id);
                              setResetPassword('');
                            }}
                          >
                            <KeyRound size={15} />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={isSelf}
                            onClick={() => handleRoleToggle(u)}
                          >
                            {u.role === 'admin' ? (
                              <>
                                <ArrowDownToLine size={13} />
                                Demote
                              </>
                            ) : (
                              <>
                                <ArrowUpFromLine size={13} />
                                Promote
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b">
              <CardTitle>Staff name slots ({staffSlots.length})</CardTitle>
              <CardDescription>
                The names new staff can choose from the first time they log in.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="e.g. Mrs. Cohen"
                  value={newSlotName}
                  onChange={(e) => setNewSlotName(e.target.value)}
                  className="max-w-xs"
                  aria-label="New staff slot name"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddSlot();
                  }}
                />
                <Button onClick={handleAddSlot} disabled={addingSlot || !newSlotName.trim()}>
                  <Plus size={15} />
                  Add slot
                </Button>
              </div>

              {staffSlots.length === 0 ? (
                <EmptyState
                  size="sm"
                  icon={UserPlus}
                  title="No name slots yet"
                  description="Add the names your staff will pick from."
                />
              ) : (
                <ul className="grid gap-1.5">
                  {staffSlots.map((slot) => {
                    const isTaken = takenNames.includes(slot.name);
                    const isEditing = editingSlot === slot.id;

                    return (
                      <li
                        key={slot.id}
                        className={cn(
                          'flex items-center justify-between gap-2 rounded-lg border px-3 py-2',
                          isTaken ? 'border-border bg-card' : 'border-dashed border-border bg-subtle'
                        )}
                      >
                        {isEditing ? (
                          <div className="flex flex-1 items-center gap-1.5">
                            <Input
                              value={editSlotName}
                              onChange={(e) => setEditSlotName(e.target.value)}
                              className="h-9 max-w-xs text-sm"
                              autoFocus
                              aria-label="Rename staff slot"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleRenameSlot(slot.id);
                                if (e.key === 'Escape') setEditingSlot(null);
                              }}
                            />
                            <Button
                              size="icon-sm"
                              variant="outline"
                              aria-label="Save name"
                              onClick={() => handleRenameSlot(slot.id)}
                            >
                              <Check size={15} className="text-status-done" />
                            </Button>
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              aria-label="Cancel"
                              onClick={() => setEditingSlot(null)}
                            >
                              <X size={15} />
                            </Button>
                          </div>
                        ) : (
                          <>
                            <div className="flex min-w-0 items-center gap-2.5">
                              <UserAvatar name={slot.name} size="xs" />
                              <span className="truncate text-sm font-semibold text-foreground">
                                {slot.name}
                              </span>
                              <span
                                className={cn(
                                  'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold',
                                  isTaken
                                    ? 'bg-status-done-soft text-status-done-fg'
                                    : 'bg-muted text-muted-foreground'
                                )}
                              >
                                {isTaken ? 'Claimed' : 'Available'}
                              </span>
                            </div>
                            <div className="flex shrink-0 items-center gap-1">
                              <Button
                                size="icon-sm"
                                variant="ghost"
                                aria-label={`Rename ${slot.name}`}
                                onClick={() => {
                                  setEditingSlot(slot.id);
                                  setEditSlotName(slot.name);
                                }}
                              >
                                <Pencil size={14} />
                              </Button>
                              <Button
                                size="icon-sm"
                                variant="ghost"
                                aria-label={`Delete ${slot.name}`}
                                className="hover:bg-destructive-soft hover:text-destructive"
                                onClick={() => handleDeleteSlot(slot.id)}
                              >
                                <Trash2 size={14} />
                              </Button>
                            </div>
                          </>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
