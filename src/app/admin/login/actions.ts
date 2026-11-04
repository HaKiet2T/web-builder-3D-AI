'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export interface LoginState {
  error?: string;
}

const LoginSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
});

export async function signInAdmin(
  _previousState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = LoginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Thông tin đăng nhập không hợp lệ.' };

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return { error: 'Supabase chưa được cấu hình. Hãy xem hướng dẫn trong README.' };
  }

  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    console.error('[admin login]', error.message);
    return {
      error: error.status === 400
        ? 'Email hoặc mật khẩu không chính xác.'
        : 'Không kết nối được dịch vụ đăng nhập. Vui lòng thử lại.',
    };
  }
  if (!data.user) return { error: 'Email hoặc mật khẩu không chính xác.' };

  if (data.user.app_metadata.role !== 'admin') {
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) throw new Error(`Could not sign out a non-admin account: ${signOutError.message}`);
    return { error: 'Tài khoản này chưa được cấp quyền quản trị.' };
  }

  redirect('/admin');
}

export async function signOutAdmin() {
  const supabase = await createServerSupabaseClient();
  if (supabase) {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(`Could not sign out: ${error.message}`);
  }
  redirect('/admin/login');
}
