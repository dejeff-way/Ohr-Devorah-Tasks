export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'staff';
  created_at: string;
}

export type CompletionLevel = 'pending' | 'in_progress' | 'review' | 'completed';

export type Recurrence = 'none' | 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';

export interface TaskStep {
  id: string;
  task_id: string;
  title: string;
  assigned_to: string | null;
  step_order: number;
  is_completed: boolean;
  created_at: string;
  assignee?: User;
}

/**
 * One line in a task's activity log — an action that was actually attempted,
 * stamped with who did it and when. Append-only; see migration 00018.
 */
export interface TaskActivity {
  id: string;
  task_id: string;
  author_id: string | null;
  body: string;
  created_at: string;
  author?: Pick<User, 'id' | 'name' | 'role'> | null;
}

/**
 * A single metadata entry — key is a short label, value is any JSON-safe
 * type (string, number, boolean, array, or nested object).
 */
export interface MetadataEntry {
  key: string;
  value: string | number | boolean;
}

/**
 * Full metadata payload stored in the JSONB column.
 * Stored as an array of {key, value} pairs for ordered, schema-agnostic rendering.
 */
export type MetadataRecord = MetadataEntry[];

export interface Task {
  id: string;
  title: string;
  description: string;
  date_required: string;
  completion_level: CompletionLevel;
  recurrence: Recurrence;
  metadata: MetadataRecord;
  created_by: string;
  created_at: string;
  updated_at: string;
  assignees?: User[];
  steps?: TaskStep[];
  activity?: TaskActivity[];
}

export interface TaskAssignee {
  id: string;
  task_id: string;
  user_id: string;
}
