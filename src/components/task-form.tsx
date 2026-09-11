'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { MultiSelect } from '@/components/multi-select';
import { createTask, updateTask } from '@/app/dashboard/actions';
import { Task, User, Recurrence } from '@/types/task';
import { RECURRENCE_LABELS, STATUS, STATUS_ORDER } from '@/lib/status';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface TaskFormProps {
  task?: Task;
  users: User[];
  onSuccess?: () => void;
}

const RECURRENCE_OPTIONS: Recurrence[] = [
  'none',
  'daily',
  'weekly',
  'biweekly',
  'monthly',
  'quarterly',
  'yearly',
];

function FieldLabel({
  htmlFor,
  children,
  required,
  hint,
}: {
  htmlFor?: string;
  children: React.ReactNode;
  required?: boolean;
  hint?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <Label htmlFor={htmlFor} className="text-sm font-semibold text-foreground">
        {children}
        {required && (
          <span className="text-destructive" aria-hidden>
            *
          </span>
        )}
      </Label>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </div>
  );
}

export function TaskForm({ task, users, onSuccess }: TaskFormProps) {
  const isEditing = !!task;
  const [loading, setLoading] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);

  const [title, setTitle] = useState(task?.title ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const [dateRequired, setDateRequired] = useState<Date>(
    task ? new Date(task.date_required) : new Date()
  );
  const [completionLevel, setCompletionLevel] = useState(
    task?.completion_level ?? 'pending'
  );
  const [recurrence, setRecurrence] = useState<Recurrence>(task?.recurrence ?? 'none');
  const [selectedIds, setSelectedIds] = useState<string[]>(
    task?.assignees?.map((a) => a.id) ?? []
  );

  const noAssignees = selectedIds.length === 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);

    const formData = new FormData();
    formData.set('title', title.trim());
    formData.set('description', description);
    formData.set('date_required', format(dateRequired, 'yyyy-MM-dd'));
    formData.set('completion_level', completionLevel);
    // Recurrence and metadata are both persisted by the server action. The form
    // used to omit recurrence and post an empty metadata array, so every edit
    // silently reset a repeating task to one-off and wiped its details.
    formData.set('recurrence', recurrence);
    formData.set('assignee_ids', JSON.stringify(selectedIds));
    formData.set('metadata', JSON.stringify(task?.metadata ?? []));

    const result =
      isEditing && task ? await updateTask(task.id, formData) : await createTask(formData);

    setLoading(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success(isEditing ? 'Task updated' : 'Task created');
    if (!isEditing) {
      setTitle('');
      setDescription('');
      setDateRequired(new Date());
      setCompletionLevel('pending');
      setRecurrence('none');
      setSelectedIds([]);
    }
    onSuccess?.();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <FieldLabel htmlFor="title" required>
          Title
        </FieldLabel>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Collect permission slips for the trip"
          required
          autoFocus={!isEditing}
        />
      </div>

      <div className="space-y-2">
        <FieldLabel htmlFor="description" hint="Optional">
          Notes
        </FieldLabel>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Instructions, context, or anything the assignee should know."
          rows={4}
          className="resize-none"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <FieldLabel required>Date required</FieldLabel>
          <Popover open={dateOpen} onOpenChange={setDateOpen}>
            <PopoverTrigger
              render={
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    'w-full justify-start font-medium',
                    !dateRequired && 'text-muted-foreground'
                  )}
                />
              }
            >
              <CalendarIcon size={15} className="text-muted-foreground" />
              {dateRequired ? format(dateRequired, 'PPP') : 'Pick a date'}
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2" align="start">
              <Calendar
                mode="single"
                selected={dateRequired}
                onSelect={(date) => {
                  if (date) {
                    setDateRequired(date);
                    setDateOpen(false);
                  }
                }}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <FieldLabel>Repeats</FieldLabel>
          <Select
            value={recurrence}
            onValueChange={(value) => {
              if (value) setRecurrence(value as Recurrence);
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RECURRENCE_OPTIONS.map((value) => (
                <SelectItem key={value} value={value}>
                  {RECURRENCE_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <FieldLabel>Status</FieldLabel>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {STATUS_ORDER.map((key) => {
            const config = STATUS[key];
            const active = completionLevel === key;
            return (
              <button
                key={key}
                type="button"
                aria-pressed={active}
                onClick={() => setCompletionLevel(key)}
                className={cn(
                  'flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-xs font-semibold transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30',
                  active
                    ? cn(config.chip, 'border-transparent ring-1 ring-inset ring-current/20')
                    : 'border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <span className={cn('size-1.5 rounded-full', config.dot)} />
                {config.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <FieldLabel required>Assigned to</FieldLabel>
        <MultiSelect users={users} selectedIds={selectedIds} onChange={setSelectedIds} />
        <p
          className={cn(
            'text-xs',
            noAssignees ? 'font-medium text-destructive' : 'text-muted-foreground'
          )}
        >
          {noAssignees
            ? 'Pick at least one person before saving.'
            : `${selectedIds.length} ${selectedIds.length === 1 ? 'person' : 'people'} assigned.`}
        </p>
      </div>

      <div className="-mx-5 -mb-5 flex justify-end gap-2 border-t border-border bg-subtle p-4 sm:-mx-6 sm:-mb-6 sm:p-5">
        <Button type="submit" disabled={loading || noAssignees || !title.trim()}>
          {loading && <Loader2 size={15} className="animate-spin" />}
          {loading ? 'Saving…' : isEditing ? 'Save changes' : 'Create task'}
        </Button>
      </div>
    </form>
  );
}
