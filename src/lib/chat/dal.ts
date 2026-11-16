import 'server-only';
import { createServiceSupabaseClient } from '@/lib/supabase/service';
import type { ChatIntent, ChatSender } from './schema';
import type { ChatMessageRow, Json } from '@/lib/supabase/database.types';

export async function getOrCreateChatSession(
  userId?: string | null,
  sessionId?: string,
): Promise<string> {
  const supabase = createServiceSupabaseClient();
  const fallbackSessionId = sessionId || crypto.randomUUID();

  if (!supabase) {
    return fallbackSessionId;
  }

  try {
    if (sessionId) {
      const { data: existing } = await supabase
        .from('chat_sessions')
        .select('id, user_id')
        .eq('id', sessionId)
        .maybeSingle();

      if (existing) {
        // If guest logs in, link session to auth user
        if (userId && !existing.user_id) {
          await supabase
            .from('chat_sessions')
            .update({ user_id: userId, updated_at: new Date().toISOString() })
            .eq('id', sessionId);
        }
        return existing.id;
      }
    }

    // Create new session
    const { data: created, error } = await supabase
      .from('chat_sessions')
      .insert({
        id: sessionId || undefined,
        user_id: userId || null,
        title: 'Hỗ trợ khách hàng',
      })
      .select('id')
      .maybeSingle();

    if (error || !created) {
      console.warn('[getOrCreateChatSession] Could not persist session in Supabase:', error?.message);
      return fallbackSessionId;
    }

    return created.id;
  } catch (err) {
    console.warn('[getOrCreateChatSession] Exception in Supabase chat session:', err);
    return fallbackSessionId;
  }
}

export async function saveChatMessage(
  sessionId: string,
  sender: ChatSender,
  content: string,
  intent?: ChatIntent,
  metadata: Json = {},
): Promise<void> {
  const supabase = createServiceSupabaseClient();
  if (!supabase) return;

  try {
    const { error } = await supabase.from('chat_messages').insert({
      session_id: sessionId,
      sender,
      content,
      intent: intent ?? null,
      metadata,
    });

    if (error) {
      console.warn('[saveChatMessage] Notice (Supabase insert message):', error.message);
    }
  } catch (err) {
    console.warn('[saveChatMessage] Exception saving message:', err);
  }
}

export async function listChatMessages(sessionId: string): Promise<ChatMessageRow[]> {
  const supabase = createServiceSupabaseClient();
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (error) {
      console.warn('[listChatMessages] Notice:', error.message);
      return [];
    }
    return data ?? [];
  } catch (err) {
    console.warn('[listChatMessages] Exception:', err);
    return [];
  }
}
