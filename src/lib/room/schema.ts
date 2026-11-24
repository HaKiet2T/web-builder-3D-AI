import { z } from 'zod';
import type { RoomItemType, RoomSetupStatus } from '@/lib/room/types';

export const RoomSetupStatusSchema: z.ZodType<RoomSetupStatus> = z.enum(['draft', 'published']);

export const RoomItemTypeSchema: z.ZodType<RoomItemType> = z.enum(['product', 'decor']);

export const RoomItemSchema = z
  .object({
    id: z.string().optional(),
    setupId: z.string().optional(),
    itemType: RoomItemTypeSchema,
    productId: z.string().nullable().optional(),
    variantId: z.string().nullable().optional(),
    customImageUrl: z.string().nullable().optional(),
    label: z.string().nullable().optional(),
    xPct: z.number().min(0, 'Tọa độ X phải từ 0% trở lên.').max(100, 'Tọa độ X tối đa 100%.'),
    yPct: z.number().min(0, 'Tọa độ Y phải từ 0% trở lên.').max(100, 'Tọa độ Y tối đa 100%.'),
    widthPct: z.number().positive('Chiều rộng % phải lớn hơn 0.').max(100, 'Chiều rộng % tối đa 100%.'),
    rotation: z.number().default(0),
    flipX: z.boolean().default(false),
    zIndex: z.number().int().default(1),
  })
  .superRefine((data, ctx) => {
    if (data.itemType === 'product') {
      if (!data.productId || data.productId.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['productId'],
          message: 'Vật phẩm loại sản phẩm bắt buộc phải có productId hợp lệ.',
        });
      }
    } else if (data.itemType === 'decor') {
      if (data.productId !== null && data.productId !== undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['productId'],
          message: 'Vật phẩm trang trí (decor) không được liên kết với productId.',
        });
      }
      if (!data.customImageUrl || data.customImageUrl.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['customImageUrl'],
          message: 'Vật phẩm trang trí bắt buộc phải có đường dẫn ảnh customImageUrl.',
        });
      }
    }
  });

export type RoomItemInput = z.input<typeof RoomItemSchema>;

export const RoomSetupInputSchema = z.object({
  id: z.string().optional(),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug chỉ gồm chữ thường, số và dấu gạch ngang.'),
  title: z.string().trim().min(2, 'Tiêu đề góc setup tối thiểu 2 ký tự.'),
  description: z.string().default(''),
  bgImageUrl: z.string().min(1, 'Đường dẫn ảnh nền không được để trống.'),
  aspectRatio: z.number().positive('Tỷ lệ khung hình phải lớn hơn 0.').default(1.6),
  status: RoomSetupStatusSchema.default('draft'),
  comboDiscountPct: z.number().min(0, 'Chiết khấu combo tối thiểu 0%.').max(100, 'Chiết khấu combo tối đa 100%.').default(0),
  sortOrder: z.number().int().default(0),
  items: z.array(RoomItemSchema).optional(),
});

export type RoomSetupInput = z.input<typeof RoomSetupInputSchema>;
