'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { TaskBoard } from '@/components/task-board';
import { UserSwitcher } from '@/components/user-switcher';
import { Task, User } from '@/types/task';
import { Shield } from 'lucide-react';

export default function AdminDashboard() {
  const router = useRouter();
  const supabase = createClient();
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [impersonatingUser, setImpersonatingUser] = useState<User | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        router.push('/auth/login');
        return;
      }

      // Get current user profile — verify admin
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

      // Get all users
      const { data: allUsers } = await supabase
        .from('users')
        .select('*')
        .order('name');

      if (allUsers) setUsers(allUsers as User[]);

      // Get all tasks with assignees
      const { data: tasks } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (!tasks) {
        setLoading(false);
        return;
      }

      // Fetch assignees for each task
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

  // Filter tasks by selected user
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
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />
      </div>
    );
  }

  if (!currentUser) return null;

  return (
    <div className="space-y-5">
      {/* Admin banner */}
      <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-amber-50 border border-amber-200">
        <Shield size={18} className="text-amber-600 shrink-0" />
        <div>
          <p className="text-sm font-medium text-amber-800">Admin View</p>
          <p className="text-xs text-amber-600">
            You see all tasks. Use the filter below to view a specific staff member's tasks.
          </p>
        </div>
      </div>

      {/* User switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="w-full sm:w-72">
          <UserSwitcher
            users={users}
            selectedUserId={selectedUserId}
            onChange={setSelectedUserId}
          />
        </div>
        <div className="text-xs text-slate-500">
          {selectedUserId === 'all'
            ? `Showing all ${allTasks.length} tasks across ${users.length} users`
            : `Showing ${filteredTasks.length} tasks assigned to ${selectedUser?.name ?? 'selected user'}`}
        </div>
      </div>

      {/* Task board */}
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
    </div>
  );
}
