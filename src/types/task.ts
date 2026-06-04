export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'staff';
  created_at: string;
}

export type CompletionLevel = 'pending' | 'in_progress' | 'review' | 'completed';

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
  metadata: MetadataRecord;
  created_by: string;
  created_at: string;
  updated_at: string;
  assignees?: User[];
}

export interface TaskAssignee {
  id: string;
  task_id: string;
  user_id: string;
}
