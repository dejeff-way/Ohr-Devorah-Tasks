'use client';

import { useMemo, useState } from 'react';
import { ListTodo, Plus, Search, SlidersHorizontal, X } from 'lucide-react';

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
import { EmptyState } from '@/components/ui/empty-state';
import { TaskCard } from '@/components/task-card';
import { TaskForm } from '@/components/task-form';
import { Task, User, CompletionLevel } from '@/types/task';
import { STATUS, STATUS_ORDER } from '@/lib/status';
import { cn } from '@/lib/utils';

interface TaskBoardProps {
  tasks: Task[];
  users: User[];
  currentUserId: string;
  isAdmin: boolean;
  title?: string;
}

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

  const hasFilters = search.trim().length > 0 || levelFilter !== 'all';

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return tasks.filter((t) => {
      const matchesSearch =
        !needle ||
        t.title.toLowerCase().includes(needle) ||
        t.description?.toLowerCase().includes(needle) ||
        t.assignees?.some((a) => a.name.toLowerCase().includes(needle));
      const matchesLevel = levelFilter === 'all' || t.completion_level === levelFilter;
      return matchesSearch && matchesLevel;
    });
  }, [tasks, search, levelFilter]);

  const grouped = useMemo(() => {
    const map = {} as Record<CompletionLevel, Task[]>;
    for (const key of STATUS_ORDER) {
      map[key] = filtered.filter((t) => t.completion_level === key);
    }
    return map;
  }, [filtered]);

  const totals = useMemo(() => {
    const map = {} as Record<CompletionLevel, number>;
    for (const key of STATUS_ORDER) {
      map[key] = tasks.filter((t) => t.completion_level === key).length;
    }
    return map;
  }, [tasks]);

  function clearFilters() {
    setSearch('');
    setLevelFilter('all');
  }

  return (
    <div className="space-y-5">
      {/* ---------------- Summary ---------------- */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {STATUS_ORDER.map((key) => {
          const config = STATUS[key];
          const selected = levelFilter === key;
          return (
            <button
              key={key}
              type="button"
              aria-pressed={selected}
              onClick={() => setLevelFilter(selected ? 'all' : key)}
              className={cn(
                'group flex items-center gap-3 rounded-xl border bg-card px-3.5 py-3 text-left shadow-xs transition-all outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30',
                selected
                  ? 'border-secondary/40 ring-[3px] ring-secondary/10'
                  : 'border-border hover:border-border-strong hover:shadow-sm'
              )}
            >
              <span className={cn('size-2.5 shrink-0 rounded-full', config.dot)} />
              <span className="min-w-0 leading-tight">
                <span className="block text-lg font-extrabold tabular-nums text-foreground">
                  {totals[key]}
                </span>
                <span className="block truncate text-[0.7rem] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                  {config.label}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {/* ---------------- Toolbar ---------------- */}
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 shadow-xs sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            placeholder="Search by title, notes or person…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-9"
            aria-label="Search tasks"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Select
            value={levelFilter}
            onValueChange={(value) => {
              if (value) setLevelFilter(value as string);
            }}
          >
            <SelectTrigger className="w-full sm:w-44" aria-label="Filter by status">
              <SlidersHorizontal size={14} className="text-muted-foreground" />
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUS_ORDER.map((key) => (
                <SelectItem key={key} value={key}>
                  {STATUS[key].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasFilters && (
            <Button variant="ghost" size="icon-sm" onClick={clearFilters} aria-label="Clear filters">
              <X size={15} />
            </Button>
          )}

          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger render={<Button className="shrink-0" />}>
              <Plus size={16} />
              New task
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
              <DialogHeader>
                <DialogTitle>Create task</DialogTitle>
                <DialogDescription>
                  Assign a new task to one or more staff members.
                </DialogDescription>
              </DialogHeader>
              <TaskForm users={users} onSuccess={() => setCreateOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* ---------------- Context line ---------------- */}
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        {title && (
          <h2 className="text-base font-bold tracking-tight text-foreground">{title}</h2>
        )}
        <p className="text-xs font-medium text-muted-foreground">
          {hasFilters
            ? `${filtered.length} of ${tasks.length} task${tasks.length === 1 ? '' : 's'} shown`
            : `${tasks.length} task${tasks.length === 1 ? '' : 's'}`}
        </p>
      </div>

      {/* ---------------- Board ---------------- */}
      {tasks.length === 0 ? (
        <EmptyState
          icon={ListTodo}
          title="No tasks yet"
          description="Create the first task and assign it to whoever needs to pick it up."
          action={
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus size={15} />
              New task
            </Button>
          }
        />
      ) : (
        <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 xl:grid-cols-4">
          {STATUS_ORDER.map((key) => {
            const config = STATUS[key];
            const columnTasks = grouped[key] ?? [];
            return (
              <section
                key={key}
                aria-label={config.label}
                className="flex w-[85vw] shrink-0 snap-start flex-col sm:w-auto sm:shrink"
              >
                <div className="sticky top-0 z-10 mb-3 overflow-hidden rounded-xl border border-border bg-card shadow-xs">
                  <span aria-hidden className={cn('block h-1 w-full', config.rule)} />
                  <div className="flex items-center justify-between gap-2 px-3.5 py-2.5">
                    <span className="text-sm font-bold tracking-tight text-foreground">
                      {config.label}
                    </span>
                    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1.5 text-[11px] font-bold tabular-nums text-muted-foreground">
                      {columnTasks.length}
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  {columnTasks.length === 0 ? (
                    <EmptyState size="sm" icon={ListTodo} title="Nothing here" />
                  ) : (
                    columnTasks.map((task) => (
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
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
