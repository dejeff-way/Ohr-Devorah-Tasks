'use client';

import { useState } from 'react';
import { format, isToday, isTomorrow } from 'date-fns';
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Circle,
  MoreHorizontal,
  Pencil,
  Repeat,
  Trash2,
  Users,
} from 'lucide-react';

import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { TaskForm } from '@/components/task-form';
import { MetadataDisplay } from '@/components/metadata-display';
import { TaskActivityLog } from '@/components/task-activity';
import { MetaChip, OverdueBadge, StatusBadge } from '@/components/status-badge';
import { AvatarStack, UserAvatar } from '@/components/user-avatar';
import { deleteTask, updateCompletionLevel } from '@/app/dashboard/actions';
import { Task, User, MetadataEntry } from '@/types/task';
import { recurrenceLabel, statusConfig } from '@/lib/status';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface TaskCardProps {
  task: Task;
  users: User[];
  currentUserId: string;
  isAdmin: boolean;
}

function friendlyDate(date: Date) {
  if (isToday(date)) return 'Today';
  if (isTomorrow(date)) return 'Tomorrow';
  return format(date, 'MMM d, yyyy');
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 text-[0.7rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">
      {children}
    </p>
  );
}

export function TaskCard({ task, users, currentUserId, isAdmin }: TaskCardProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [advancing, setAdvancing] = useState(false);

  const config = statusConfig(task.completion_level);
  const assigneeNames = task.assignees?.map((a) => a.name) ?? [];
  const dateObj = new Date(task.date_required);
  const isOverdue = dateObj < new Date() && task.completion_level !== 'completed';
  const isCreator = task.created_by === currentUserId;
  const isAssignee = task.assignees?.some((a) => a.id === currentUserId) ?? false;
  const canEdit = isAdmin || isCreator || isAssignee;

  const steps = task.steps ? [...task.steps].sort((a, b) => a.step_order - b.step_order) : [];
  const doneSteps = steps.filter((s) => s.is_completed).length;

  const nextStatus = config.next;
  const nextLabel = nextStatus ? statusConfig(nextStatus).label : null;

  async function handleAdvance() {
    if (!nextStatus || advancing) return;
    setAdvancing(true);
    const result = await updateCompletionLevel(task.id, nextStatus);
    setAdvancing(false);
    if (result.error) toast.error(result.error);
    // The old version reported the status *after* the one it had just set.
    else toast.success(`Moved to ${statusConfig(nextStatus).label}`);
  }

  async function handleDelete() {
    setDeleting(true);
    const result = await deleteTask(task.id);
    if (result.error) toast.error(result.error);
    else toast.success('Task deleted');
    setDeleting(false);
    setDeleteConfirm(false);
  }

  return (
    <>
      {/* ---------------- Detail dialog ---------------- */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <div className="mb-1 flex flex-wrap items-center gap-1.5">
              <StatusBadge level={task.completion_level} size="md" />
              {task.recurrence && task.recurrence !== 'none' && (
                <MetaChip>
                  <Repeat size={11} />
                  {recurrenceLabel(task.recurrence)}
                </MetaChip>
              )}
              {isOverdue && <OverdueBadge />}
            </div>
            <DialogTitle className="text-xl">{task.title}</DialogTitle>
            <DialogDescription className="flex items-center gap-1.5 text-sm">
              <CalendarDays size={14} className="shrink-0" />
              Due {format(dateObj, 'EEEE, MMMM d, yyyy')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {task.description && (
              <section>
                <SectionLabel>Description</SectionLabel>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                  {task.description}
                </p>
              </section>
            )}

            {task.assignees && task.assignees.length > 0 && (
              <section>
                <SectionLabel>Assigned to</SectionLabel>
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

            {steps.length > 0 && (
              <section>
                <div className="mb-2 flex items-baseline justify-between gap-3">
                  <SectionLabel>Steps</SectionLabel>
                  <span className="text-[0.7rem] font-bold tabular-nums text-muted-foreground">
                    {doneSteps}/{steps.length}
                  </span>
                </div>
                <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-status-done transition-[width]"
                    style={{ width: `${(doneSteps / steps.length) * 100}%` }}
                  />
                </div>
                <ul className="space-y-1.5">
                  {steps.map((step) => (
                    <li
                      key={step.id}
                      className={cn(
                        'flex items-center gap-2.5 rounded-lg border border-border px-3 py-2.5',
                        step.is_completed ? 'bg-subtle' : 'bg-card'
                      )}
                    >
                      {step.is_completed ? (
                        <CheckCircle2 size={17} className="shrink-0 text-status-done" />
                      ) : (
                        <Circle size={17} className="shrink-0 text-muted-foreground/60" />
                      )}
                      <span
                        className={cn(
                          'flex-1 text-sm font-medium',
                          step.is_completed && 'text-muted-foreground line-through'
                        )}
                      >
                        {step.title}
                      </span>
                      {step.assignee && (
                        <span className="text-xs font-semibold text-muted-foreground">
                          {step.assignee.name}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {task.metadata && task.metadata.length > 0 && (
              <section>
                <SectionLabel>Details</SectionLabel>
                <MetadataDisplay entries={task.metadata as MetadataEntry[]} />
              </section>
            )}

            {detailOpen && (
              <TaskActivityLog
                taskId={task.id}
                currentUserId={currentUserId}
                isAdmin={isAdmin}
                canLog={canEdit}
              />
            )}

            <p className="border-t border-border pt-4 text-xs text-muted-foreground">
              Created {format(new Date(task.created_at), 'MMM d, yyyy')}
              {task.updated_at !== task.created_at && (
                <> · Updated {format(new Date(task.updated_at), 'MMM d, yyyy')}</>
              )}
            </p>
          </div>

          {canEdit && (
            <div className="-mx-5 -mb-5 flex flex-wrap justify-end gap-2 border-t border-border bg-subtle p-4 sm:-mx-6 sm:-mb-6 sm:p-5">
              {(isAdmin || isCreator) && (
                <Button
                  variant="destructive-outline"
                  size="sm"
                  className="mr-auto"
                  onClick={() => {
                    setDetailOpen(false);
                    setDeleteConfirm(true);
                  }}
                >
                  <Trash2 size={14} />
                  Delete
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setDetailOpen(false);
                  setEditOpen(true);
                }}
              >
                <Pencil size={14} />
                Edit
              </Button>
              {nextStatus && (
                <Button size="sm" onClick={handleAdvance} disabled={advancing}>
                  <ArrowRight size={14} />
                  Move to {nextLabel}
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ---------------- Compact card ---------------- */}
      <Card
        size="sm"
        role="button"
        tabIndex={0}
        aria-label={`Open task ${task.title}`}
        className="group relative cursor-pointer gap-0 py-0 transition-shadow hover:shadow-md focus-visible:ring-[3px] focus-visible:ring-ring/30 focus-visible:outline-none"
        onClick={() => setDetailOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setDetailOpen(true);
          }
        }}
      >
        {/* Status rail — the fastest read on a dense board. */}
        <span
          aria-hidden
          className={cn('absolute inset-y-0 left-0 w-1', config.rule)}
        />

        <CardHeader className="flex flex-row items-start justify-between gap-2 py-3 pl-5">
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <StatusBadge level={task.completion_level} />
              {task.recurrence && task.recurrence !== 'none' && (
                <MetaChip>
                  <Repeat size={10} />
                  {recurrenceLabel(task.recurrence)}
                </MetaChip>
              )}
            </div>
            <h3
              className={cn(
                'text-sm font-bold leading-snug text-foreground',
                task.completion_level === 'completed' && 'text-muted-foreground line-through'
              )}
            >
              {task.title}
            </h3>
          </div>

          {canEdit && (
            <div onClick={(e) => e.stopPropagation()}>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Task actions"
                      className="-mr-1 opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100 max-sm:opacity-100"
                    />
                  }
                >
                  <MoreHorizontal size={16} />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setEditOpen(true)}>
                    <Pencil size={14} />
                    Edit task
                  </DropdownMenuItem>
                  {nextStatus && (
                    <DropdownMenuItem onClick={handleAdvance}>
                      <ArrowRight size={14} />
                      Move to {nextLabel}
                    </DropdownMenuItem>
                  )}
                  {(isAdmin || isCreator) && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => setDeleteConfirm(true)}
                      >
                        <Trash2 size={14} />
                        Delete
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </CardHeader>

        {(task.description || (task.metadata && task.metadata.length > 0) || steps.length > 0) && (
          <CardContent className="space-y-2 pb-3 pl-5">
            {task.description && (
              <p className="line-clamp-2 text-[0.8125rem] leading-relaxed text-muted-foreground">
                {task.description}
              </p>
            )}

            {steps.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-status-done"
                    style={{ width: `${(doneSteps / steps.length) * 100}%` }}
                  />
                </div>
                <span className="text-[0.7rem] font-bold tabular-nums text-muted-foreground">
                  {doneSteps}/{steps.length}
                </span>
              </div>
            )}

            {task.metadata && task.metadata.length > 0 && (
              <MetadataDisplay entries={task.metadata as MetadataEntry[]} compact />
            )}
          </CardContent>
        )}

        <CardFooter className="justify-between gap-3 pl-5">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 text-xs font-semibold',
              isOverdue ? 'text-destructive' : 'text-muted-foreground'
            )}
          >
            <CalendarDays size={13} className="shrink-0" />
            {friendlyDate(dateObj)}
            {isOverdue && <span className="font-bold">· Overdue</span>}
          </span>

          {assigneeNames.length > 0 && (
            <span className="flex items-center gap-1.5" title={assigneeNames.join(', ')}>
              <Users size={13} className="text-muted-foreground" />
              <AvatarStack names={assigneeNames} />
            </span>
          )}
        </CardFooter>
      </Card>

      {/* ---------------- Edit ---------------- */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit task</DialogTitle>
            <DialogDescription>Update the details below and save.</DialogDescription>
          </DialogHeader>
          <TaskForm task={task} users={users} onSuccess={() => setEditOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* ---------------- Delete ---------------- */}
      <Dialog open={deleteConfirm} onOpenChange={setDeleteConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete task</DialogTitle>
            <DialogDescription>
              &ldquo;{task.title}&rdquo; will be removed for everyone it is assigned to.
              This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirm(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting…' : 'Delete task'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
