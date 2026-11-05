import { z } from 'zod';

export const CartItemInputSchema = z.object({
  variantId: z.string().min(1, 'Mã biến thể không được để trống'),
  quantity: z.number().int().positive().max(999, 'Số lượng không hợp lệ'),
  unitPrice: z.number().nonnegative().optional(),
});

export type CartItemInput = z.infer<typeof CartItemInputSchema>;

export const CartPayloadSchema = z
  .object({
    items: z.array(CartItemInputSchema).max(100).optional(),
    lines: z.array(CartItemInputSchema).max(100).optional(),
  })
  .refine((data) => (data.items ?? data.lines) !== undefined, {
    message: 'Thiếu danh sách sản phẩm (items hoặc lines)',
  })
  .transform((data) => {
    const items = (data.items ?? data.lines)!;
    return {
      items,
      lines: items,
    };
  });

export type CartPayload = z.infer<typeof CartPayloadSchema>;

export const CustomerSchema = z.object({
  fullName: z.string().min(2, 'Họ tên phải có ít nhất 2 ký tự'),
  email: z.string().email('Email không hợp lệ'),
  phone: z.string().regex(/^[0-9+() -]{9,15}$/, 'Số điện thoại không hợp lệ'),
  address: z.string().min(5, 'Địa chỉ giao hàng quá ngắn'),
  city: z.string().min(2, 'Tỉnh/Thành phố không hợp lệ'),
  postalCode: z.string().optional(),
  notes: z.string().max(500, 'Ghi chú tối đa 500 ký tự').optional(),
});

export type CustomerInput = z.infer<typeof CustomerSchema>;

export const CheckoutPayloadSchema = z
  .object({
    customer: CustomerSchema,
    items: z.array(CartItemInputSchema).min(1, 'Giỏ hàng không được để trống').optional(),
    lines: z.array(CartItemInputSchema).min(1, 'Giỏ hàng không được để trống').optional(),
    paymentMethod: z.enum(['stripe', 'vnpay', 'momo', 'cod']).default('cod'),
  })
  .refine((data) => (data.items ?? data.lines) !== undefined && (data.items ?? data.lines)!.length > 0, {
    message: 'Giỏ hàng không được để trống (cần items hoặc lines)',
  })
  .transform((data) => {
    const items = (data.items ?? data.lines)!;
    return {
      customer: data.customer,
      items,
      lines: items,
      paymentMethod: data.paymentMethod,
    };
  });

export type CheckoutPayload = z.infer<typeof CheckoutPayloadSchema>;
