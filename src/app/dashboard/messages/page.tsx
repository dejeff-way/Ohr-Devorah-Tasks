'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Megaphone, MessageSquare, Plus, Search, User, Users, X } from 'lucide-react';

import { createClient } from '@/lib/supabase/client';
import { createConversation, loadConversations } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { PageLoader } from '@/components/ui/spinner';
import { UserAvatar } from '@/components/user-avatar';
import { cn } from '@/lib/utils';
import type { Conversation } from '@/types/messages';
import type { User as UserType } from '@/types/task';
import { toast } from 'sonner';

export default function MessagesPage() {
  const router = useRouter();
  const supabase = createClient();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [newType, setNewType] = useState<'dm' | 'group'>('dm');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const fetchConversations = useCallback(async () => {
    const result = await loadConversations();
    if ('error' in result) {
      toast.error(result.error);
      return;
    }
    setConversations(result.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);

      const { data: allUsers } = await supabase
        .from('users')
        .select('id, name, role')
        .order('name');
      if (allUsers && !cancelled) setUsers(allUsers as UserType[]);

      await fetchConversations();
    }

    init();

    const channel = supabase
      .channel('messages-conversations')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        () => { if (!cancelled) fetchConversations(); }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversations' },
        () => { if (!cancelled) fetchConversations(); }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [supabase, fetchConversations]);

  function closeNewDialog() {
    setShowNewDialog(false);
    setSelectedUsers([]);
    setSearchQuery('');
  }

  async function handleCreate() {
    if (selectedUsers.length === 0) {
      toast.error('Select at least one person');
      return;
    }

    setCreating(true);
    const form = new FormData();
    form.set('type', newType);
    form.set('participant_ids', JSON.stringify(selectedUsers));

    const result = await createConversation(form);
    setCreating(false);

    if ('error' in result) {
      toast.error(result.error);
      return;
    }

    toast.success('Conversation created');
    closeNewDialog();
    if (result.conversation_id) {
      router.push(`/dashboard/messages/${result.conversation_id}`);
    }
  }

  function toggleUser(userId: string) {
    if (newType === 'dm') {
      setSelectedUsers([userId]);
    } else {
      setSelectedUsers((prev) =>
        prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
      );
    }
  }

  const filteredUsers = users.filter(
    (u) =>
      u.id !== currentUserId &&
      (u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
  );

  function typeMeta(type: string) {
    switch (type) {
      case 'broadcast':
        return { Icon: Megaphone, tone: 'bg-status-review text-white', label: 'Broadcast' };
      case 'group':
        return { Icon: Users, tone: 'bg-secondary text-secondary-foreground', label: 'Group' };
      default:
        return { Icon: User, tone: 'bg-muted text-muted-foreground', label: 'Direct' };
    }
  }

  function getConversationTitle(conv: Conversation) {
    if (conv.title) return conv.title;
    if (conv.type === 'broadcast') return 'Staff Broadcast';
    const other = conv.participants?.find((p) => p.user_id !== currentUserId);
    return other?.user?.name ?? 'Conversation';
  }

  function formatTime(ts: string | null) {
    if (!ts) return '';
    const d = new Date(ts);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 86400000) {
      return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    }
    if (diff < 604800000) {
      return d.toLocaleDateString([], { weekday: 'short' });
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  if (loading) {
    return <PageLoader label="Loading messages" />;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {conversations.length} {conversations.length === 1 ? 'conversation' : 'conversations'}
        </p>
        <Button size="sm" onClick={() => setShowNewDialog(true)}>
          <Plus size={15} />
          New message
        </Button>
      </div>

      {conversations.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="No conversations yet"
          description="Start a direct message or a group thread with other staff members."
          action={
            <Button size="sm" onClick={() => setShowNewDialog(true)}>
              <Plus size={15} />
              Start a conversation
            </Button>
          }
        />
      ) : (
        <ul className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
          {conversations.map((conv) => {
            const otherParticipant = conv.participants?.find(
              (p) => p.user_id !== currentUserId
            );
            const unread = (conv.unread_count ?? 0) > 0;
            const { Icon, tone } = typeMeta(conv.type);
            const displayName = getConversationTitle(conv);

            return (
              <li key={conv.id} className="border-b border-border last:border-b-0">
                <Link
                  href={`/dashboard/messages/${conv.id}`}
                  className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted"
                >
                  <span className="relative shrink-0">
                    {conv.type === 'broadcast' ? (
                      <span className="flex size-10 items-center justify-center rounded-full bg-status-review-soft text-status-review-fg">
                        <Megaphone size={17} />
                      </span>
                    ) : (
                      <UserAvatar
                        name={otherParticipant?.user?.name ?? displayName}
                        size="lg"
                      />
                    )}
                    {/* The type marker used to render *below* the avatar
                        because nothing positioned it. */}
                    <span
                      className={cn(
                        'absolute -bottom-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full ring-2 ring-card',
                        tone
                      )}
                    >
                      <Icon size={9} />
                    </span>
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span
                        className={cn(
                          'truncate text-sm text-foreground',
                          unread ? 'font-extrabold' : 'font-semibold'
                        )}
                      >
                        {displayName}
                      </span>
                    </span>
                    <span
                      className={cn(
                        'mt-0.5 block truncate text-xs',
                        unread ? 'font-semibold text-foreground' : 'text-muted-foreground'
                      )}
                    >
                      {conv.last_message?.content ?? 'No messages yet'}
                    </span>
                  </span>

                  <span className="flex shrink-0 flex-col items-end gap-1.5">
                    <span className="text-[11px] font-medium text-muted-foreground tabular-nums">
                      {formatTime(conv.last_message_at)}
                    </span>
                    {unread && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground tabular-nums">
                        {conv.unread_count}
                      </span>
                    )}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {/* ---------------- New conversation ---------------- */}
      <Dialog
        open={showNewDialog}
        onOpenChange={(open) => (open ? setShowNewDialog(true) : closeNewDialog())}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New conversation</DialogTitle>
            <DialogDescription>
              Pick one person for a direct message, or several for a group thread.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
            {(['dm', 'group'] as const).map((type) => (
              <button
                key={type}
                type="button"
                aria-pressed={newType === type}
                onClick={() => {
                  setNewType(type);
                  setSelectedUsers([]);
                }}
                className={cn(
                  'rounded-md py-1.5 text-sm font-semibold transition-colors',
                  newType === type
                    ? 'bg-card text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {type === 'dm' ? 'Direct' : 'Group'}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search people…"
              className="pl-9 pr-9"
              aria-label="Search people"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="-mx-1 max-h-64 space-y-1 overflow-y-auto px-1">
            {filteredUsers.length === 0 ? (
              <EmptyState size="sm" icon={Users} title="No people found" />
            ) : (
              filteredUsers.map((u) => {
                const selected = selectedUsers.includes(u.id);
                return (
                  <button
                    key={u.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => toggleUser(u.id)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg border px-2.5 py-2 text-left transition-colors',
                      selected
                        ? 'border-secondary/40 bg-secondary-soft'
                        : 'border-transparent hover:bg-muted'
                    )}
                  >
                    <UserAvatar name={u.name} size="sm" />
                    <span className="min-w-0 flex-1 leading-tight">
                      <span className="block truncate text-sm font-semibold text-foreground">
                        {u.name}
                      </span>
                      <span className="block text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                        {u.role}
                      </span>
                    </span>
                    {selected && (
                      <span className="size-2 shrink-0 rounded-full bg-secondary" />
                    )}
                  </button>
                );
              })
            )}
          </div>

          <div className="-mx-5 -mb-5 flex items-center justify-between gap-2 border-t border-border bg-subtle p-4 sm:-mx-6 sm:-mb-6 sm:p-5">
            <span className="text-xs text-muted-foreground">
              {selectedUsers.length > 0
                ? `${selectedUsers.length} selected`
                : 'Nobody selected yet'}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={closeNewDialog} disabled={creating}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleCreate}
                disabled={selectedUsers.length === 0 || creating}
              >
                {creating ? 'Starting…' : 'Start'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
