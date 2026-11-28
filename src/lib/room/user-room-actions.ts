'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/account/actions';
import {
  deleteUserSavedRoom,
  getUserSavedRoomById,
  listUserSavedRooms,
  saveUserRoom,
} from '@/lib/room/user-rooms-dal';
import type { RoomItem, UserSavedRoom, WindowConfig } from '@/lib/room/types';
import type { Product } from '@/lib/catalog/types';

export interface SaveUserRoomResult {
  success: boolean;
  room?: UserSavedRoom;
  error?: string;
}

export async function saveCustomerRoomAction(payload: {
  id?: string;
  name: string;
  description?: string;
  aspectRatio?: number;
  wallCount?: number;
  windows?: WindowConfig[];
  items: RoomItem[];
}): Promise<SaveUserRoomResult> {
  const user = await getCurrentUser();
  if (!user) {
    return {
      success: false,
      error: 'Vui lòng đăng nhập tài khoản để lưu không gian 3D của bạn.',
    };
  }

  const cleanName = payload.name.trim();
  if (!cleanName) {
    return {
      success: false,
      error: 'Tên không gian 3D không được để trống.',
    };
  }

  try {
    const saved = await saveUserRoom(
      {
        id: payload.id,
        name: cleanName,
        description: payload.description,
        aspectRatio: payload.aspectRatio,
        wallCount: payload.wallCount,
        windows: payload.windows,
        items: payload.items,
      },
      user.id
    );

    revalidatePath('/account');
    revalidatePath('/setup');
    return {
      success: true,
      room: saved,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Lỗi khi lưu không gian 3D.';
    return {
      success: false,
      error: msg,
    };
  }
}

export async function deleteCustomerRoomAction(
  roomId: string
): Promise<{ success: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) {
    return {
      success: false,
      error: 'Vui lòng đăng nhập để thực hiện thao tác này.',
    };
  }

  if (!roomId) {
    return {
      success: false,
      error: 'Thiếu mã định danh không gian cần xóa.',
    };
  }

  try {
    const ok = await deleteUserSavedRoom(roomId, user.id);
    if (!ok) {
      return {
        success: false,
        error: 'Không thể xóa không gian hoặc bạn không có quyền xóa.',
      };
    }

    revalidatePath('/account');
    revalidatePath('/setup');
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Lỗi khi xóa không gian 3D.';
    return {
      success: false,
      error: msg,
    };
  }
}

export async function listCustomerRoomsAction(): Promise<UserSavedRoom[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  return listUserSavedRooms(user.id);
}

export async function getCustomerRoomAction(
  roomId: string
): Promise<UserSavedRoom | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  return getUserSavedRoomById(roomId, user.id);
}

export async function listDynamicCatalogProductsAction(): Promise<Product[]> {
  try {
    const { listProducts } = await import('@/lib/catalog/dal');
    return await listProducts();
  } catch {
    const { PRODUCT_RECORDS } = await import('@/lib/catalog/sample-data');
    return PRODUCT_RECORDS;
  }
}
