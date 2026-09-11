'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, LogOut, Megaphone, MessageSquare, Send, Trash2, Users } from 'lucide-react';

import { createClient } from '@/lib/supabase/client';
import { leaveConversation, loadMessages, markRead, sendMessage } from '../actions';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
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
import type { Conversation, Message } from '@/types/messages';
import type { User } from '@/types/task';

/** Shape of the `conversation_participants` -> `users` join used below. */
type ParticipantRow = { user?: Pick<User, 'id' | 'name' | 'role'> | null };
import { toast } from 'sonner';

export default function ChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [convId, setConvId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevMessageCountRef = useRef(0);

  const fetchMessages = useCallback(async (cursor?: string) => {
    if (!convId) return;
    const result = await loadMessages(convId, cursor);
    if ('error' in result) {
      toast.error(result.error);
      return;
    }

    if (cursor) {
      setMessages((prev) => [...result.data, ...prev]);
    } else {
      setMessages(result.data);
    }
    setHasMore(result.hasMore);

    if (!conversation) {
      const { data: convData } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', convId)
        .single();
      if (convData) {
        const { data: participants } = await supabase
          .from('conversation_participants')
          .select('user:user_id(id, name, role)')
          .eq('conversation_id', convId);
        const rows = (participants ?? []) as unknown as ParticipantRow[];
        setConversation({
          ...convData,
          participants: rows.map((row) => ({
            ...row,
            user_id: row.user?.id ?? '',
            user: row.user,
          })) as Conversation['participants'],
        });
      }
    }
  }, [supabase, convId, conversation]);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/auth/login'); return; }
      if (cancelled) return;

      setCurrentUserId(user.id);

      const { id } = await params;
      if (cancelled) return;

      setConvId(id);

      await fetchMessages();
      setLoading(false);
      markRead(id).catch(() => {});
    }

    init();

    return () => { cancelled = true; };
  }, [params, supabase, router, fetchMessages]);

  useEffect(() => {
    if (!convId || !currentUserId) return;

    let cancelled = false;

    const channel = supabase
      .channel(`messages-${convId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${convId}`,
        },
        (payload) => {
          if (cancelled) return;
          const newMsg = payload.new as Message;

          setMessages((prev) => {
            const optimisticIdx = prev.findIndex(
              (m) => !m.id && m.sender_id === currentUserId && m.content === newMsg.content
            );
            if (optimisticIdx >= 0) {
              const updated = [...prev];
              updated[optimisticIdx] = newMsg;
              return updated;
            }
            return [...prev, newMsg];
          });

          markRead(convId).catch(() => {});
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [convId, currentUserId, supabase]);

  useEffect(() => {
    if (messages.length > prevMessageCountRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevMessageCountRef.current = messages.length;
  }, [messages.length]);

  async function handleSend() {
    if (!convId) return;
    const trimmed = newMessage.trim();
    if (!trimmed || sending) return;

    setSending(true);
    setNewMessage('');

    const optimistic: Message = {
      id: '',
      conversation_id: convId,
      sender_id: currentUserId,
      content: trimmed,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });

    const form = new FormData();
    form.set('conversation_id', convId);
    form.set('content', trimmed);

    const result = await sendMessage(form);

    if ('error' in result) {
      toast.error(result.error);
      setMessages((prev) => prev.filter((m) => m !== optimistic));
    }

    setSending(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  async function handleDelete(msgId: string) {
    const { deleteMessage } = await import('../actions');
    setMessages((prev) => prev.filter((m) => m.id !== msgId));
    const result = await deleteMessage(msgId);
    if ('error' in result) {
      toast.error(result.error);
      await fetchMessages();
    }
  }

  async function handleLeave() {
    if (!convId) return;
    const result = await leaveConversation(convId);
    if ('error' in result) {
      toast.error(result.error);
    } else {
      router.push('/dashboard/messages');
    }
  }

  function getConversationTitle() {
    if (conversation?.title) return conversation.title;
    if (conversation?.type === 'broadcast') return 'Staff Broadcast';
    const others = conversation?.participants?.filter((p) => p.user_id !== currentUserId);
    if (others && others.length > 0) {
      return others.map((p) => p.user?.name).join(', ');
    }
    return 'Conversation';
  }

  function formatMessageTime(ts: string) {
    return new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }

  function formatMessageDate(ts: string) {
    const d = new Date(ts);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return 'Today';
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  }

  if (loading) {
    return <PageLoader label="Opening conversation" />;
  }

  const dateGroups: { date: string; messages: Message[] }[] = [];
  for (const msg of messages) {
    const dateStr = formatMessageDate(msg.created_at);
    const last = dateGroups[dateGroups.length - 1];
    if (last && last.date === dateStr) {
      last.messages.push(msg);
    } else {
      dateGroups.push({ date: dateStr, messages: [msg] });
    }
  }

  const title = getConversationTitle();
  const isBroadcast = conversation?.type === 'broadcast';

  return (
    <div className="mx-auto flex h-app-panel max-w-3xl flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      {/* ---------------- Header ---------------- */}
      <div className="flex shrink-0 items-center gap-3 border-b border-border px-3 py-2.5 sm:px-4">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Back to messages"
          onClick={() => router.push('/dashboard/messages')}
        >
          <ArrowLeft size={17} />
        </Button>

        {isBroadcast ? (
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-status-review-soft text-status-review-fg">
            <Megaphone size={16} />
          </span>
        ) : (
          <UserAvatar name={title} size="md" />
        )}

        <div className="min-w-0 flex-1 leading-tight">
          <h2 className="truncate text-sm font-bold text-foreground">{title}</h2>
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            {conversation?.type === 'group' ? (
              <>
                <Users size={11} />
                {conversation.participants?.length ?? 0} members
              </>
            ) : isBroadcast ? (
              'Everyone on staff'
            ) : (
              'Direct message'
            )}
          </p>
        </div>

        {!isBroadcast && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setLeaveOpen(true)}
            title="Leave conversation"
            aria-label="Leave conversation"
            className="hover:bg-destructive-soft hover:text-destructive"
          >
            <LogOut size={16} />
          </Button>
        )}
      </div>

      {/* ---------------- Messages ---------------- */}
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-subtle px-3 py-4 sm:px-4">
        {hasMore && (
          <div className="pb-1 text-center">
            <Button
              variant="outline"
              size="sm"
              disabled={loadingMore}
              onClick={async () => {
                setLoadingMore(true);
                const oldest = messages[0];
                await fetchMessages(oldest?.created_at);
                setLoadingMore(false);
              }}
            >
              {loadingMore && <Loader2 size={14} className="animate-spin" />}
              Load older messages
            </Button>
          </div>
        )}

        {messages.length === 0 && (
          <EmptyState
            icon={MessageSquare}
            title="No messages yet"
            description="Say something to get the thread started."
            className="border-none bg-transparent"
          />
        )}

        {dateGroups.map((group) => (
          <div key={group.date} className="space-y-1.5">
            <div className="sticky top-0 z-10 flex justify-center py-1">
              <span className="rounded-full border border-border bg-card px-2.5 py-0.5 text-[11px] font-bold text-muted-foreground shadow-xs">
                {group.date}
              </span>
            </div>

            {group.messages.map((msg, i) => {
              const isMine = msg.sender_id === currentUserId;
              const senderName = msg.sender?.name ?? 'Unknown';
              const prevMsg = group.messages[i - 1];
              const showAvatar = !prevMsg || prevMsg.sender_id !== msg.sender_id;

              return (
                <div
                  key={msg.id || `optimistic-${i}`}
                  className={cn('flex gap-2', isMine ? 'justify-end' : 'justify-start')}
                >
                  {/* Own messages carry no avatar: there is no sender record on
                      an optimistic send, which used to render "U" for Unknown. */}
                  {!isMine &&
                    (showAvatar ? (
                      <UserAvatar name={senderName} size="xs" className="mt-1" />
                    ) : (
                      <span className="w-6 shrink-0" />
                    ))}

                  <div
                    className={cn(
                      'group relative max-w-[78%] rounded-2xl px-3.5 py-2 shadow-xs',
                      isMine
                        ? 'rounded-br-sm bg-secondary text-secondary-foreground'
                        : 'rounded-bl-sm border border-border bg-card text-foreground'
                    )}
                  >
                    {!isMine && showAvatar && (
                      <p className="mb-0.5 text-[11px] font-bold text-muted-foreground">
                        {senderName}
                      </p>
                    )}
                    <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                      {msg.content}
                    </p>
                    <div
                      className={cn(
                        'mt-1 flex items-center gap-1.5',
                        isMine ? 'justify-end' : 'justify-start'
                      )}
                    >
                      <span
                        className={cn(
                          'text-[10px] tabular-nums',
                          isMine ? 'text-secondary-foreground/65' : 'text-muted-foreground'
                        )}
                      >
                        {formatMessageTime(msg.created_at)}
                      </span>
                      {isMine && msg.id && (
                        <button
                          type="button"
                          aria-label="Delete message"
                          onClick={() => handleDelete(msg.id)}
                          className="text-secondary-foreground/50 opacity-0 transition-opacity hover:text-secondary-foreground focus-visible:opacity-100 group-hover:opacity-100"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      {/* ---------------- Composer ---------------- */}
      <div className="shrink-0 border-t border-border px-3 py-3 sm:px-4">
        <div className="flex items-end gap-2">
          <Textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Write a message…  (Enter to send, Shift+Enter for a new line)"
            className="max-h-32 min-h-11 resize-none py-2.5"
            rows={1}
            aria-label="Message"
          />
          <Button
            onClick={handleSend}
            disabled={!newMessage.trim() || sending}
            size="icon"
            aria-label="Send message"
            className="size-11 shrink-0"
          >
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </Button>
        </div>
      </div>

      {/* ---------------- Leave confirmation ---------------- */}
      <Dialog open={leaveOpen} onOpenChange={setLeaveOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Leave conversation</DialogTitle>
            <DialogDescription>
              You will stop receiving messages from &ldquo;{title}&rdquo; and it will disappear
              from your list.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setLeaveOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleLeave}>
              Leave
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
