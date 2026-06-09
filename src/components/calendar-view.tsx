'use client';

import { useState, useMemo } from 'react';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  addMonths,
  subMonths,
  parseISO,
  addDays,
  addWeeks,
} from 'date-fns';
import { ChevronLeft, ChevronRight, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Task, User, CompletionLevel } from '@/types/task';

interface CalendarViewProps {
  tasks: Task[];
  users: User[];
  currentUserId: string;
  isAdmin: boolean;
}

const STATUS_COLORS: Record<CompletionLevel, { dot: string; bg: string; text: string }> = {
  pending:     { dot: 'bg-amber-500',  bg: 'bg-amber-50',  text: 'text-amber-800' },
  in_progress: { dot: 'bg-blue-500',   bg: 'bg-blue-50',   text: 'text-blue-800' },
  review:      { dot: 'bg-purple-500', bg: 'bg-purple-50', text: 'text-purple-800' },
  completed:   { dot: 'bg-green-500',  bg: 'bg-green-50',  text: 'text-green-800' },
};

function expandRecurringTasks(
  tasks: Task[],
  monthStart: Date,
  monthEnd: Date,
): Map<string, Task[]> {
  const map = new Map<string, Task[]>();

  for (const task of tasks) {
    const base = parseISO(task.date_required);

    if (task.recurrence === 'none') {
      if (base >= monthStart && base <= monthEnd) {
        const key = format(base, 'yyyy-MM-dd');
        const list = map.get(key) ?? [];
        list.push(task);
        map.set(key, list);
      }
      continue;
    }

    // Expand recurring: walk forward from base date
    let cursor = base;
    // Safety limit to avoid infinite loops
    let iterations = 0;
    const maxIterations = 5000;

    while (cursor <= monthEnd && iterations < maxIterations) {
      iterations++;
      if (cursor >= monthStart) {
        const key = format(cursor, 'yyyy-MM-dd');
        const list = map.get(key) ?? [];
        list.push(task);
        map.set(key, list);
      }

      switch (task.recurrence) {
        case 'daily':     cursor = addDays(cursor, 1);   break;
        case 'weekly':    cursor = addWeeks(cursor, 1);  break;
        case 'biweekly':  cursor = addWeeks(cursor, 2);  break;
        case 'monthly':   cursor = addMonths(cursor, 1); break;
        case 'quarterly': cursor = addMonths(cursor, 3); break;
        case 'yearly':    cursor = addMonths(cursor, 12); break;
        default:          cursor = addMonths(cursor, 1200); break; // safety escape
      }
    }
  }

  return map;
}

function TaskPill({ task, compact }: { task: Task; compact: boolean }) {
  const colors = STATUS_COLORS[task.completion_level];
  const [detailOpen, setDetailOpen] = useState(false);
  const dateObj = new Date(task.date_required);

  const pillContent = (
    <div
      className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-xs truncate border cursor-pointer hover:border-secondary transition-colors ${colors.bg} ${colors.text} border-current/20`}
      onClick={(e) => { e.stopPropagation(); setDetailOpen(true); }}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${colors.dot} flex-shrink-0`} />
      <span className={`truncate ${task.completion_level === 'completed' ? 'line-through opacity-70' : ''}`}>
        {task.title}
      </span>
    </div>
  );

  if (compact) {
    return (
      <span
        className={`inline-block w-2 h-2 rounded-full ${colors.dot} flex-shrink-0 cursor-pointer hover:scale-125 transition-transform`}
        title={`${task.title} — ${task.completion_level.replace('_', ' ')}`}
      />
    );
  }

  return (
    <>
      <Popover>
        <PopoverTrigger>
          {pillContent}
        </PopoverTrigger>
        <PopoverContent side="top" align="start" className="w-64 p-3">
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${colors.dot} flex-shrink-0`} />
              <Badge variant="outline" className="text-[10px] font-medium px-1.5 py-0">
                {task.completion_level.replace('_', ' ')}
              </Badge>
              {task.recurrence !== 'none' && (
                <span className="text-[10px] text-muted-foreground">{task.recurrence}</span>
              )}
            </div>
            <p className="text-sm font-extrabold text-foreground leading-snug">{task.title}</p>
            {task.description && (
              <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
            )}
            {task.assignees && task.assignees.length > 0 && (
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Users size={11} />
                {task.assignees.map((a) => a.name).join(', ')}
              </div>
            )}
            <p className="text-[11px] text-muted-foreground">
              Due {format(dateObj, 'EEE, MMM d')}
            </p>
            <p className="text-[11px] font-semibold text-secondary">Click for full details</p>
          </div>
        </PopoverContent>
      </Popover>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <span className={`h-2.5 w-2.5 rounded-full ${colors.dot}`} />
              <Badge variant="outline" className={`text-xs font-medium px-2 py-0 ${colors.bg} ${colors.text}`}>
                {task.completion_level.replace('_', ' ')}
              </Badge>
              {task.recurrence !== 'none' && (
                <Badge variant="outline" className="text-xs bg-muted text-muted-foreground">
                  {task.recurrence}
                </Badge>
              )}
            </div>
            <DialogTitle className="text-xl font-extrabold tracking-tight">{task.title}</DialogTitle>
            <DialogDescription className="text-sm font-semibold text-muted-foreground">
              Due {format(dateObj, 'EEEE, MMMM d, yyyy')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 mt-2">
            {task.description && (
              <div>
                <p className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground mb-1">Description</p>
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{task.description}</p>
              </div>
            )}

            {task.assignees && task.assignees.length > 0 && (
              <div>
                <p className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground mb-2">Assigned to</p>
                <div className="flex flex-wrap gap-2">
                  {task.assignees.map((a) => (
                    <div key={a.id} className="flex items-center gap-2 rounded-xl border-2 border-border bg-muted px-3 py-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-extrabold text-primary-foreground">
                        {a.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-extrabold text-foreground">{a.name}</p>
                        <p className="text-[11px] font-semibold text-muted-foreground">{a.role}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {task.metadata && task.metadata.length > 0 && (
              <div>
                <p className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground mb-2">Details</p>
                <div className="space-y-1">
                  {task.metadata.map((m, i) => (
                    <div key={i} className="flex gap-2 text-sm">
                      <span className="font-extrabold text-muted-foreground">{m.key}:</span>
                      <span className="text-foreground">{String(m.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

const DAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CalendarView({ tasks, users, currentUserId, isAdmin }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart);
  const calEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const tasksByDate = useMemo(
    () => expandRecurringTasks(tasks, monthStart, monthEnd),
    [tasks, monthStart, monthEnd],
  );

  const prevMonth = () => setCurrentMonth((m) => subMonths(m, 1));
  const nextMonth = () => setCurrentMonth((m) => addMonths(m, 1));
  const goToday = () => setCurrentMonth(new Date());

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon-sm" onClick={prevMonth}>
            <ChevronLeft size={16} />
          </Button>
          <h2 className="text-lg font-semibold text-foreground min-w-[140px] text-center">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
          <Button variant="outline" size="icon-sm" onClick={nextMonth}>
            <ChevronRight size={16} />
          </Button>
        </div>
        <Button variant="outline" size="xs" onClick={goToday}>
          Today
        </Button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_HEADERS.map((day) => (
          <div
            key={day}
            className="text-center text-xs font-medium text-muted-foreground py-2 border-b border-border"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 flex-1 border-l border-t border-border rounded-lg overflow-hidden">
        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd');
          const dayTasks = tasksByDate.get(key) ?? [];
          const inMonth = isSameMonth(day, currentMonth);
          const today = isToday(day);

          return (
            <div
              key={key}
              className={`min-h-[80px] sm:min-h-[100px] border-r border-b border-border p-1.5 ${
                inMonth ? 'bg-card' : 'bg-background/50'
              }`}
            >
              {/* Date number */}
              <div className="flex justify-end mb-0.5">
                <span
                  className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${
                    today
                      ? 'bg-primary text-primary-foreground'
                      : inMonth
                        ? 'text-secondary'
                        : 'text-muted-foreground'
                  }`}
                >
                  {format(day, 'd')}
                </span>
              </div>

              {/* Task pills */}
              <div className="space-y-0.5">
                {/* Desktop: full pills */}
                <div className="hidden sm:block space-y-0.5">
                  {dayTasks.slice(0, 3).map((task) => (
                    <TaskPill key={task.id} task={task} compact={false} />
                  ))}
                  {dayTasks.length > 3 && (
                    <p className="text-[10px] text-muted-foreground pl-1">
                      +{dayTasks.length - 3} more
                    </p>
                  )}
                </div>

                {/* Mobile: compact dots */}
                <div className="flex flex-wrap gap-0.5 sm:hidden">
                  {dayTasks.slice(0, 5).map((task) => (
                    <TaskPill key={task.id} task={task} compact={true} />
                  ))}
                  {dayTasks.length > 5 && (
                    <span className="text-[10px] text-muted-foreground ml-0.5">
                      +{dayTasks.length - 5}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 mt-4 px-1 text-xs text-muted-foreground">
        <span className="font-medium">Status:</span>
        {(Object.entries(STATUS_COLORS) as [CompletionLevel, typeof STATUS_COLORS['pending']][]).map(
          ([level, colors]) => (
            <span key={level} className="flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${colors.dot}`} />
              {level.replace('_', ' ')}
            </span>
          ),
        )}
      </div>
    </div>
  );
}
