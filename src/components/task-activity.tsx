'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns';
import { Check, History, Loader2, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import { UserAvatar } from '@/components/user-avatar';
import {
  addTaskActivity,
  deleteTaskActivity,
  loadTaskActivity,
} from '@/app/dashboard/actions';
import type { TaskActivity } from '@/types/task';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface TaskActivityLogProps {
  taskId: string;
  currentUserId: string;
  /** Admins can remove anyone's entry; everyone can remove their own. */
  isAdmin: boolean;
  /** False for read-only contexts. */
  canLog?: boolean;
}

/**
 * Relative for anything recent ("12 minutes ago"), absolute once it stops being
 * useful. The exact timestamp is always on the title attribute.
 */
function stamp(iso: string) {
  const date = new Date(iso);
  if (isToday(date)) return formatDistanceToNow(date, { addSuffix: true });
  if (isYesterday(date)) return `Yesterday, ${format(date, 'h:mm a')}`;
  return format(date, "MMM d, yyyy 'at' h:mm a");
}

export function TaskActivityLog({
  taskId,
  currentUserId,
  isAdmin,
  canLog = true,
}: TaskActivityLogProps) {
  const [entries, setEntries] = useState<TaskActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const refresh = useCallback(async () => {
    const result = await loadTaskActivity(taskId);
    if ('error' in result) {
      toast.error(result.error);
      setLoading(false);
      return;
    }
    setEntries(result.data);
    setLoading(false);
  }, [taskId]);

  useEffect(() => {
    let cancelled = false;

    loadTaskActivity(taskId).then((result) => {
      if (cancelled) return;
      if ('error' in result) {
        toast.error(result.error);
      } else {
        setEntries(result.data);
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [taskId]);

  async function handleAdd() {
    const trimmed = body.trim();
    if (!trimmed || saving) return;

    setSaving(true);
    const form = new FormData();
    form.set('task_id', taskId);
    form.set('body', trimmed);

    const result = await addTaskActivity(form);
    setSaving(false);

    if ('error' in result) {
      toast.error(result.error);
      return;
    }

    setBody('');
    setEntries((prev) => [result.entry, ...prev]);
    inputRef.current?.focus();
  }

  async function handleDelete(entry: TaskActivity) {
    const previous = entries;
    setEntries((prev) => prev.filter((e) => e.id !== entry.id));

    const result = await deleteTaskActivity(entry.id);
    if ('error' in result) {
      toast.error(result.error);
      setEntries(previous);
      await refresh();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    // Enter logs the line. Shift+Enter is a newline, for the occasional
    // multi-line note.
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAdd();
    }
  }

  return (
    <section>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <p className="text-[0.7rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">
          Activity
        </p>
        {!loading && entries.length > 0 && (
          <span className="text-[0.7rem] font-bold tabular-nums text-muted-foreground">
            {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
          </span>
        )}
      </div>

      {canLog && (
        <div className="mb-4 flex items-end gap-2">
          <Textarea
            ref={inputRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder="What did you try? e.g. tried calling, no answer"
            aria-label="Log an action"
            className="max-h-28 min-h-10 resize-none py-2"
          />
          <Button
            type="button"
            size="icon"
            aria-label="Log this action"
            onClick={handleAdd}
            disabled={!body.trim() || saving}
            className="size-10 shrink-0"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
          </Button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
          <Spinner size="sm" />
          Loading history…
        </div>
      ) : entries.length === 0 ? (
        <div className="flex items-center gap-2.5 rounded-lg border border-dashed border-border bg-subtle px-3.5 py-4 text-sm text-muted-foreground">
          <History size={16} className="shrink-0" />
          {canLog
            ? 'Nothing logged yet. Each line you add is timestamped and kept in order.'
            : 'Nothing logged yet.'}
        </div>
      ) : (
        <ol className="relative space-y-3 pl-5">
          {/* Timeline rail */}
          <span
            aria-hidden
            className="absolute bottom-2 left-[5px] top-2 w-px bg-border"
          />
          {entries.map((entry) => {
            const isMine = entry.author_id === currentUserId;
            const authorName = entry.author?.name ?? 'Removed user';

            return (
              <li key={entry.id} className="group relative">
                <span
                  aria-hidden
                  className={cn(
                    'absolute -left-5 top-2 size-[11px] rounded-full border-2 border-card',
                    isMine ? 'bg-secondary' : 'bg-border-strong'
                  )}
                />

                <div className="rounded-lg border border-border bg-card px-3.5 py-2.5">
                  <div className="mb-1 flex items-center gap-2">
                    <UserAvatar name={authorName} size="xs" />
                    <span className="text-xs font-bold text-foreground">{authorName}</span>
                    <span
                      className="text-[11px] text-muted-foreground"
                      title={format(new Date(entry.created_at), "EEEE, MMMM d, yyyy 'at' h:mm:ss a")}
                    >
                      {stamp(entry.created_at)}
                    </span>

                    {(isMine || isAdmin) && (
                      <button
                        type="button"
                        aria-label="Delete entry"
                        onClick={() => handleDelete(entry)}
                        className="ml-auto rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive-soft hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>

                  <p className="text-sm leading-relaxed whitespace-pre-wrap break-words text-foreground">
                    {entry.body}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
