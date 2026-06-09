'use client';

import { useState, useMemo } from 'react';
import { Search, Plus, ListTodo } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TaskCard } from '@/components/task-card';
import { TaskForm } from '@/components/task-form';
import { Task, User, CompletionLevel } from '@/types/task';
import { cn } from '@/lib/utils';

interface TaskBoardProps {
  tasks: Task[];
  users: User[];
  currentUserId: string;
  isAdmin: boolean;
  title?: string;
}

const columns: { key: CompletionLevel; label: string; color: string }[] = [
  { key: 'pending', label: 'Pending', color: 'border-t-muted-foreground' },
  { key: 'in_progress', label: 'In Progress', color: 'border-t-blue-500' },
  { key: 'review', label: 'Review', color: 'border-t-amber-500' },
  { key: 'completed', label: 'Completed', color: 'border-t-emerald-500' },
];

export function TaskBoard({
  tasks,
  users,
  currentUserId,
  isAdmin,
  title,
}: TaskBoardProps) {
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [createOpen, setCreateOpen] = useState(false);

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      const matchesSearch =
        !search ||
        t.title.toLowerCase().includes(search.toLowerCase()) ||
        t.description?.toLowerCase().includes(search.toLowerCase());
      const matchesLevel = levelFilter === 'all' || t.completion_level === levelFilter;
      return matchesSearch && matchesLevel;
    });
  }, [tasks, search, levelFilter]);

  const grouped = useMemo(() => {
    const map: Record<string, Task[]> = {};
    for (const col of columns) {
      map[col.key] = filtered.filter((t) => t.completion_level === col.key);
    }
    return map;
  }, [filtered]);

  return (
    <div className="space-y-5">
      {/* Header with title and create */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          {title && (
            <h2 className="text-xl font-semibold text-foreground">{title}</h2>
          )}
          <p className="text-sm text-muted-foreground">
            {tasks.length} task{tasks.length !== 1 ? 's' : ''}
          </p>
        </div>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger>
            <Button className="bg-primary hover:bg-secondary text-primary-foreground gap-2">
              <Plus size={16} />
              New Task
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>Create Task</DialogTitle>
              <DialogDescription>
                Assign a new task to one or more staff members.
              </DialogDescription>
            </DialogHeader>
            <TaskForm
              users={users}
              onSuccess={() => setCreateOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 border-border focus:border-border"
          />
        </div>
        <Select value={levelFilter} onValueChange={(value) => { if (value) setLevelFilter(value); }}>
          <SelectTrigger className="w-full sm:w-44 border-border">
            <SelectValue placeholder="All levels" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="review">Review</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Board columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {columns.map((col) => (
          <div key={col.key} className="min-w-0">
            <div
              className={cn(
                'flex items-center justify-between px-3 py-2 mb-3 rounded-t-lg border-t-2 bg-card border-x border-border',
                col.color
              )}
            >
              <span className="text-sm font-semibold text-secondary-foreground">
                {col.label}
              </span>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {grouped[col.key]?.length ?? 0}
              </span>
            </div>

            <div className="space-y-3">
              {grouped[col.key]?.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center border border-dashed border-border rounded-lg bg-background/50">
                  <ListTodo size={24} className="text-muted-foreground mb-2" />
                  <p className="text-xs text-muted-foreground">No tasks</p>
                </div>
              ) : (
                grouped[col.key]?.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    users={users}
                    currentUserId={currentUserId}
                    isAdmin={isAdmin}
                  />
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
