'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Calendar, Clock, MoreHorizontal, Pencil, Trash2, Users, Layers } from 'lucide-react';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import { TaskForm } from '@/components/task-form';
import { deleteTask, updateCompletionLevel } from '@/app/dashboard/actions';
import { Task, User, MetadataEntry } from '@/types/task';
import { MetadataDisplay } from '@/components/metadata-display';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface TaskCardProps {
  task: Task;
  users: User[];
  currentUserId: string;
  isAdmin: boolean;
}

const levelConfig = {
  pending: {
    label: 'Pending',
    color: 'bg-muted text-secondary border-border',
    dot: 'bg-muted-foreground',
  },
  in_progress: {
    label: 'In Progress',
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    dot: 'bg-blue-500',
  },
  review: {
    label: 'Review',
    color: 'bg-amber-50 text-amber-700 border-amber-200',
    dot: 'bg-amber-500',
  },
  completed: {
    label: 'Completed',
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500',
  },
};

export function TaskCard({ task, users, currentUserId, isAdmin }: TaskCardProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const config = levelConfig[task.completion_level];
  const assigneeNames = task.assignees?.map((a) => a.name) ?? [];
  const dateObj = new Date(task.date_required);
  const isOverdue = dateObj < new Date() && task.completion_level !== 'completed';
  const isCreator = task.created_by === currentUserId;

  const nextLevels: Record<string, string> = {
    pending: 'in_progress',
    in_progress: 'review',
    review: 'completed',
  };

  async function handleAdvance() {
    const next = nextLevels[task.completion_level];
    if (!next) return;
    const result = await updateCompletionLevel(task.id, next);
    if (result.error) toast.error(result.error);
    else toast.success(`Moved to ${nextLevels[next] || next}`);
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
      <Card className="border-border bg-card">
        <CardHeader className="flex flex-row items-start justify-between gap-2 px-4 pt-4 pb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={cn('h-2 w-2 rounded-full', config.dot)} />
              <Badge
                variant="outline"
                className={cn('text-xs font-medium px-2 py-0', config.color)}
              >
                {config.label}
              </Badge>
            </div>
            <h3 className="text-sm font-semibold text-foreground leading-snug truncate">
              {task.title}
            </h3>
          </div>

          {(isAdmin || isCreator) && (
            <DropdownMenu>
              <DropdownMenuTrigger>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-secondary"
                >
                  <MoreHorizontal size={16} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={() => setEditOpen(true)}>
                  <Pencil size={14} className="mr-2" />
                  Edit Task
                </DropdownMenuItem>
                {task.completion_level !== 'completed' && (
                  <DropdownMenuItem onClick={handleAdvance}>
                    <Clock size={14} className="mr-2" />
                    Move to{' '}
                    {nextLevels[task.completion_level]
                      ? levelConfig[nextLevels[task.completion_level] as keyof typeof levelConfig]?.label
                      : 'Next'}
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-red-600 focus:text-red-600"
                  onClick={() => setDeleteConfirm(true)}
                >
                  <Trash2 size={14} className="mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </CardHeader>

        {task.description && (
          <CardContent className="px-4 py-1">
            <p className="text-sm text-secondary line-clamp-2">{task.description}</p>
          </CardContent>
        )}

        {task.metadata && task.metadata.length > 0 && (
          <CardContent className="px-4 pb-1 pt-1">
            <MetadataDisplay entries={task.metadata as MetadataEntry[]} compact />
          </CardContent>
        )}

        <CardFooter className="flex items-center justify-between px-4 py-3 border-t border-border mt-2">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar size={12} />
              {format(dateObj, 'MMM d, yyyy')}
              {isOverdue && (
                <span className="text-red-500 font-medium ml-1">Overdue</span>
              )}
            </span>
          </div>

          {assigneeNames.length > 0 && (
            <div className="flex items-center gap-1">
              <Users size={12} className="text-muted-foreground" />
              <div className="flex -space-x-1.5">
                {assigneeNames.slice(0, 3).map((name, i) => (
                  <div
                    key={i}
                    className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-secondary ring-2 ring-white"
                    title={name}
                  >
                    {name.charAt(0)}
                  </div>
                ))}
                {assigneeNames.length > 3 && (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground ring-2 ring-white">
                    +{assigneeNames.length - 3}
                  </div>
                )}
              </div>
            </div>
          )}
        </CardFooter>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
            <DialogDescription>Update the task details below.</DialogDescription>
          </DialogHeader>
          <TaskForm
            task={task}
            users={users}
            onSuccess={() => setEditOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteConfirm} onOpenChange={setDeleteConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Task</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{task.title}&rdquo;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirm(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
