'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import {
  archiveCatalogProduct,
  deleteCatalogMedia,
  saveCatalogProduct,
  uploadCatalogMedia,
  uploadCatalogModelMedia,
  updateCatalogModelConfig,
} from '@/lib/catalog/dal';
import { ModelConfigSchema } from '@/lib/schemas/model-config';
import { processProductImages } from '@/lib/catalog/image-processing';
import { ProductInputSchema as ProductSchema } from '@/lib/catalog/schema';
import { updateAdminOrderStatus } from '@/lib/orders/dal';

export interface AdminFormState {
  error?: string;
}

export async function saveProductAction(
  _previousState: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  let variants: unknown;
  try {
    variants = JSON.parse(String(formData.get('variants') ?? ''));
  } catch {
    return { error: 'Biến thể phải là JSON hợp lệ.' };
  }

  const parsed = ProductSchema.safeParse({
    id: String(formData.get('id') ?? '') || undefined,
    slug: formData.get('slug'),
    name: formData.get('name'),
    categoryId: formData.get('categoryId'),
    summary: formData.get('summary'),
    description: formData.get('description'),
    highlights: String(formData.get('highlights') ?? '')
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean),
    brand: formData.get('brand'),
    sourceUrl: String(formData.get('sourceUrl') ?? '').trim() || null,
    status: formData.get('status'),
    variants,
  });

  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Thông tin sản phẩm không hợp lệ.' };

  let productId: string;
  try {
    productId = await saveCatalogProduct(parsed.data);
  } catch {
    return { error: 'Không lưu được sản phẩm. Kiểm tra dữ liệu và quyền quản trị rồi thử lại.' };
  }
  revalidateTag('catalog', 'max');
  revalidatePath('/');
  revalidatePath('/[category]', 'page');
  revalidatePath('/[category]/[product]', 'page');
  revalidatePath('/admin/products');
  redirect(`/admin/products?saved=${encodeURIComponent(productId)}`);
}

export async function archiveProductAction(formData: FormData) {
  const productId = String(formData.get('productId') ?? '').trim();
  if (!productId) throw new Error('Product id is required.');

  await archiveCatalogProduct(productId);
  revalidateTag('catalog', 'max');
  revalidatePath('/');
  revalidatePath('/[category]', 'page');
  revalidatePath('/admin/products');
  redirect('/admin/products?archived=1');
}

export async function uploadMediaAction(formData: FormData) {
  const productId = String(formData.get('productId') ?? '').trim();
  const productName = String(formData.get('productName') ?? '').trim();
  const userAlt = String(formData.get('alt') ?? '').trim();

  const rawFiles = [
    ...formData.getAll('files'),
    ...formData.getAll('file'),
  ].filter((item): item is File => item instanceof File && item.size > 0);

  if (!productId || rawFiles.length === 0) {
    throw new Error('Vui lòng chọn ít nhất một file ảnh để tải lên.');
  }

  const totalBatchSize = rawFiles.reduce((acc, file) => acc + file.size, 0);
  if (totalBatchSize > 25 * 1024 * 1024) {
    throw new Error('Tổng dung lượng các file ảnh tải lên trong một mẻ vượt quá giới hạn 25 MB.');
  }

  const fileInputs: Array<{ name: string; buffer: Buffer }> = [];

  for (const file of rawFiles) {
    if (file.size > 15 * 1024 * 1024) {
      throw new Error(`File "${file.name}" vượt quá kích thước 15 MB.`);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const imageType = detectImageType(new Uint8Array(buffer));
    if (!imageType) {
      throw new Error(`File "${file.name}" không hợp lệ. Chỉ chấp nhận ảnh JPEG, PNG hoặc WebP.`);
    }

    fileInputs.push({ name: file.name, buffer });
  }

  // Pass through background removal (rembg) and 1:1 aspect ratio standardization
  const processedImages = await processProductImages(fileInputs, {
    targetDim: 1200,
    paddingRatio: 0.82,
    shadowOpacity: 0.22,
  });

  for (let i = 0; i < processedImages.length; i++) {
    const item = processedImages[i];
    let finalAlt: string;

    if (userAlt) {
      finalAlt = processedImages.length > 1 ? `${userAlt} (${i + 1})` : userAlt;
    } else {
      const cleanFileName = item.originalName.replace(/\.[^/.]+$/, '').trim();
      const baseName = productName || cleanFileName || 'Ảnh sản phẩm';
      finalAlt = processedImages.length > 1 ? `${baseName} - Góc ${i + 1}` : `${baseName} - Ảnh chi tiết`;
    }

    await uploadCatalogMedia({
      productId,
      fileName: `upload-${crypto.randomUUID()}.${item.extension}`,
      contentType: item.contentType,
      content: item.content,
      alt: finalAlt,
      width: item.width,
      height: item.height,
    });
  }

  revalidateTag('catalog', 'max');
  revalidatePath('/admin/products');
  revalidatePath('/[category]', 'page');
  revalidatePath('/[category]/[product]', 'page');
  redirect('/admin/products?media=added');
}

function detectImageType(bytes: Uint8Array) {
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

export async function deleteMediaAction(formData: FormData) {
  const mediaId = String(formData.get('mediaId') ?? '').trim();
  if (!mediaId) throw new Error('Media id is required.');

  await deleteCatalogMedia(mediaId);
  revalidateTag('catalog', 'max');
  revalidatePath('/admin/products');
  revalidatePath('/[category]', 'page');
  revalidatePath('/[category]/[product]', 'page');
  redirect('/admin/products?media=deleted');
}

const OrderStatusSchema = z.enum([
  'pending',
  'paid',
  'processing',
  'partially_fulfilled',
  'fulfilled',
  'cancelled',
  'failed',
]);

export async function updateOrderStatusAction(formData: FormData) {
  const orderId = String(formData.get('orderId') ?? '').trim();
  const status = OrderStatusSchema.safeParse(formData.get('status'));
  if (!orderId || !status.success) throw new Error('Order status update is invalid.');

  await updateAdminOrderStatus(orderId, status.data);
  revalidatePath('/admin/orders');
  redirect('/admin/orders?updated=1');
}

export async function uploadModelMediaAction(formData: FormData) {
  const productId = String(formData.get('productId') ?? '').trim();
  const file = formData.get('file');

  if (!productId || !(file instanceof File) || file.size === 0) {
    throw new Error('Vui lòng chọn file 3D (.glb / .gltf) hợp lệ.');
  }

  const MAX_3D_MODEL_SIZE = 100 * 1024 * 1024; // 100 MB
  if (file.size > MAX_3D_MODEL_SIZE) {
    throw new Error('Dung lượng file 3D vượt quá giới hạn tối đa 100 MB.');
  }

  const buffer = await file.arrayBuffer();
  const headerBytes = new Uint8Array(buffer.slice(0, 4));
  const magic = String.fromCharCode(...headerBytes);
  if (magic !== 'glTF') {
    throw new Error('File không hợp lệ: Thiếu glTF magic header.');
  }

  await uploadCatalogModelMedia({
    productId,
    fileName: file.name,
    content: buffer,
    alt: `Mô hình 3D của ${productId}`,
  });

  revalidateTag('catalog', 'max');
  revalidatePath('/admin/products');
  revalidatePath('/setup');
  revalidatePath('/mau-setup');
  revalidatePath('/');
  return { success: true };
}

export async function updateModelConfigAction(formData: FormData) {
  const mediaId = String(formData.get('mediaId') ?? '').trim();
  const rawConfig = String(formData.get('modelConfig') ?? '').trim();

  if (!mediaId || !rawConfig) {
    throw new Error('Thiếu mediaId hoặc modelConfig.');
  }

  let jsonConfig: unknown;
  try {
    jsonConfig = JSON.parse(rawConfig);
  } catch {
    throw new Error('Cấu hình 3D phải là chuỗi JSON hợp lệ.');
  }

  const parsed = ModelConfigSchema.safeParse(jsonConfig);
  if (!parsed.success) {
    throw new Error(`Cấu hình không hợp lệ: ${parsed.error.issues.map((i) => i.message).join(', ')}`);
  }

  await updateCatalogModelConfig(mediaId, parsed.data);
  revalidateTag('catalog', 'max');
  revalidatePath('/admin/products');
  revalidatePath('/');
  redirect('/admin/products?model=configured');
}
