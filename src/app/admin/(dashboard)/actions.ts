'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import {
  archiveCatalogProduct,
  deleteCatalogMedia,
  saveCatalogProduct,
  uploadCatalogMedia,
} from '@/lib/catalog/dal';
import { processProductImages } from '@/lib/catalog/image-processing';
import { updateAdminOrderStatus } from '@/lib/orders/dal';

export interface AdminFormState {
  error?: string;
}

const VariantSchema = z.object({
  id: z.string().optional(),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: z.string().min(1),
  sku: z.string().min(1),
  price: z.number().int().nonnegative(),
  compareAtPrice: z.number().int().nonnegative().nullable(),
  stockStatus: z.enum(['in-stock', 'preorder', 'out-of-stock']),
  stockQuantity: z.number().int().nonnegative(),
  options: z.record(z.string(), z.string()),
});

const ProductSchema = z.object({
  id: z.string().optional(),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug chỉ gồm chữ thường, số và dấu gạch ngang.'),
  name: z.string().trim().min(2),
  categoryId: z.enum(['monitor', 'speaker', 'mouse', 'keyboard', 'monitor-led']),
  summary: z.string().trim().min(1),
  description: z.string().trim().min(1),
  highlights: z.array(z.string().trim().min(1)).min(1),
  brand: z.string().trim().min(1),
  sourceUrl: z.string().url().nullable(),
  status: z.enum(['active', 'draft', 'archived']),
  variants: z.array(VariantSchema).min(1),
});

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
