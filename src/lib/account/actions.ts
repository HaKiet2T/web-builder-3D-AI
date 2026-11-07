'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { SignInSchema, SignUpSchema } from '@/lib/account/schema';
import {
  claimGuestOrderByOrderNumber,
  claimGuestOrdersByEmail,
  retryOrderPayment,
} from '@/lib/orders/dal';

export interface AuthActionState {
  error?: string;
  success?: string;
}

export async function getCurrentUser() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) return null;
    return user;
  } catch {
    return null;
  }
}

export async function signInUser(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  void _prevState;
  const parsed = SignInSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Thông tin đăng nhập không hợp lệ.' };
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return { error: 'Dịch vụ xác thực chưa sẵn sàng. Vui lòng thử lại sau.' };
  }

  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return {
      error:
        error.status === 400
          ? 'Email hoặc mật khẩu không chính xác.'
          : 'Không thể kết nối máy chủ xác thực. Vui lòng thử lại.',
    };
  }

  if (!data.user) {
    return { error: 'Đăng nhập không thành công.' };
  }

  const redirectUrl = formData.get('redirect')?.toString() || '/account';
  redirect(redirectUrl);
}

export async function signUpUser(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  void _prevState;
  const parsed = SignUpSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    fullName: formData.get('fullName'),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dữ liệu đăng ký không hợp lệ.' };
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return { error: 'Dịch vụ xác thực chưa sẵn sàng. Vui lòng thử lại sau.' };
  }

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        full_name: parsed.data.fullName,
      },
    },
  });

  if (error) {
    return { error: error.message || 'Không thể tạo tài khoản. Vui lòng thử lại.' };
  }

  if (data.session) {
    const redirectUrl = formData.get('redirect')?.toString() || '/account';
    redirect(redirectUrl);
  }

  return {
    success: 'Tài khoản đã được tạo thành công! Bạn có thể đăng nhập ngay.',
  };
}

export async function signOutUser() {
  const supabase = await createServerSupabaseClient();
  if (supabase) {
    await supabase.auth.signOut();
  }
  redirect('/account/login');
}

export async function claimGuestOrderAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  void _prevState;
  const user = await getCurrentUser();
  if (!user) {
    return { error: 'Bạn cần đăng nhập để liên kết đơn hàng vào tài khoản.' };
  }

  const orderNumber = formData.get('orderNumber')?.toString().trim();
  if (!orderNumber) {
    return { error: 'Vui lòng nhập mã đơn hàng cần liên kết.' };
  }

  const result = await claimGuestOrderByOrderNumber(orderNumber, user.id, user.email);
  if (!result.success) {
    return { error: result.message };
  }

  revalidatePath('/account');
  revalidatePath('/account/orders');
  return { success: result.message };
}

export async function claimAllGuestOrdersAction(
  _prevState: AuthActionState,
  _formData: FormData,
): Promise<AuthActionState> {
  void _prevState;
  void _formData;
  const user = await getCurrentUser();
  if (!user || !user.email) {
    return { error: 'Bạn cần đăng nhập để thực hiện đồng bộ.' };
  }

  const result = await claimGuestOrdersByEmail(user.email, user.id);
  if (!result.success) {
    return { error: result.message };
  }

  revalidatePath('/account');
  revalidatePath('/account/orders');
  return { success: result.message };
}

export async function retryOrderPaymentAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  void _prevState;
  const user = await getCurrentUser();
  if (!user) {
    return { error: 'Bạn cần đăng nhập để thao tác.' };
  }

  const orderId = formData.get('orderId')?.toString().trim();
  const paymentMethod = formData.get('paymentMethod')?.toString().trim();

  if (!orderId) {
    return { error: 'Mã đơn hàng không hợp lệ.' };
  }

  const result = await retryOrderPayment(orderId, paymentMethod);
  if (!result.success) {
    return { error: result.message };
  }

  revalidatePath('/account');
  revalidatePath('/account/orders');
  revalidatePath(`/orders/${orderId}`);
  return { success: result.message };
}
