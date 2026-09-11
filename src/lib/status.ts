import type { CompletionLevel } from '@/types/task';

/**
 * Single source of truth for how a task status looks and behaves.
 *
 * Previously the board, the card and the calendar each kept their own colour
 * map, and they disagreed (pending was grey in one place and amber in another,
 * review was amber in one place and purple in another). Everything now reads
 * from here, so a status looks identical wherever it is rendered.
 */
export interface StatusConfig {
  /** Human label. */
  label: string;
  /** Short label for tight spots like calendar legends. */
  short: string;
  /** Solid colour — dots, bars, column rules. */
  dot: string;
  /** Tinted chip: background + text + border. */
  chip: string;
  /** Tinted surface only, for pills that sit on a card. */
  surface: string;
  /** Column accent rule. */
  rule: string;
  /** Next status in the workflow, or null when finished. */
  next: CompletionLevel | null;
}

export const STATUS_ORDER: CompletionLevel[] = [
  'pending',
  'in_progress',
  'review',
  'completed',
];

export const STATUS: Record<CompletionLevel, StatusConfig> = {
  pending: {
    label: 'Pending',
    short: 'Pending',
    dot: 'bg-status-pending',
    chip: 'bg-status-pending-soft text-status-pending-fg border-status-pending/20',
    surface: 'bg-status-pending-soft text-status-pending-fg',
    rule: 'bg-status-pending',
    next: 'in_progress',
  },
  in_progress: {
    label: 'In Progress',
    short: 'Active',
    dot: 'bg-status-progress',
    chip: 'bg-status-progress-soft text-status-progress-fg border-status-progress/20',
    surface: 'bg-status-progress-soft text-status-progress-fg',
    rule: 'bg-status-progress',
    next: 'review',
  },
  review: {
    label: 'Review',
    short: 'Review',
    dot: 'bg-status-review',
    chip: 'bg-status-review-soft text-status-review-fg border-status-review/20',
    surface: 'bg-status-review-soft text-status-review-fg',
    rule: 'bg-status-review',
    next: 'completed',
  },
  completed: {
    label: 'Completed',
    short: 'Done',
    dot: 'bg-status-done',
    chip: 'bg-status-done-soft text-status-done-fg border-status-done/20',
    surface: 'bg-status-done-soft text-status-done-fg',
    rule: 'bg-status-done',
    next: null,
  },
};

/** Safe lookup — falls back to `pending` for unexpected values from the API. */
export function statusConfig(level: string | null | undefined): StatusConfig {
  return STATUS[(level as CompletionLevel) ?? 'pending'] ?? STATUS.pending;
}

export function statusLabel(level: string | null | undefined): string {
  return statusConfig(level).label;
}

export const RECURRENCE_LABELS: Record<string, string> = {
  none: 'One-off',
  daily: 'Daily',
  weekly: 'Weekly',
  biweekly: 'Every 2 weeks',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
};

export function recurrenceLabel(value: string | null | undefined): string {
  if (!value) return RECURRENCE_LABELS.none;
  return RECURRENCE_LABELS[value] ?? value;
}
