'use client';

import { useMemo, useState } from 'react';
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
  addWeeks,
} from 'date-fns';
import { CalendarDays, ChevronLeft, ChevronRight, Repeat, Users } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { MetaChip, StatusBadge } from '@/components/status-badge';
import { UserAvatar } from '@/components/user-avatar';
import { STATUS, STATUS_ORDER, recurrenceLabel, statusConfig } from '@/lib/status';
import { cn } from '@/lib/utils';
import type { Task, User } from '@/types/task';

interface CalendarViewProps {
  tasks: Task[];
  users: User[];
  currentUserId: string;
  isAdmin: boolean;
}

const DAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MAX_PILLS = 3;

function expandRecurringTasks(
  tasks: Task[],
  rangeStart: Date,
  rangeEnd: Date
): Map<string, Task[]> {
  const map = new Map<string, Task[]>();

  const push = (date: Date, task: Task) => {
    const key = format(date, 'yyyy-MM-dd');
    const list = map.get(key) ?? [];
    list.push(task);
    map.set(key, list);
  };

  for (const task of tasks) {
    const base = parseISO(task.date_required);
    if (Number.isNaN(base.getTime())) continue;

    if (!task.recurrence || task.recurrence === 'none') {
      if (base >= rangeStart && base <= rangeEnd) push(base, task);
      continue;
    }

    let cursor = base;
    let iterations = 0;
    const maxIterations = 5000;

    while (cursor <= rangeEnd && iterations < maxIterations) {
      iterations++;
      if (cursor >= rangeStart) push(cursor, task);

      switch (task.recurrence) {
        case 'daily':
          cursor = addDays(cursor, 1);
          break;
        case 'weekly':
          cursor = addWeeks(cursor, 1);
          break;
        case 'biweekly':
          cursor = addWeeks(cursor, 2);
          break;
        case 'monthly':
          cursor = addMonths(cursor, 1);
          break;
        case 'quarterly':
          cursor = addMonths(cursor, 3);
          break;
        case 'yearly':
          cursor = addMonths(cursor, 12);
          break;
        default:
          cursor = addMonths(cursor, 1200);
          break;
      }
    }
  }

  return map;
}

function TaskDetail({ task }: { task: Task }) {
  const dateObj = new Date(task.date_required);

  return (
    <div className="space-y-5">
      {task.description && (
        <section>
          <p className="mb-1.5 text-[0.7rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">
            Description
          </p>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
            {task.description}
          </p>
        </section>
      )}

      {task.assignees && task.assignees.length > 0 && (
        <section>
          <p className="mb-2 text-[0.7rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">
            Assigned to
          </p>
          <div className="flex flex-wrap gap-2">
            {task.assignees.map((a) => (
              <div
                key={a.id}
                className="flex items-center gap-2.5 rounded-lg border border-border bg-subtle py-1.5 pl-1.5 pr-3"
              >
                <UserAvatar name={a.name} size="sm" />
                <div className="leading-tight">
                  <p className="text-sm font-semibold text-foreground">{a.name}</p>
                  <p className="text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    {a.role}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {task.metadata && task.metadata.length > 0 && (
        <section>
          <p className="mb-2 text-[0.7rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">
            Details
          </p>
          <dl className="divide-y divide-border overflow-hidden rounded-lg border border-border">
            {task.metadata.map((m, i) => (
              <div key={`${m.key}-${i}`} className="flex gap-3 px-3 py-2 text-sm">
                <dt className="min-w-24 font-semibold text-muted-foreground">{m.key}</dt>
                <dd className="text-foreground">{String(m.value)}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      <p className="border-t border-border pt-4 text-xs text-muted-foreground">
        Due {format(dateObj, 'EEEE, MMMM d, yyyy')}
      </p>
    </div>
  );
}

export default function CalendarView({ tasks }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [dayView, setDayView] = useState<{ date: Date; tasks: Task[] } | null>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart);
  const calEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  // Expanding across the whole visible grid (not just the month) means the
  // leading and trailing days stop looking mysteriously empty.
  const tasksByDate = useMemo(
    () => expandRecurringTasks(tasks, calStart, calEnd),
    [tasks, calStart, calEnd]
  );

  const monthCount = useMemo(() => {
    let total = 0;
    for (const day of days) {
      if (!isSameMonth(day, currentMonth)) continue;
      total += tasksByDate.get(format(day, 'yyyy-MM-dd'))?.length ?? 0;
    }
    return total;
  }, [days, tasksByDate, currentMonth]);

  return (
    <div className="space-y-4">
      {/* ---------------- Toolbar ---------------- */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 shadow-xs">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
            aria-label="Previous month"
          >
            <ChevronLeft size={16} />
          </Button>
          <h2 className="min-w-40 text-center text-base font-bold tracking-tight text-foreground sm:text-lg">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
            aria-label="Next month"
          >
            <ChevronRight size={16} />
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden text-xs font-medium text-muted-foreground sm:inline">
            {monthCount} {monthCount === 1 ? 'item' : 'items'} this month
          </span>
          <Button variant="subtle" size="sm" onClick={() => setCurrentMonth(new Date())}>
            Today
          </Button>
        </div>
      </div>

      {/* ---------------- Grid ---------------- */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
        <div className="grid grid-cols-7 border-b border-border bg-subtle">
          {DAY_HEADERS.map((day) => (
            <div
              key={day}
              className="py-2 text-center text-[0.7rem] font-bold uppercase tracking-[0.08em] text-muted-foreground"
            >
              <span className="hidden sm:inline">{day}</span>
              <span className="sm:hidden">{day.charAt(0)}</span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {days.map((day) => {
            const key = format(day, 'yyyy-MM-dd');
            const dayTasks = tasksByDate.get(key) ?? [];
            const inMonth = isSameMonth(day, currentMonth);
            const today = isToday(day);

            return (
              <div
                key={key}
                className={cn(
                  'relative min-h-24 border-b border-r border-border p-1.5 last:border-r-0 sm:min-h-28',
                  inMonth ? 'bg-card' : 'bg-subtle'
                )}
              >
                <div className="mb-1 flex items-center justify-between gap-1">
                  <span
                    className={cn(
                      'inline-flex size-6 items-center justify-center rounded-full text-xs font-bold tabular-nums',
                      today
                        ? 'bg-secondary text-secondary-foreground'
                        : inMonth
                          ? 'text-foreground'
                          : 'text-muted-foreground/60'
                    )}
                  >
                    {format(day, 'd')}
                  </span>
                  {dayTasks.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setDayView({ date: day, tasks: dayTasks })}
                      className="rounded-md px-1 text-[10px] font-bold tabular-nums text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:hidden"
                      aria-label={`${dayTasks.length} tasks on ${format(day, 'MMMM d')}`}
                    >
                      {dayTasks.length}
                    </button>
                  )}
                </div>

                {/* Desktop pills */}
                <div className="hidden space-y-1 sm:block">
                  {dayTasks.slice(0, MAX_PILLS).map((task, i) => {
                    const config = statusConfig(task.completion_level);
                    return (
                      <button
                        key={`${task.id}-${i}`}
                        type="button"
                        onClick={() => setSelectedTask(task)}
                        title={`${task.title} — ${config.label}`}
                        className={cn(
                          'flex w-full items-center gap-1.5 rounded-md px-1.5 py-1 text-left text-[11px] font-semibold transition-opacity hover:opacity-80',
                          config.surface
                        )}
                      >
                        <span className={cn('size-1.5 shrink-0 rounded-full', config.dot)} />
                        <span
                          className={cn(
                            'truncate',
                            task.completion_level === 'completed' && 'line-through opacity-70'
                          )}
                        >
                          {task.title}
                        </span>
                      </button>
                    );
                  })}
                  {dayTasks.length > MAX_PILLS && (
                    <button
                      type="button"
                      onClick={() => setDayView({ date: day, tasks: dayTasks })}
                      className="w-full rounded-md px-1.5 py-0.5 text-left text-[11px] font-bold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      +{dayTasks.length - MAX_PILLS} more
                    </button>
                  )}
                </div>

                {/* Mobile dots */}
                <button
                  type="button"
                  onClick={() => dayTasks.length > 0 && setDayView({ date: day, tasks: dayTasks })}
                  disabled={dayTasks.length === 0}
                  aria-label={`Open ${format(day, 'MMMM d')}`}
                  className="flex w-full flex-wrap gap-1 rounded-md py-0.5 disabled:pointer-events-none sm:hidden"
                >
                  {dayTasks.slice(0, 6).map((task, i) => (
                    <span
                      key={`${task.id}-${i}`}
                      className={cn(
                        'size-1.5 rounded-full',
                        statusConfig(task.completion_level).dot
                      )}
                    />
                  ))}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* ---------------- Legend ---------------- */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-1 text-xs text-muted-foreground">
        <span className="font-bold uppercase tracking-[0.08em]">Status</span>
        {STATUS_ORDER.map((key) => (
          <span key={key} className="flex items-center gap-1.5 font-medium">
            <span className={cn('size-2 rounded-full', STATUS[key].dot)} />
            {STATUS[key].label}
          </span>
        ))}
      </div>

      {/* ---------------- Day dialog ---------------- */}
      <Dialog open={!!dayView} onOpenChange={(open) => !open && setDayView(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {dayView ? format(dayView.date, 'EEEE, MMMM d') : ''}
            </DialogTitle>
            <DialogDescription>
              {dayView?.tasks.length ?? 0} {dayView?.tasks.length === 1 ? 'task' : 'tasks'} due
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            {dayView?.tasks.length === 0 ? (
              <EmptyState size="sm" icon={CalendarDays} title="Nothing due" />
            ) : (
              dayView?.tasks.map((task, i) => (
                <button
                  key={`${task.id}-${i}`}
                  type="button"
                  onClick={() => {
                    setDayView(null);
                    setSelectedTask(task);
                  }}
                  className="flex w-full items-start gap-3 rounded-lg border border-border bg-card p-3 text-left transition-colors hover:bg-muted"
                >
                  <span
                    className={cn(
                      'mt-1.5 size-2 shrink-0 rounded-full',
                      statusConfig(task.completion_level).dot
                    )}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-foreground">{task.title}</span>
                    {task.assignees && task.assignees.length > 0 && (
                      <span className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                        <Users size={11} />
                        {task.assignees.map((a) => a.name).join(', ')}
                      </span>
                    )}
                  </span>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ---------------- Task detail dialog ---------------- */}
      <Dialog open={!!selectedTask} onOpenChange={(open) => !open && setSelectedTask(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
          {selectedTask && (
            <>
              <DialogHeader>
                <div className="mb-1 flex flex-wrap items-center gap-1.5">
                  <StatusBadge level={selectedTask.completion_level} size="md" />
                  {selectedTask.recurrence && selectedTask.recurrence !== 'none' && (
                    <MetaChip>
                      <Repeat size={11} />
                      {recurrenceLabel(selectedTask.recurrence)}
                    </MetaChip>
                  )}
                </div>
                <DialogTitle className="text-xl">{selectedTask.title}</DialogTitle>
                <DialogDescription className="flex items-center gap-1.5">
                  <CalendarDays size={14} className="shrink-0" />
                  Due {format(new Date(selectedTask.date_required), 'EEEE, MMMM d, yyyy')}
                </DialogDescription>
              </DialogHeader>
              <TaskDetail task={selectedTask} />
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
