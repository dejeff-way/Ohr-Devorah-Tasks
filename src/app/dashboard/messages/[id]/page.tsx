'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { loadMessages, sendMessage, markRead, leaveConversation } from '../actions';
import type { Message, Conversation } from '@/types/messages';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft,
  Send,
  Trash2,
  LogOut,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

export default function ChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const supabase = createClient();
  const conversationId = useRef<string>('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const prevMessageCountRef = useRef(0);

  const fetchMessages = useCallback(async (cursor?: string) => {
    const result = await loadMessages(conversationId.current, cursor);
    if ('error' in result) {
      toast.error(result.error);
      return;
    }

    if (cursor) {
      // Prepend older messages (they're in reverse order from server)
      setMessages((prev) => [...result.data, ...prev]);
    } else {
      setMessages(result.data);
    }
    setHasMore(result.hasMore);

    // Get conversation info from first message fetch
    if (!conversation) {
      const { data: convData } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId.current)
        .single();
      if (convData) {
        const { data: participants } = await supabase
          .from('conversation_participants')
          .select('user:user_id(id, name, role)')
          .eq('conversation_id', conversationId.current);
        setConversation({
          ...convData,
          participants: (participants || []).map((p: any) => ({
            ...p,
            user_id: p.user?.id,
            user: p.user,
          })),
        });
      }
    }
  }, [supabase, conversation]);

  // Initialize
  useEffect(() => {
    let cancelled = false;

    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/login');
        return;
      }
      if (cancelled) return;
      setCurrentUserId(user.id);

      // Wait for params
      const { id } = await params;
      conversationId.current = id;

      await fetchMessages();
      setLoading(false);

      // Mark as read
      markRead(id).catch(() => {});
    }

    init();

    // Realtime subscription
    const channel = supabase
      .channel(`messages-${conversationId.current}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId.current}`,
        },
        (payload) => {
          if (cancelled) return;
          const newMsg = payload.new as Message;
          // Don't add if we sent it (already in optimistic state)
          if (newMsg.sender_id === currentUserId) {
            // Update with server ID if this was our message
            setMessages((prev) =>
              prev.map((m) =>
                m.sender_id === currentUserId &&
                !m.id &&
                m.content === newMsg.content
                  ? { ...newMsg, sender: m.sender }
                  : m
              )
            );
          } else {
            setMessages((prev) => [...prev, newMsg]);
          }
          markRead(conversationId.current).catch(() => {});
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [params, supabase, router, fetchMessages, currentUserId]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messages.length > prevMessageCountRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevMessageCountRef.current = messages.length;
  }, [messages.length]);

  async function handleSend() {
    const trimmed = newMessage.trim();
    if (!trimmed || sending) return;

    setSending(true);
    setNewMessage('');

    // Optimistic insert
    const optimistic: Message = {
      id: '',
      conversation_id: conversationId.current,
      sender_id: currentUserId,
      content: trimmed,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });

    const form = new FormData();
    form.set('conversation_id', conversationId.current);
    form.set('content', trimmed);

    const result = await sendMessage(form);

    if ('error' in result) {
      toast.error(result.error);
      // Remove optimistic message
      setMessages((prev) => prev.filter((m) => m !== optimistic));
    } else if (result.message) {
      // Replace optimistic with real message
      setMessages((prev) =>
        prev.map((m) => (m === optimistic ? result.message! : m))
      );
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
      await fetchMessages(); // recover
    }
  }

  async function handleLeave() {
    const result = await leaveConversation(conversationId.current);
    if ('error' in result) {
      toast.error(result.error);
    } else {
      router.push('/dashboard/messages');
    }
  }

  function getConversationTitle() {
    if (conversation?.title) return conversation.title;
    if (conversation?.type === 'broadcast') return 'Staff Broadcast';
    const others = conversation?.participants?.filter(
      (p) => p.user_id !== currentUserId
    );
    if (others && others.length > 0) {
      return others.map((p) => p.user?.name).join(', ');
    }
    return 'Conversation';
  }

  function formatMessageTime(ts: string) {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }

  function formatMessageDate(ts: string) {
    const d = new Date(ts);
    const now = new Date();
    if (
      d.toDateString() === now.toDateString()
    ) return 'Today';
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
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-foreground" />
      </div>
    );
  }

  // Group messages by date
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

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card rounded-t-xl">
        <button
          onClick={() => router.push('/dashboard/messages')}
          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-foreground truncate">
            {getConversationTitle()}
          </h2>
          {conversation?.type === 'group' && (
            <p className="text-xs text-muted-foreground">
              {conversation.participants?.length ?? 0} members
            </p>
          )}
        </div>
        {conversation?.type !== 'broadcast' && (
          <button
            onClick={handleLeave}
            className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors"
            title="Leave conversation"
          >
            <LogOut size={16} />
          </button>
        )}
      </div>

      {/* Messages */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
      >
        {/* Load more */}
        {hasMore && (
          <div className="text-center pb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                setLoadingMore(true);
                const oldest = messages[0];
                await fetchMessages(oldest?.created_at);
                setLoadingMore(false);
              }}
              disabled={loadingMore}
            >
              {loadingMore ? (
                <Loader2 size={14} className="mr-1.5 animate-spin" />
              ) : null}
              Load older messages
            </Button>
          </div>
        )}

        {dateGroups.map((group) => (
          <div key={group.date} className="space-y-1">
            {/* Date separator */}
            <div className="flex items-center gap-3 my-3">
              <div className="flex-1 h-px bg-muted" />
              <span className="text-[11px] font-medium text-muted-foreground">
                {group.date}
              </span>
              <div className="flex-1 h-px bg-muted" />
            </div>

            {group.messages.map((msg, i) => {
              const isMine = msg.sender_id === currentUserId;
              const senderName = msg.sender?.name ?? 'Unknown';
              // Show sender avatar for first message in a sequence from same person
              const prevMsg = group.messages[i - 1];
              const showAvatar = !prevMsg || prevMsg.sender_id !== msg.sender_id;

              return (
                <div
                  key={msg.id || i}
                  className={`flex gap-2 ${isMine ? 'justify-end' : 'justify-start'}`}
                >
                  {!isMine && showAvatar ? (
                    <div className="flex-shrink-0 mt-1">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-[11px] font-medium text-secondary">
                        {senderName.charAt(0)}
                      </div>
                    </div>
                  ) : !isMine ? (
                    <div className="w-7 flex-shrink-0" />
                  ) : null}

                  <div
                    className={`group relative max-w-[75%] rounded-2xl px-3.5 py-2 ${
                      isMine
                        ? 'bg-primary text-primary-foreground rounded-br-md'
                        : 'bg-muted text-foreground rounded-bl-md'
                    }`}
                  >
                    {!isMine && showAvatar && (
                      <p className="text-[11px] font-medium text-muted-foreground mb-0.5">
                        {senderName}
                      </p>
                    )}
                    <p className="text-sm whitespace-pre-wrap break-words">
                      {msg.content}
                    </p>
                    <div
                      className={`flex items-center gap-1 mt-1 ${
                        isMine ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <span
                        className={`text-[10px] ${
                          isMine ? 'text-primary-foreground/60' : 'text-muted-foreground'
                        }`}
                      >
                        {formatMessageTime(msg.created_at)}
                      </span>
                      {isMine && msg.id && (
                        <button
                          onClick={() => handleDelete(msg.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-primary-foreground/40 hover:text-primary-foreground/80"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>

                  {isMine && showAvatar ? (
                    <div className="flex-shrink-0 mt-1">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[11px] font-medium text-primary-foreground">
                        {senderName.charAt(0)}
                      </div>
                    </div>
                  ) : isMine ? (
                    <div className="w-7 flex-shrink-0" />
                  ) : null}
                </div>
              );
            })}
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-border bg-card rounded-b-xl">
        <div className="flex gap-2 items-end">
          <Textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="min-h-[40px] max-h-32 resize-none"
            rows={1}
          />
          <Button
            onClick={handleSend}
            disabled={!newMessage.trim() || sending}
            size="icon"
            className="flex-shrink-0 h-10 w-10"
          >
            {sending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Send size={16} />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
