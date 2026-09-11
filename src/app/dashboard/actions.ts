'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { MetadataEntry, TaskActivity } from '@/types/task';

const metadataEntrySchema = z.object({
  key: z.string().min(1, 'Attribute key is required'),
  value: z.union([z.string(), z.number(), z.boolean()]),
});

const taskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional().default(''),
  date_required: z.string().min(1, 'Date is required'),
  recurrence: z.enum(['none', 'daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly']).optional().default('none'),
  completion_level: z.enum(['pending', 'in_progress', 'review', 'completed']).default('pending'),
  assignee_ids: z.array(z.string()).min(1, 'At least one assignee is required'),
  metadata: z.array(metadataEntrySchema).optional().default([]),
  steps: z.array(z.object({
    title: z.string().min(1, 'Step title is required'),
    assigned_to: z.string().optional().default(''),
  })).optional().default([]),
});

function formatZodError(error: z.ZodError): string {
  try {
    const issues = JSON.parse(error.message);
    if (Array.isArray(issues)) {
      return issues.map((i: { message?: string }) => i.message ?? 'Invalid value').join(', ');
    }
  } catch {
    // fallback
  }
  return error.message;
}

function parseMetadataFromForm(formData: FormData): MetadataEntry[] {
  try {
    const raw = formData.get('metadata');
    if (!raw || typeof raw !== 'string') return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e: unknown): e is MetadataEntry =>
        typeof e === 'object' &&
        e !== null &&
        typeof (e as MetadataEntry).key === 'string' &&
        (typeof (e as MetadataEntry).value === 'string' ||
         typeof (e as MetadataEntry).value === 'number' ||
         typeof (e as MetadataEntry).value === 'boolean')
    );
  } catch {
    return [];
  }
}

export async function createTask(formData: FormData) {
  const supabase = await createServerSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const metadata = parseMetadataFromForm(formData);

  const raw: Record<string, unknown> = {
    title: formData.get('title'),
    description: formData.get('description'),
    date_required: formData.get('date_required'),
    completion_level: formData.get('completion_level') || 'pending',
    assignee_ids: JSON.parse((formData.get('assignee_ids') as string) || '[]'),
    metadata,
    steps: JSON.parse((formData.get('steps') as string) || '[]'),
  };

  const parsed = taskSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: formatZodError(parsed.error) };
  }

  const { title, description, date_required, recurrence, completion_level, assignee_ids, steps } = parsed.data;

  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .insert({ title, description, date_required, recurrence, completion_level, created_by: user.id, metadata })
    .select()
    .single();

  if (taskError) return { error: taskError.message };

  const assigneeRows = assignee_ids.map((uid: string) => ({
    task_id: task.id,
    user_id: uid,
  }));

  const { error: assignError } = await supabase
    .from('task_assignees')
    .insert(assigneeRows);

  if (assignError) return { error: assignError.message };

  // Insert steps
  if (steps && steps.length > 0) {
    const stepRows = steps.map((step, i) => ({
      task_id: task.id,
      title: step.title,
      assigned_to: step.assigned_to || null,
      step_order: i,
    }));

    const { error: stepsError } = await supabase
      .from('task_steps')
      .insert(stepRows);

    if (stepsError) return { error: stepsError.message };
  }

  // Auto-create task chat thread
  try {
    const { data: chatConv, error: chatError } = await supabase
      .from('conversations')
      .insert({
        type: 'group',
        title: title,
        created_by: user.id,
        task_id: task.id,
      })
      .select()
      .single();

    if (!chatError && chatConv) {
      const chatParticipantIds = [...new Set([user.id, ...assignee_ids])];
      const chatPartRows = chatParticipantIds.map((uid) => ({
        conversation_id: chatConv.id,
        user_id: uid,
      }));

      await supabase.from('conversation_participants').insert(chatPartRows);

      await supabase.from('messages').insert({
        conversation_id: chatConv.id,
        sender_id: user.id,
        content: `Task created: "${title}". Discussion thread for assignees.`,
      });
    }
  } catch {
    // Task chat is non-critical — don't block task creation if it fails
  }

  revalidatePath('/dashboard');
  return { success: true, task };
}

export async function updateTask(taskId: string, formData: FormData) {
  const supabase = await createServerSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  // Fetch the task to determine the user's relationship to it
  const { data: task } = await supabase
    .from('tasks')
    .select('created_by, assignees:task_assignees(user_id)')
    .eq('id', taskId)
    .single();

  if (!task) return { error: 'Task not found' };

  const isAdmin = await supabase.rpc('is_admin', { uid: user.id }).then(r => r.data ?? false);
  const isCreator = task.created_by === user.id;
  const isAssignee = task.assignees?.some((a: { user_id: string }) => a.user_id === user.id) ?? false;

  if (!isAdmin && !isCreator && !isAssignee) {
    return { error: 'You do not have permission to edit this task' };
  }

  const metadata = parseMetadataFromForm(formData);

  const raw: Record<string, unknown> = {
    title: formData.get('title'),
    description: formData.get('description'),
    date_required: formData.get('date_required'),
    recurrence: formData.get('recurrence') || 'none',
    completion_level: formData.get('completion_level'),
    assignee_ids: JSON.parse((formData.get('assignee_ids') as string) || '[]'),
    metadata,
  };

  const parsed = taskSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: formatZodError(parsed.error) };
  }

  const { title, description, date_required, recurrence, completion_level, assignee_ids } = parsed.data;

  if (isAdmin || isCreator) {
    // Full edit: update all fields and re-sync assignees
    const { error: taskError } = await supabase
      .from('tasks')
      .update({ title, description, date_required, recurrence, completion_level, metadata })
      .eq('id', taskId);

    if (taskError) return { error: taskError.message };

    // Re-sync assignees: delete all, insert new
    const { error: delError } = await supabase
      .from('task_assignees')
      .delete()
      .eq('task_id', taskId);

    if (delError) return { error: delError.message };

    const assigneeRows = assignee_ids.map((uid: string) => ({
      task_id: taskId,
      user_id: uid,
    }));

    const { error: assignError } = await supabase
      .from('task_assignees')
      .insert(assigneeRows);

    if (assignError) return { error: assignError.message };
  } else {
    // Assignee-limited edit: only update description and completion_level
    const { error: taskError } = await supabase
      .from('tasks')
      .update({ description, completion_level })
      .eq('id', taskId);

    if (taskError) return { error: taskError.message };
  }

  revalidatePath('/dashboard');
  return { success: true };
}

export async function deleteTask(taskId: string) {
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase.from('tasks').delete().eq('id', taskId);
  if (error) return { error: error.message };

  revalidatePath('/dashboard');
  return { success: true };
}

export async function updateCompletionLevel(taskId: string, level: string) {
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase
    .from('tasks')
    .update({ completion_level: level })
    .eq('id', taskId);

  if (error) return { error: error.message };

  revalidatePath('/dashboard');
  return { success: true };
}

// ─── Task Activity Log ─────────────────────────────────────
//
// An append-only history of what has been tried on a task. RLS (migration
// 00018) decides who can read and write; these actions only enforce shape.

const activitySchema = z.object({
  task_id: z.string().min(1, 'Task is required'),
  body: z.string().trim().min(1, 'Write something first').max(2000, 'Keep it under 2000 characters'),
});

export async function loadTaskActivity(
  taskId: string
): Promise<{ data: TaskActivity[] } | { error: string }> {
  const supabase = await createServerSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('task_activity')
    .select('*, author:author_id(id, name, role)')
    .eq('task_id', taskId)
    .order('created_at', { ascending: false });

  if (error) return { error: error.message };

  return { data: (data ?? []) as unknown as TaskActivity[] };
}

export async function addTaskActivity(formData: FormData) {
  const supabase = await createServerSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const parsed = activitySchema.safeParse({
    task_id: formData.get('task_id'),
    body: formData.get('body'),
  });

  if (!parsed.success) {
    return { error: formatZodError(parsed.error) };
  }

  const { data, error } = await supabase
    .from('task_activity')
    .insert({
      task_id: parsed.data.task_id,
      author_id: user.id,
      body: parsed.data.body,
    })
    .select('*, author:author_id(id, name, role)')
    .single();

  if (error) return { error: error.message };

  revalidatePath('/dashboard');
  return { entry: data as unknown as TaskActivity };
}

export async function deleteTaskActivity(entryId: string) {
  const supabase = await createServerSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { error } = await supabase.from('task_activity').delete().eq('id', entryId);
  if (error) return { error: error.message };

  revalidatePath('/dashboard');
  return { success: true };
}
