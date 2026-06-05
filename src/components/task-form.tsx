'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { MultiSelect } from '@/components/multi-select';
import { createTask, updateTask } from '@/app/dashboard/actions';
import { Task, User } from '@/types/task';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface TaskFormProps {
  task?: Task;
  users: User[];
  onSuccess?: () => void;
}

const LEVELS = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'review', label: 'Review' },
  { value: 'completed', label: 'Completed' },
];

export function TaskForm({ task, users, onSuccess }: TaskFormProps) {
  const isEditing = !!task;
  const [loading, setLoading] = useState(false);

  const [title, setTitle] = useState(task?.title ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const [dateRequired, setDateRequired] = useState<Date>(
    task ? new Date(task.date_required) : new Date()
  );
  const [completionLevel, setCompletionLevel] = useState(
    task?.completion_level ?? 'pending'
  );
  const [selectedIds, setSelectedIds] = useState<string[]>(
    task?.assignees?.map((a) => a.id) ?? []
  );

  // Pre-populate assignees if editing
  useEffect(() => {
    if (task?.assignees) {
      setSelectedIds(task.assignees.map((a) => a.id));
    }
  }, [task]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData();
    formData.set('title', title);
    formData.set('description', description);
    formData.set('date_required', format(dateRequired, 'yyyy-MM-dd'));
    formData.set('completion_level', completionLevel);
    formData.set('assignee_ids', JSON.stringify(selectedIds));
    formData.set('metadata', JSON.stringify([]));

    let result;
    if (isEditing && task) {
      result = await updateTask(task.id, formData);
    } else {
      result = await createTask(formData);
    }

    setLoading(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(isEditing ? 'Task updated' : 'Task created');
      if (!isEditing) {
        setTitle('');
        setDescription('');
        setDateRequired(new Date());
        setCompletionLevel('pending');
        setSelectedIds([]);
        setMetadata([]);
      }
      onSuccess?.();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="title" className="text-sm font-medium text-slate-700">
          Title
        </Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Task title..."
          required
          className="border-slate-300 focus:border-slate-900"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description" className="text-sm font-medium text-slate-700">
          Description / Comments
        </Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add notes, instructions, or comments..."
          rows={4}
          className="border-slate-300 focus:border-slate-900 resize-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium text-slate-700">
            Date Required
          </Label>
          <Popover>
        <PopoverTrigger>
          <Button
            variant="outline"
            className={cn(
              'w-full justify-start text-left font-normal border-slate-300',
              !dateRequired && 'text-slate-400'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {dateRequired ? format(dateRequired, 'PPP') : 'Pick a date'}
          </Button>
        </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateRequired}
                onSelect={(date) => date && setDateRequired(date)}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium text-slate-700">
            Completion Level
          </Label>
          <Select value={completionLevel} onValueChange={(value) => { if (value) setCompletionLevel(value as typeof completionLevel); }}>
            <SelectTrigger className="border-slate-300">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LEVELS.map((l) => (
                <SelectItem key={l.value} value={l.value}>
                  {l.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium text-slate-700">
          Assigned To
        </Label>
        <MultiSelect
          users={users}
          selectedIds={selectedIds}
          onChange={setSelectedIds}
        />
        {selectedIds.length === 0 && (
          <p className="text-xs text-amber-600">At least one assignee is required</p>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button
          type="submit"
          disabled={loading || selectedIds.length === 0}
          className="bg-slate-900 hover:bg-slate-800 text-white"
        >
          {loading ? 'Saving...' : isEditing ? 'Update Task' : 'Create Task'}
        </Button>
      </div>
    </form>
  );
}
