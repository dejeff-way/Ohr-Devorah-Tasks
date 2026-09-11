'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import CalendarView from '@/components/calendar-view';
import { PageLoader } from '@/components/ui/spinner';
import type { Task, User } from '@/types/task';

export default function CalendarPage() {
  const router = useRouter();
  const supabase = createClient();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchTasks = useCallback(
    async (userId: string, isAdmin: boolean) => {
      // Get all users (needed for assignee display + admin filter)
      const { data: allUsers } = await supabase
        .from('users')
        .select('*')
        .order('name');

      const userMap = new Map<string, User>();
      if (allUsers) {
        for (const u of allUsers) userMap.set(u.id, u as User);
      }

      // Get all task assignments for the user (or all if admin)
      let taskRows: Task[] = [];

      if (isAdmin) {
        const { data } = await supabase
          .from('tasks')
          .select('*')
          .order('date_required', { ascending: true });
        taskRows = (data ?? []) as Task[];
      } else {
        const { data: assignments } = await supabase
          .from('task_assignees')
          .select('task_id')
          .eq('user_id', userId);

        const taskIds = assignments?.map((a) => a.task_id) ?? [];
        if (taskIds.length === 0) {
          taskRows = [];
        } else {
          const { data } = await supabase
            .from('tasks')
            .select('*')
            .in('id', taskIds)
            .order('date_required', { ascending: true });
          taskRows = (data ?? []) as Task[];
        }
      }

      // Fetch all assignees in one query
      if (taskRows.length > 0) {
        const taskIds = taskRows.map((t) => t.id);
        const { data: allAssignments } = await supabase
          .from('task_assignees')
          .select('task_id, user_id')
          .in('task_id', taskIds);

        // Build lookup: task_id → User[]
        const assigneeMap = new Map<string, User[]>();
        if (allAssignments) {
          for (const a of allAssignments) {
            const u = userMap.get(a.user_id);
            if (u) {
              const list = assigneeMap.get(a.task_id) ?? [];
              list.push(u);
              assigneeMap.set(a.task_id, list);
            }
          }
        }

        taskRows = taskRows.map((t) => ({
          ...t,
          assignees: assigneeMap.get(t.id) ?? [],
        }));
      }

      return { tasks: taskRows, users: (allUsers as User[]) ?? [] };
    },
    [supabase],
  );

  useEffect(() => {
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function init() {
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

      if (!profile) return;
      if (cancelled) return;

      const user = profile as User;
      const isAdmin = user.role === 'admin';
      setCurrentUser(user);

      // Initial fetch
      const { tasks: initialTasks, users: allUsers } = await fetchTasks(authUser.id, isAdmin);
      if (cancelled) return;
      setTasks(initialTasks);
      setUsers(allUsers);
      setLoading(false);

      // Realtime subscription: re-fetch on any task change
      channel = supabase
        .channel('calendar-tasks')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'tasks' },
          async () => {
            if (cancelled) return;
            const { tasks: refreshed } = await fetchTasks(authUser.id, isAdmin);
            if (!cancelled) setTasks(refreshed);
          },
        )
        .subscribe();
    }

    init();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [router, supabase, fetchTasks]);

  if (loading) {
    return <PageLoader label="Loading calendar" />;
  }

  return (
    <div className="mx-auto max-w-6xl">
      <CalendarView
        tasks={tasks}
        users={users}
        currentUserId={currentUser?.id ?? ''}
        isAdmin={currentUser?.role === 'admin'}
      />
    </div>
  );
}
