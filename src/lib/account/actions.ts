'use server';

import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { SignInSchema, SignUpSchema } from '@/lib/account/schema';

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
