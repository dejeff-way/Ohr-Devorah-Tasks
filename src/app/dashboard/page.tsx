'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { TaskBoard } from '@/components/task-board';
import { Task, User } from '@/types/task';

export default function StaffDashboard() {
  const router = useRouter();
  const supabase = createClient();
  const [tasks, setTasks] = useState<Task[]>([]);
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

      // Get current user profile
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (!profile) return;
      setCurrentUser(profile as User);

      // Get all users for the multi-select
      const { data: allUsers } = await supabase
        .from('users')
        .select('*')
        .order('name');

      if (allUsers) setUsers(allUsers as User[]);

      // Get tasks assigned to current user, with assignees
      const { data: taskAssignments } = await supabase
        .from('task_assignees')
        .select('task_id')
        .eq('user_id', authUser.id);

      if (!taskAssignments || taskAssignments.length === 0) {
        setTasks([]);
        setLoading(false);
        return;
      }

      const taskIds = taskAssignments.map((ta) => ta.task_id);

      const { data: assignedTasks } = await supabase
        .from('tasks')
        .select('*')
        .in('id', taskIds)
        .order('created_at', { ascending: false });

      if (!assignedTasks) {
        setLoading(false);
        return;
      }

      // Fetch assignees for each task
      const tasksWithAssignees: Task[] = await Promise.all(
        assignedTasks.map(async (task) => {
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

      setTasks(tasksWithAssignees);
      setLoading(false);
    }

    load();
  }, [router, supabase]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-foreground" />
      </div>
    );
  }

  return (
    <TaskBoard
      tasks={tasks}
      users={users}
      currentUserId={currentUser?.id ?? ''}
      isAdmin={false}
      title="My Tasks"
    />
  );
}
