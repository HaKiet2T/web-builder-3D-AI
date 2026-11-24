'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  deleteDecorAsset,
  deleteRoomSetup,
  listDecorAssets,
  saveRoomItems,
  uploadDecorAsset,
  upsertRoomSetup,
} from '@/lib/room/dal';
import {
  RoomSetupInputSchema,
  type RoomItemInput,
} from '@/lib/room/schema';
import type { DecorAsset, RoomItem, RoomSetup } from '@/lib/room/types';

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
  if (!id) throw new Error('Thiếu ID góc setup cần xóa.');

  await deleteRoomSetup(id);
  revalidatePath('/admin/rooms');
  revalidatePath('/mau-setup');
  revalidatePath('/khong-gian/[slug]', 'page');
  redirect('/admin/rooms?deleted=1');
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

  await upsertRoomSetup({
    id,
    slug,
    title,
    bgImageUrl,
    aspectRatio,
    status: nextStatus as 'draft' | 'published',
  });

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

