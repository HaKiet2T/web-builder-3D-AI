import { z } from 'zod';

export const SignInSchema = z.object({
  email: z.string().trim().email('Địa chỉ email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
});

export type SignInInput = z.infer<typeof SignInSchema>;

export const SignUpSchema = z.object({
  email: z.string().trim().email('Địa chỉ email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
  fullName: z.string().trim().min(2, 'Họ tên phải có ít nhất 2 ký tự'),
});

export type SignUpInput = z.infer<typeof SignUpSchema>;

export const AddressInputSchema = z.object({
  recipientName: z.string().trim().min(2, 'Họ tên người nhận quá ngắn'),
  phone: z.string().trim().regex(/^[0-9+() -]{9,15}$/, 'Số điện thoại không hợp lệ'),
  streetAddress: z.string().trim().min(5, 'Địa chỉ đường/phố quá ngắn'),
  city: z.string().trim().min(2, 'Tỉnh/Thành phố không hợp lệ'),
  postalCode: z.string().trim().optional(),
  isDefault: z.boolean().default(false),
});

export type AddressInput = z.infer<typeof AddressInputSchema>;

export const NotificationInputSchema = z.object({
  userId: z.string().uuid('Mã tài khoản không hợp lệ'),
  orderId: z.string().optional(),
  title: z.string().trim().min(1, 'Tiêu đề không được để trống'),
  message: z.string().trim().min(1, 'Nội dung thông báo không được để trống'),
  type: z.enum(['order', 'payment', 'system', 'promo']).default('order'),
});

export type NotificationInput = z.infer<typeof NotificationInputSchema>;
