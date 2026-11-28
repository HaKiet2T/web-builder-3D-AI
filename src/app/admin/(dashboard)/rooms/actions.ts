'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  clearAllSampleRooms,
  create3DModelAsset,
  deleteDecorAsset,
  deleteRoomSetup,
  delete3DModelAsset,
  listDecorAssets,
  list3DModelAssets,
  saveRoomItems,
  update3DModelAsset,
  uploadDecorAsset,
  upload3DModelAsset,
  upsertRoomSetup,
} from '@/lib/room/dal';
import {
  RoomSetupInputSchema,
  type RoomItemInput,
} from '@/lib/room/schema';
import type { DecorAsset, Model3DAsset, RoomItem, RoomSetup } from '@/lib/room/types';

export interface RoomAdminActionState {
  error?: string;
  success?: boolean;
  setup?: RoomSetup;
}

export async function saveRoomSetupAction(
  _previousState: RoomAdminActionState,
  formData: FormData,
): Promise<RoomAdminActionState> {
  const rawData = {
    id: String(formData.get('id') || '').trim() || undefined,
    slug: String(formData.get('slug') || '').trim(),
    title: String(formData.get('title') || '').trim(),
    description: String(formData.get('description') || '').trim(),
    bgImageUrl: String(formData.get('bgImageUrl') || '').trim(),
    aspectRatio: Number(formData.get('aspectRatio') || 1.6),
    status: (formData.get('status') || 'draft') as 'draft' | 'published',
    comboDiscountPct: Number(formData.get('comboDiscountPct') || 0),
    sortOrder: Number(formData.get('sortOrder') || 0),
    wallCount: Number(formData.get('wallCount') || 2),
    windows: (() => {
      try {
        const raw = formData.get('windows');
        return raw ? JSON.parse(String(raw)) : [];
      } catch {
        return [];
      }
    })(),
  };

  const parsed = RoomSetupInputSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message || 'Dữ liệu góc setup không hợp lệ.',
    };
  }

  let savedSetup: RoomSetup;
  try {
    savedSetup = await upsertRoomSetup(parsed.data);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Không lưu được góc setup.';
    return { error: msg };
  }

  revalidatePath('/admin/rooms');
  revalidatePath(`/admin/rooms/${savedSetup.id}`);
  revalidatePath('/mau-setup');
  revalidatePath('/khong-gian/[slug]', 'page');

  if (!rawData.id) {
    redirect(`/admin/rooms/${savedSetup.id}?created=1`);
  }

  return { success: true, setup: savedSetup };
}

export async function saveRoomItemsBatchAction(
  setupId: string,
  items: RoomItemInput[],
): Promise<{ success: boolean; error?: string; items?: RoomItem[] }> {
  if (!setupId) {
    return { success: false, error: 'Thiếu định danh setupId.' };
  }

  try {
    const saved = await saveRoomItems(setupId, items);
    revalidatePath(`/admin/rooms/${setupId}`);
    revalidatePath('/mau-setup');
    revalidatePath('/khong-gian/[slug]', 'page');
    return { success: true, items: saved };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Lỗi lưu các vật phẩm trong phòng.';
    return { success: false, error: msg };
  }
}

export async function deleteRoomSetupAction(formData: FormData): Promise<void> {
  const id = String(formData.get('id') || '').trim();
  const slug = String(formData.get('slug') || '').trim();
  if (!id && !slug) {
    redirect('/admin/rooms?error=missing_id');
  }

  try {
    if (id) {
      await deleteRoomSetup(id);
    }
    if (slug && slug !== id) {
      await deleteRoomSetup(slug);
    }
  } catch (err: unknown) {
    console.warn('[deleteRoomSetupAction] Notice during delete:', err);
  }

  revalidatePath('/admin/rooms');
  revalidatePath('/mau-setup');
  revalidatePath('/khong-gian/[slug]', 'page');
  redirect('/admin/rooms?deleted=1');
}

export async function clearAllSampleRoomsAction(): Promise<void> {
  try {
    await clearAllSampleRooms();
  } catch (err: unknown) {
    console.warn('[clearAllSampleRoomsAction] Notice during clear:', err);
  }

  revalidatePath('/admin/rooms');
  revalidatePath('/mau-setup');
  revalidatePath('/khong-gian/[slug]', 'page');
  redirect('/admin/rooms?cleared=1');
}

export async function toggleRoomStatusAction(formData: FormData): Promise<void> {
  const id = String(formData.get('id') || '').trim();
  const slug = String(formData.get('slug') || '').trim();
  const title = String(formData.get('title') || '').trim();
  const bgImageUrl = String(formData.get('bgImageUrl') || '').trim();
  const aspectRatio = Number(formData.get('aspectRatio') || 1.6);
  const currentStatus = String(formData.get('status') || 'draft');
  const nextStatus = currentStatus === 'published' ? 'draft' : 'published';

  if (!id || !slug) return;

  try {
    await upsertRoomSetup({
      id,
      slug,
      title,
      bgImageUrl,
      aspectRatio,
      status: nextStatus as 'draft' | 'published',
    });
  } catch (err: unknown) {
    console.warn('[toggleRoomStatusAction] Notice during status toggle:', err);
  }

  revalidatePath('/admin/rooms');
  revalidatePath('/mau-setup');
  revalidatePath('/khong-gian/[slug]', 'page');
}

function detectDecorImageType(bytes: Uint8Array) {
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return { extension: 'png', contentType: 'image/png' };
  }

  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { extension: 'jpg', contentType: 'image/jpeg' };
  }

  if (
    bytes.length >= 12 &&
    new TextDecoder().decode(bytes.subarray(0, 4)) === 'RIFF' &&
    new TextDecoder().decode(bytes.subarray(8, 12)) === 'WEBP'
  ) {
    return { extension: 'webp', contentType: 'image/webp' };
  }

  return null;
}

export async function uploadDecorAssetAction(
  formData: FormData,
): Promise<{ success: boolean; asset?: DecorAsset; error?: string }> {
  try {
    const rawFile = formData.get('file');
    if (!rawFile || !(rawFile instanceof File) || rawFile.size === 0) {
      return { success: false, error: 'Vui lòng chọn một tệp ảnh để tải lên.' };
    }

    if (rawFile.size > 10 * 1024 * 1024) {
      return { success: false, error: 'Dung lượng ảnh vượt quá giới hạn cho phép (tối đa 10 MB).' };
    }

    const buffer = Buffer.from(await rawFile.arrayBuffer());
    const detected = detectDecorImageType(new Uint8Array(buffer));
    if (!detected) {
      return {
        success: false,
        error: 'Định dạng tệp không hợp lệ. Chỉ chấp nhận ảnh PNG, WebP hoặc JPEG.',
      };
    }

    const label = String(formData.get('label') || '').trim() || undefined;
    const category = String(formData.get('category') || 'custom').trim() || undefined;

    const asset = await uploadDecorAsset({
      fileName: rawFile.name,
      contentType: detected.contentType,
      content: buffer,
      label,
      category,
    });

    revalidatePath('/admin/rooms');
    return { success: true, asset };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Lỗi khi tải ảnh đồ trang trí.';
    return { success: false, error: msg };
  }
}

export async function deleteDecorAssetAction(
  formData: FormData,
): Promise<{ success: boolean; error?: string }> {
  try {
    const storagePath = String(formData.get('storagePath') || '').trim();
    if (!storagePath) {
      return { success: false, error: 'Thiếu đường dẫn tệp storagePath.' };
    }

    await deleteDecorAsset(storagePath);
    revalidatePath('/admin/rooms');
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Lỗi khi xóa đồ trang trí.';
    return { success: false, error: msg };
  }
}

export async function listDecorAssetsAction(): Promise<DecorAsset[]> {
  return listDecorAssets();
}

export async function upload3DModelAction(
  formData: FormData,
): Promise<{ success: boolean; model?: Model3DAsset; error?: string }> {
  try {
    const rawFile = formData.get('file');
    if (!rawFile || !(rawFile instanceof File) || rawFile.size === 0) {
      return { success: false, error: 'Vui lòng chọn một tệp mô hình 3D (.glb) để tải lên.' };
    }

    const MAX_3D_MODEL_SIZE = 100 * 1024 * 1024; // 100 MB
    if (rawFile.size > MAX_3D_MODEL_SIZE) {
      return { success: false, error: 'Dung lượng tệp 3D vượt quá giới hạn cho phép (tối đa 100 MB).' };
    }

    const buffer = Buffer.from(await rawFile.arrayBuffer());
    const isGlb =
      (buffer.length >= 4 &&
        buffer[0] === 0x67 &&
        buffer[1] === 0x6c &&
        buffer[2] === 0x54 &&
        buffer[3] === 0x46) ||
      rawFile.name.toLowerCase().endsWith('.glb');

    if (!isGlb) {
      return {
        success: false,
        error: 'Định dạng tệp không hợp lệ. Chỉ chấp nhận tệp 3D chuẩn nhị phân .glb (glTF binary).',
      };
    }

    const label = String(formData.get('label') || '').trim() || undefined;
    const category = String(formData.get('category') || 'custom').trim() || undefined;

    const model = await upload3DModelAsset({
      fileName: rawFile.name,
      content: buffer,
      label,
      category,
    });

    revalidatePath('/admin/rooms');
    return { success: true, model };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Lỗi khi tải lên tệp 3D GLB.';
    return { success: false, error: msg };
  }
}

export async function list3DModelsAction(): Promise<Model3DAsset[]> {
  return list3DModelAssets();
}

export async function create3DModelAction(
  formData: FormData,
): Promise<{ success: boolean; model?: Model3DAsset; error?: string }> {
  try {
    const label = String(formData.get('label') || '').trim();
    if (!label) {
      return { success: false, error: 'Vui lòng nhập tên cho vật thể 3D.' };
    }
    const category = String(formData.get('category') || 'furniture').trim();
    const modelUrl = String(formData.get('modelUrl') || '').trim() || undefined;

    const model = await create3DModelAsset({
      label,
      category,
      modelUrl,
    });

    revalidatePath('/admin/rooms');
    return { success: true, model };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Lỗi khi tạo vật thể 3D.';
    return { success: false, error: msg };
  }
}

export async function update3DModelAction(
  formData: FormData,
): Promise<{ success: boolean; model?: Model3DAsset; error?: string }> {
  try {
    const id = String(formData.get('id') || '').trim();
    if (!id) {
      return { success: false, error: 'Thiếu ID vật thể 3D cần chỉnh sửa.' };
    }

    const label = String(formData.get('label') || '').trim();
    const category = String(formData.get('category') || '').trim();
    const modelUrl = String(formData.get('modelUrl') || '').trim();

    const model = await update3DModelAsset(id, {
      label: label || undefined,
      category: category || undefined,
      modelUrl: modelUrl || undefined,
    });

    revalidatePath('/admin/rooms');
    return { success: true, model };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Lỗi khi cập nhật vật thể 3D.';
    return { success: false, error: msg };
  }
}

export async function delete3DModelAction(
  formData: FormData,
): Promise<{ success: boolean; error?: string }> {
  try {
    const id = String(formData.get('id') || '').trim();
    if (!id) {
      return { success: false, error: 'Thiếu ID vật thể 3D cần xóa.' };
    }

    await delete3DModelAsset(id);
    revalidatePath('/admin/rooms');
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Lỗi khi xóa vật thể 3D.';
    return { success: false, error: msg };
  }
}



