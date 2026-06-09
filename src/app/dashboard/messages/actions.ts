'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Conversation, Message } from '@/types/messages';

// ─── Helpers ──────────────────────────────────────────────

function formatZodError(error: z.ZodError): string {
  try {
    const issues = JSON.parse(error.message);
    if (Array.isArray(issues)) {
      return issues.map((i: { message?: string }) => i.message ?? 'Invalid value').join(', ');
    }
  } catch {
    // fallback
  }
  return error.message;
}

/**
 * Verify the calling user is authenticated and return their ID + profile.
 */
type AuthResult = { user: { id: string; name: string; role: string }; supabase: Awaited<ReturnType<typeof createServerSupabaseClient>> };

type AuthCallResult = AuthResult | { error: string };

async function requireUser(): Promise<AuthCallResult> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };
  const { data: profile } = await supabase
    .from('users')
    .select('id, name, role')
    .eq('id', user.id)
    .single();
  if (!profile) return { error: 'User profile not found' };
  return { user: profile as { id: string; name: string; role: string }, supabase };
}

// ─── Create Conversation ──────────────────────────────────

const createConversationSchema = z.object({
  type: z.enum(['dm', 'group', 'broadcast']),
  title: z.string().optional(),
  participant_ids: z.array(z.string()).min(1, 'At least one participant is required'),
});

export async function createConversation(formData: FormData) {
  const auth = await requireUser();
  if ('error' in auth) return { error: auth.error };
  const { user, supabase } = auth;

  const raw = {
    type: formData.get('type'),
    title: formData.get('title') || undefined,
    participant_ids: JSON.parse((formData.get('participant_ids') as string) || '[]'),
  };

  const parsed = createConversationSchema.safeParse(raw);
  if (!parsed.success) return { error: formatZodError(parsed.error) };

  const { type, title, participant_ids } = parsed.data;

  // Broadcasts: admin only
  if (type === 'broadcast' && user.role !== 'admin') {
    return { error: 'Only admins can create broadcasts' };
  }

  // DMs: exactly 2 participants, enforce uniqueness
  if (type === 'dm') {
    if (participant_ids.length !== 1) {
      return { error: 'Direct messages require exactly one recipient' };
    }
    // Check if DM between these two already exists
    const { data: existing } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .in('user_id', [user.id, participant_ids[0]]);

    if (existing) {
      const convIds = existing
        .map((e) => e.conversation_id)
        .filter((id, i, arr) => arr.indexOf(id) !== i || arr.lastIndexOf(id) !== i);

      if (convIds.length > 0) {
        // Find conversations where exactly these 2 users are participants
        for (const cid of [...new Set(existing.map((e) => e.conversation_id))]) {
          const { data: participants } = await supabase
            .from('conversation_participants')
            .select('user_id')
            .eq('conversation_id', cid);

          if (
            participants &&
            participants.length === 2 &&
            participants.some((p) => p.user_id === user.id) &&
            participants.some((p) => p.user_id === participant_ids[0])
          ) {
            // Check it's a DM type
            const { data: conv } = await supabase
              .from('conversations')
              .select('type')
              .eq('id', cid)
              .single();
            if (conv?.type === 'dm') {
              return { success: true, conversation_id: cid, existing: true };
            }
          }
        }
      }
    }
  }

  // Create the conversation
  const allIds = type === 'dm' ? [user.id, participant_ids[0]] : participant_ids;

  const { data: conv, error: convError } = await supabase
    .from('conversations')
    .insert({
      type,
      title: title || null,
      created_by: user.id,
    })
    .select()
    .single();

  if (convError) return { error: convError.message };

  // Add participants (including creator)
  const participantRows = allIds.map((uid) => ({
    conversation_id: conv.id,
    user_id: uid,
  }));
  // Ensure creator is in there
  if (!allIds.includes(user.id)) {
    participantRows.push({ conversation_id: conv.id, user_id: user.id });
  }

  const { error: partError } = await supabase
    .from('conversation_participants')
    .insert(participantRows);

  if (partError) return { error: partError.message };

  revalidatePath('/dashboard/messages');
  return { success: true, conversation_id: conv.id, existing: false };
}

// ─── Send Message ─────────────────────────────────────────

const sendMessageSchema = z.object({
  conversation_id: z.string().uuid(),
  content: z.string().min(1, 'Message cannot be empty').max(5000),
});

export async function sendMessage(formData: FormData) {
  const auth = await requireUser();
  if ('error' in auth) return { error: auth.error };
  const { user, supabase } = auth;

  const raw = {
    conversation_id: formData.get('conversation_id'),
    content: formData.get('content'),
  };

  const parsed = sendMessageSchema.safeParse(raw);
  if (!parsed.success) return { error: formatZodError(parsed.error) };

  const { conversation_id, content } = parsed.data;

  // Verify participant
  const { data: participant } = await supabase
    .from('conversation_participants')
    .select('id')
    .eq('conversation_id', conversation_id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!participant) return { error: 'You are not a participant in this conversation' };

  // Broadcast write guard
  const { data: conv } = await supabase
    .from('conversations')
    .select('type')
    .eq('id', conversation_id)
    .single();

  if (conv?.type === 'broadcast' && user.role !== 'admin') {
    return { error: 'Only admins can send to broadcasts' };
  }

  const { data: message, error } = await supabase
    .from('messages')
    .insert({
      conversation_id,
      sender_id: user.id,
      content,
    })
    .select('*, sender:sender_id(id, name)')
    .single();

  if (error) return { error: error.message };

  // Update participant's last_read_at so their own message doesn't count as unread
  await supabase
    .from('conversation_participants')
    .update({ last_read_at: new Date().toISOString() })
    .eq('conversation_id', conversation_id)
    .eq('user_id', user.id);

  return { success: true, message: message as Message };
}

// ─── Edit Message ─────────────────────────────────────────

const editMessageSchema = z.object({
  message_id: z.string().uuid(),
  content: z.string().min(1, 'Message cannot be empty').max(5000),
});

export async function editMessage(formData: FormData) {
  const auth = await requireUser();
  if ('error' in auth) return { error: auth.error };
  const { user, supabase } = auth;

  const raw = {
    message_id: formData.get('message_id'),
    content: formData.get('content'),
  };

  const parsed = editMessageSchema.safeParse(raw);
  if (!parsed.success) return { error: formatZodError(parsed.error) };

  const { message_id, content } = parsed.data;

  // Verify ownership or admin
  const { data: existing } = await supabase
    .from('messages')
    .select('sender_id, conversation_id')
    .eq('id', message_id)
    .single();

  if (!existing) return { error: 'Message not found' };
  if (existing.sender_id !== user.id && user.role !== 'admin') {
    return { error: 'You can only edit your own messages' };
  }

  const { error } = await supabase
    .from('messages')
    .update({ content })
    .eq('id', message_id);

  if (error) return { error: error.message };

  return { success: true };
}

// ─── Delete Message ───────────────────────────────────────

export async function deleteMessage(messageId: string) {
  const auth = await requireUser();
  if ('error' in auth) return { error: auth.error };
  const { user, supabase } = auth;

  const { data: existing } = await supabase
    .from('messages')
    .select('sender_id')
    .eq('id', messageId)
    .single();

  if (!existing) return { error: 'Message not found' };
  if (existing.sender_id !== user.id && user.role !== 'admin') {
    return { error: 'You can only delete your own messages' };
  }

  const { error } = await supabase
    .from('messages')
    .delete()
    .eq('id', messageId);

  if (error) return { error: error.message };

  return { success: true };
}

// ─── Load Conversations (for sidebar list) ─────────────────

export async function loadConversations(): Promise<{ data: Conversation[] } | { error: string }> {
  const auth = await requireUser();
  if ('error' in auth) return { error: auth.error };
  const { user, supabase } = auth;

  // Get all conversations the user participates in
  const { data: participants, error: partError } = await supabase
    .from('conversation_participants')
    .select('conversation_id, last_read_at')
    .eq('user_id', user.id);

  if (partError) return { error: partError.message };
  if (!participants || participants.length === 0) return { data: [] };

  const convIds = participants.map((p) => p.conversation_id);

  // Fetch conversations with last message and participant info
  const { data: conversations, error: convError } = await supabase
    .from('conversations')
    .select(`
      *,
      participants:conversation_participants(user_id, last_read_at, user:user_id(id, name, role)),
      last_message:messages(content, sender_id, created_at, sender:sender_id(name))
    `)
    .in('id', convIds)
    .order('last_message_at', { ascending: false, nullsFirst: false });

  if (convError) return { error: convError.message };

  // Compute unread counts
  const enriched = (conversations || []).map((conv) => {
    const myParticipation = participants.find((p) => p.conversation_id === conv.id);
    const unread_count = conv.last_message_at && myParticipation
      ? (conv.last_message_at > myParticipation.last_read_at ? 1 : 0)
      : 0;

    return {
      ...conv,
      unread_count,
      participants: conv.participants || [],
      last_message: Array.isArray(conv.last_message) ? conv.last_message[0] : conv.last_message,
    } as Conversation;
  });

  return { data: enriched };
}

// ─── Load Messages for a Conversation ──────────────────────

export async function loadMessages(
  conversationId: string,
  cursor?: string
): Promise<{ data: Message[]; hasMore: boolean } | { error: string }> {
  const auth = await requireUser();
  if ('error' in auth) return { error: auth.error };
  const { user, supabase } = auth;

  // Verify participant
  const { data: participant } = await supabase
    .from('conversation_participants')
    .select('id')
    .eq('conversation_id', conversationId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!participant) return { error: 'Not a participant' };

  // Fetch last 50 messages, cursor for pagination
  let query = supabase
    .from('messages')
    .select('*, sender:sender_id(id, name)')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (cursor) {
    query = query.lt('created_at', cursor);
  }

  const { data, error } = await query;

  if (error) return { error: error.message };

  // Reverse so oldest is first (chat display order)
  const messages = (data || []).reverse() as Message[];

  return { data: messages, hasMore: data?.length === 50 };
}

// ─── Mark Conversation as Read ─────────────────────────────

export async function markRead(conversationId: string) {
  const auth = await requireUser();
  if ('error' in auth) return { error: auth.error };
  const { user, supabase } = auth;

  await supabase
    .from('conversation_participants')
    .update({ last_read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .eq('user_id', user.id);

  return { success: true };
}

// ─── Leave Conversation ───────────────────────────────────

export async function leaveConversation(conversationId: string) {
  const auth = await requireUser();
  if ('error' in auth) return { error: auth.error };
  const { user, supabase } = auth;

  const { error } = await supabase
    .from('conversation_participants')
    .delete()
    .eq('conversation_id', conversationId)
    .eq('user_id', user.id);

  if (error) return { error: error.message };

  revalidatePath('/dashboard/messages');
  return { success: true };
}

// ─── Unread Count (lightweight, for sidebar badge) ──────────

export async function getUnreadMessageCount(): Promise<{ count: number } | { error: string }> {
  const auth = await requireUser();
  if ('error' in auth) return { error: auth.error };
  const { user, supabase } = auth;

  const { data: participants, error } = await supabase
    .from('conversation_participants')
    .select('conversation_id, last_read_at')
    .eq('user_id', user.id);

  if (error || !participants || participants.length === 0) return { count: 0 };

  const convIds = participants.map((p) => p.conversation_id);

  const { data: conversations } = await supabase
    .from('conversations')
    .select('id, last_message_at')
    .in('id', convIds);

  if (!conversations) return { count: 0 };

  let count = 0;
  for (const conv of conversations) {
    const p = participants.find((x) => x.conversation_id === conv.id);
    if (p && conv.last_message_at && conv.last_message_at > p.last_read_at) {
      count++;
    }
  }

  return { count };
}
