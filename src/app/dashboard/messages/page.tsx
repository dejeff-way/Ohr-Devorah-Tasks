'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { loadConversations, createConversation } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  MessageSquare,
  Plus,
  Search,
  Users,
  User,
  Megaphone,
} from 'lucide-react';
import type { Conversation } from '@/types/messages';
import type { User as UserType } from '@/types/task';
import { toast } from 'sonner';

export default function MessagesPage() {
  const supabase = createClient();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [newType, setNewType] = useState<'dm' | 'group'>('dm');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
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

      // Fetch users for new conversation dialog
      const { data: allUsers } = await supabase
        .from('users')
        .select('id, name, role')
        .order('name');
      if (allUsers && !cancelled) setUsers(allUsers as UserType[]);

      await fetchConversations();
    }

    init();

    // Realtime subscription — re-fetch on any message insert
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

  async function handleCreate() {
    if (selectedUsers.length === 0) {
      toast.error('Select at least one person');
      return;
    }

    const form = new FormData();
    form.set('type', newType);
    form.set('participant_ids', JSON.stringify(selectedUsers));

    const result = await createConversation(form);
    if ('error' in result) {
      toast.error(result.error);
      return;
    }

    toast.success('Conversation created');
    setShowNewDialog(false);
    setSelectedUsers([]);
  }

  function toggleUser(userId: string) {
    if (newType === 'dm') {
      setSelectedUsers([userId]);
    } else {
      setSelectedUsers((prev) =>
        prev.includes(userId)
          ? prev.filter((id) => id !== userId)
          : [...prev, userId]
      );
    }
  }

  const filteredUsers = users.filter(
    (u) =>
      u.id !== currentUserId &&
      (u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
  );

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'broadcast':
        return <Megaphone size={16} className="text-amber-500" />;
      case 'group':
        return <Users size={16} className="text-blue-500" />;
      default:
        return <User size={16} className="text-muted-foreground" />;
    }
  };

  const getConversationTitle = (conv: Conversation) => {
    if (conv.title) return conv.title;
    if (conv.type === 'broadcast') return 'Staff Broadcast';
    // DM: show the other person's name
    const other = conv.participants?.find((p) => p.user_id !== currentUserId);
    return other?.user?.name ?? 'Conversation';
  };

  const formatTime = (ts: string | null) => {
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
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-foreground">Messages</h1>
        <Button onClick={() => setShowNewDialog(true)} size="sm">
          <Plus size={16} className="mr-1.5" />
          New Message
        </Button>
      </div>

      {/* Conversation list */}
      {conversations.length === 0 ? (
        <div className="text-center py-16">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <MessageSquare size={28} className="text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground mb-4">No conversations yet</p>
          <Button onClick={() => setShowNewDialog(true)} variant="outline" size="sm">
            <Plus size={14} className="mr-1.5" />
            Start a conversation
          </Button>
        </div>
      ) : (
        <div className="space-y-1">
          {conversations.map((conv) => {
            const otherParticipant = conv.participants?.find(
              (p) => p.user_id !== currentUserId
            );
            return (
              <Link
                key={conv.id}
                href={`/dashboard/messages/${conv.id}`}
                className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted transition-colors group"
              >
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-medium text-secondary-foreground">
                    {conv.type === 'broadcast'
                      ? '#'
                      : otherParticipant
                        ? otherParticipant.user?.name?.charAt(0) ?? '?'
                        : conv.participants?.[0]?.user?.name?.charAt(0) ?? '?'}
                  </div>
                  {getTypeIcon(conv.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground truncate">
                      {getConversationTitle(conv)}
                    </span>
                    {conv.type === 'broadcast' && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        Broadcast
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {conv.last_message?.content ?? 'No messages yet'}
                  </p>
                </div>

                {/* Meta */}
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className="text-[11px] text-muted-foreground">
                    {formatTime(conv.last_message_at)}
                  </span>
                  {conv.unread_count && conv.unread_count > 0 ? (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[11px] font-medium text-primary-foreground">
                      {conv.unread_count}
                    </span>
                  ) : null}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* New Conversation Dialog */}
      {showNewDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-black/30"
            onClick={() => {
              setShowNewDialog(false);
              setSelectedUsers([]);
            }}
          />
          <div className="relative z-10 w-full max-w-md mx-4 bg-card rounded-xl shadow-xl p-5">
            <h2 className="text-base font-semibold text-foreground mb-4">
              New Conversation
            </h2>

            {/* Type toggle */}
            <div className="flex gap-1 mb-4 bg-muted rounded-lg p-1">
              <button
                onClick={() => {
                  setNewType('dm');
                  setSelectedUsers([]);
                }}
                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  newType === 'dm'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-secondary-foreground'
                }`}
              >
                Direct
              </button>
              <button
                onClick={() => {
                  setNewType('group');
                  setSelectedUsers([]);
                }}
                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  newType === 'group'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-secondary-foreground'
                }`}
              >
                Group
              </button>
            </div>

            {/* Search */}
            <div className="relative mb-3">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search people..."
                className="pl-9"
              />
            </div>

            {/* User list */}
            <div className="max-h-56 overflow-y-auto space-y-0.5 mb-4">
              {filteredUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No people found
                </p>
              ) : (
                filteredUsers.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => toggleUser(u.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                      selectedUsers.includes(u.id)
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-background text-secondary-foreground'
                    }`}
                  >
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                        selectedUsers.includes(u.id)
                          ? 'bg-card/20 text-card-foreground'
                          : 'bg-muted text-secondary-foreground'
                      }`}
                    >
                      {u.name?.charAt(0) ?? '?'}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{u.name}</p>
                      <p
                        className={`text-xs ${
                          selectedUsers.includes(u.id)
                            ? 'text-primary-foreground/70'
                            : 'text-muted-foreground'
                        }`}
                      >
                        {u.role}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>

            {/* Selected counter for groups */}
            {newType === 'group' && selectedUsers.length > 0 && (
              <p className="text-xs text-muted-foreground mb-3">
                {selectedUsers.length} selected
              </p>
            )}

            {/* Actions */}
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowNewDialog(false);
                  setSelectedUsers([]);
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleCreate}
                disabled={selectedUsers.length === 0}
              >
                Start
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
