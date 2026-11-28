import 'server-only';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { UserSavedRoomRow, Json } from '@/lib/supabase/database.types';
import type { RoomItem, UserSavedRoom } from '@/lib/room/types';

// In-memory fallback for local environments or when database table is migrating
const memorySavedRooms = new Map<string, UserSavedRoom>();

export async function listUserSavedRooms(userId: string): Promise<UserSavedRoom[]> {
  if (!userId) return [];

  try {
    const supabase = await createServerSupabaseClient();
    if (supabase) {
      // Use typed query builder
      const { data, error } = await supabase
        .from('user_saved_rooms')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        return data.map((row: UserSavedRoomRow) => ({
          id: row.id,
          userId: row.user_id,
          name: row.name,
          description: row.description || '',
          aspectRatio: Number(row.aspect_ratio || 1.6),
          items: Array.isArray(row.items) ? (row.items as unknown as RoomItem[]) : [],
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }));
      }
    }
  } catch {
    // Fallback to in-memory store
  }

  // Return rooms from memory for this user
  return Array.from(memorySavedRooms.values())
    .filter((r) => r.userId === userId)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export async function saveUserRoom(
  input: {
    id?: string;
    name: string;
    description?: string;
    aspectRatio?: number;
    wallCount?: number;
    windows?: UserSavedRoom['windows'];
    items: RoomItem[];
  },
  userId: string
): Promise<UserSavedRoom> {
  if (!userId) {
    throw new Error('Yêu cầu đăng nhập tài khoản để lưu không gian 3D.');
  }

  const cleanName = input.name.trim() || 'Không gian 3D của tôi';
  const now = new Date().toISOString();
  const roomId = input.id || crypto.randomUUID();

  const payload: UserSavedRoom = {
    id: roomId,
    userId,
    name: cleanName,
    description: input.description || '',
    aspectRatio: input.aspectRatio || 1.6,
    wallCount: input.wallCount || 2,
    windows: input.windows || [],
    items: input.items,
    createdAt: now,
    updatedAt: now,
  };

  try {
    const supabase = await createServerSupabaseClient();
    if (supabase) {
      const dbPayload = {
        id: roomId,
        user_id: userId,
        name: cleanName,
        description: input.description || '',
        aspect_ratio: input.aspectRatio || 1.6,
        items: input.items as unknown as Json,
        updated_at: now,
      };

      const { data, error } = await supabase
        .from('user_saved_rooms')
        .upsert(dbPayload, { onConflict: 'id' })
        .select('*')
        .single();

      if (!error && data) {
        return {
          id: data.id,
          userId: data.user_id,
          name: data.name,
          description: data.description || '',
          aspectRatio: Number(data.aspect_ratio || 1.6),
          items: Array.isArray(data.items) ? (data.items as unknown as RoomItem[]) : [],
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        };
      }
    }
  } catch {
    // Fallback to in-memory
  }

  memorySavedRooms.set(roomId, payload);
  return payload;
}

export async function getUserSavedRoomById(
  id: string,
  userId: string
): Promise<UserSavedRoom | null> {
  if (!id || !userId) return null;

  try {
    const supabase = await createServerSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase
        .from('user_saved_rooms')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .maybeSingle();

      if (!error && data) {
        return {
          id: data.id,
          userId: data.user_id,
          name: data.name,
          description: data.description || '',
          aspectRatio: Number(data.aspect_ratio || 1.6),
          items: Array.isArray(data.items) ? (data.items as unknown as RoomItem[]) : [],
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        };
      }
    }
  } catch {
    // Fallback
  }

  const cached = memorySavedRooms.get(id);
  return cached && cached.userId === userId ? cached : null;
}

export async function deleteUserSavedRoom(id: string, userId: string): Promise<boolean> {
  if (!id || !userId) return false;

  try {
    const supabase = await createServerSupabaseClient();
    if (supabase) {
      const { error } = await supabase
        .from('user_saved_rooms')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (!error) {
        memorySavedRooms.delete(id);
        return true;
      }
    }
  } catch {
    // Fallback
  }

  memorySavedRooms.delete(id);
  return true;
}
