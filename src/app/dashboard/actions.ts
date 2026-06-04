'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { MetadataEntry } from '@/types/task';

const metadataEntrySchema = z.object({
  key: z.string().min(1, 'Attribute key is required'),
  value: z.union([z.string(), z.number(), z.boolean()]),
});

const taskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional().default(''),
  date_required: z.string().min(1, 'Date is required'),
  completion_level: z.enum(['pending', 'in_progress', 'review', 'completed']).default('pending'),
  assignee_ids: z.array(z.string()).min(1, 'At least one assignee is required'),
  metadata: z.array(metadataEntrySchema).optional().default([]),
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
  };

  const parsed = taskSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: formatZodError(parsed.error) };
  }

  const { title, description, date_required, completion_level, assignee_ids } = parsed.data;

  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .insert({ title, description, date_required, completion_level, created_by: user.id, metadata })
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

  revalidatePath('/dashboard');
  return { success: true, task };
}

export async function updateTask(taskId: string, formData: FormData) {
  const supabase = await createServerSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const metadata = parseMetadataFromForm(formData);

  const raw: Record<string, unknown> = {
    title: formData.get('title'),
    description: formData.get('description'),
    date_required: formData.get('date_required'),
    completion_level: formData.get('completion_level'),
    assignee_ids: JSON.parse((formData.get('assignee_ids') as string) || '[]'),
    metadata,
  };

  const parsed = taskSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: formatZodError(parsed.error) };
  }

  const { title, description, date_required, completion_level, assignee_ids } = parsed.data;

  const { error: taskError } = await supabase
    .from('tasks')
    .update({ title, description, date_required, completion_level, metadata })
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
