import type { User } from './task';

export type ConversationType = 'dm' | 'group' | 'broadcast';

export interface Conversation {
  id: string;
  type: ConversationType;
  title: string | null;
  created_by: string | null;
  task_id: string | null;
  last_message_at: string | null;
  created_at: string;
  // Joined fields
  participants?: ConversationParticipant[];
  last_message?: Message;
  unread_count?: number;
}

export interface ConversationParticipant {
  id: string;
  conversation_id: string;
  user_id: string;
  last_read_at: string;
  // Joined
  user?: User;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  content: string;
  created_at: string;
  updated_at: string;
  // Joined
  sender?: User;
}
