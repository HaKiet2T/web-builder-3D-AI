import Link from 'next/link';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { signOutAdmin } from '@/app/admin/login/actions';
import { getCurrentAdmin } from '@/lib/admin/auth';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<main className="admin-main" aria-busy="true"><p role="status">Đang tải quản trị...</p></main>}>
      <AdminSessionLayout>{children}</AdminSessionLayout>
    </Suspense>
  );
}

async function AdminSessionLayout({ children }: { children: React.ReactNode }) {
  await connection();
  const admin = await getCurrentAdmin();
  if (!admin) redirect('/admin/login');

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Link className="admin-brand" href="/admin">HGK Admin</Link>
        <nav aria-label="Quản trị">
          <Link href="/admin">Tổng quan</Link>
          <Link href="/admin/products">Sản phẩm & media</Link>
          <Link href="/admin/orders">Đơn hàng</Link>
        </nav>
        <div className="admin-account">
          <span>{admin.user.email}</span>
          <form action={signOutAdmin}>
            <button type="submit">Đăng xuất</button>
          </form>
        </div>
      </aside>
      <main className="admin-main">{children}</main>
    </div>
  );
}
