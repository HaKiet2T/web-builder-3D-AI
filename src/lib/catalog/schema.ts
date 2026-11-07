import { z } from 'zod';
import type { CategoryId, MediaKind, StockStatus } from '@/lib/catalog/types';
import type { ProductStatus } from '@/lib/supabase/database.types';

export const CategoryIdSchema: z.ZodType<CategoryId> = z.enum([
  'monitor',
  'speaker',
  'mouse',
  'keyboard',
  'monitor-led',
]);

export const StockStatusSchema: z.ZodType<StockStatus> = z.enum([
  'in-stock',
  'preorder',
  'out-of-stock',
]);

export const ProductStatusSchema: z.ZodType<ProductStatus> = z.enum([
  'active',
  'draft',
  'archived',
]);

export const MediaKindSchema: z.ZodType<MediaKind> = z.enum(['image', 'model']);

export const VariantSchema = z.object({
  id: z.string().optional(),
  productId: z.string().optional(),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug biến thể chỉ gồm chữ thường, số và dấu gạch ngang.'),
  name: z.string().min(1, 'Tên biến thể không được để trống.'),
  sku: z.string().min(1, 'Mã SKU không được để trống.'),
  price: z.number().int().nonnegative('Giá bán phải là số nguyên không âm.'),
  compareAtPrice: z.number().int().nonnegative().nullable(),
  stockStatus: StockStatusSchema,
  stockQuantity: z.number().int().nonnegative('Số lượng tồn kho không được âm.'),
  options: z.record(z.string(), z.string()),
});

export type VariantInput = z.infer<typeof VariantSchema>;

export const ProductMediaSchema = z.object({
  id: z.string().optional(),
  productId: z.string().optional(),
  kind: MediaKindSchema,
  url: z.string().min(1, 'Đường dẫn media không được để trống.'),
  storagePath: z.string().nullable().optional(),
  alt: z.string().default(''),
  width: z.number().int().positive().nullable().optional(),
  height: z.number().int().positive().nullable().optional(),
  position: z.number().int().default(0),
});

export type ProductMediaInput = z.infer<typeof ProductMediaSchema>;

export const ProductInputSchema = z.object({
  id: z.string().optional(),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug chỉ gồm chữ thường, số và dấu gạch ngang.'),
  name: z.string().trim().min(2, 'Tên sản phẩm tối thiểu 2 ký tự.'),
  categoryId: CategoryIdSchema,
  summary: z.string().trim().min(1, 'Tóm tắt không được để trống.'),
  description: z.string().trim().min(1, 'Mô tả không được để trống.'),
  highlights: z.array(z.string().trim().min(1)).min(1, 'Cần ít nhất một điểm nổi bật.'),
  brand: z.string().trim().min(1, 'Thương hiệu không được để trống.'),
  sourceUrl: z.string().url('Đường dẫn nguồn không hợp lệ.').nullable(),
  status: ProductStatusSchema,
  variants: z.array(VariantSchema).min(1, 'Cần ít nhất một biến thể sản phẩm.'),
});

export type ProductFormInput = z.infer<typeof ProductInputSchema>;

export const CategorySchema = z.object({
  id: CategoryIdSchema,
  slug: z.string().min(1),
  name: z.string().min(1),
  description: z.string().default(''),
  position: z.number().int().default(0),
});

export type CategoryInput = z.infer<typeof CategorySchema>;
