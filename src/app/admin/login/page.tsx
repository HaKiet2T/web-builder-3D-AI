import type { Metadata } from 'next';
import Link from 'next/link';
import { LoginForm } from '@/app/admin/login/LoginForm';
import { getSupabaseConfig } from '@/lib/supabase/config';

export const metadata: Metadata = {
  title: 'Đăng nhập quản trị',
};

export default function AdminLoginPage() {
  const configured = getSupabaseConfig() !== null;

  return (
    <main className="admin-login-shell">
      <section className="admin-login-card" aria-labelledby="admin-login-title">
        <Link className="admin-back-link" href="/">← Về cửa hàng</Link>
        <p className="admin-eyebrow">HGK · QUẢN TRỊ</p>
        <h1 id="admin-login-title">Đăng nhập</h1>
        <p className="admin-muted">Dùng tài khoản Supabase đã được cấp quyền admin.</p>
        {configured ? (
          <LoginForm />
        ) : (
          <p className="admin-notice" role="status">
            Supabase chưa được cấu hình. Thêm URL và anon key vào môi trường để bật đăng nhập.
          </p>
        )}
      </section>
    </main>
  );
}
