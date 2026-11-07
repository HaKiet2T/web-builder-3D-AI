import { Suspense } from 'react';
import type { Metadata } from 'next';
import { LoginForm } from './LoginForm';

export const metadata: Metadata = {
  title: 'Đăng nhập / Đăng ký tài khoản',
  description: 'Truy cập tài khoản cá nhân để theo dõi đơn hàng, địa chỉ và thông báo.',
};

export default function LoginPage() {
  return (
    <main className="min-h-[calc(100vh-140px)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <Suspense fallback={<div className="w-full max-w-md h-96 rounded-xl border border-neutral-200 animate-pulse" />}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
