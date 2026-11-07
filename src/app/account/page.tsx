import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { connection } from 'next/server';
import { getCurrentUser, signOutUser } from '@/lib/account/actions';
import { listUserOrders } from '@/lib/orders/dal';
import { listUserAddresses, listUserNotifications } from '@/lib/account/dal';

export const metadata: Metadata = {
  title: 'Tài khoản của tôi',
  description: 'Trung tâm quản lý tài khoản, đơn hàng và địa chỉ giao hàng.',
};

export default function AccountPage() {
  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <Suspense
        fallback={
          <div className="space-y-6 animate-pulse">
            <div className="h-20 bg-neutral-100 dark:bg-neutral-900 rounded-xl" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="h-24 bg-neutral-100 dark:bg-neutral-900 rounded-xl" />
              <div className="h-24 bg-neutral-100 dark:bg-neutral-900 rounded-xl" />
              <div className="h-24 bg-neutral-100 dark:bg-neutral-900 rounded-xl" />
            </div>
            <div className="h-64 bg-neutral-100 dark:bg-neutral-900 rounded-xl" />
          </div>
        }
      >
        <AccountContent />
      </Suspense>
    </main>
  );
}

async function AccountContent() {
  await connection();

  const user = await getCurrentUser();
  if (!user) {
    redirect('/account/login');
  }

  const [orders, addresses, notifications] = await Promise.all([
    listUserOrders(user.id).catch(() => []),
    listUserAddresses(user.id).catch(() => []),
    listUserNotifications(user.id, 5).catch(() => []),
  ]);

  const fullName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Khách hàng';
  const unreadNotifications = notifications.filter((n) => !n.is_read).length;

  return (
    <>
      {/* Account Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-neutral-200/80 dark:border-neutral-800 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-500">
              Đã xác thực
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Xin chào, {fullName}
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 font-mono">
            {user.email}
          </p>
        </div>

        <form action={signOutUser}>
          <button
            type="submit"
            className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-neutral-600 hover:text-red-600 dark:text-neutral-400 dark:hover:text-red-400 border border-neutral-200 dark:border-neutral-800 rounded-lg hover:border-red-200 dark:hover:border-red-900/50 transition-all active:scale-[0.985]"
          >
            Đăng xuất
          </button>
        </form>
      </div>

      {/* Account Navigation Tabs */}
      <div className="flex items-center gap-2 mt-6 border-b border-neutral-200/80 dark:border-neutral-800 pb-2">
        <Link
          href="/account"
          className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-xs"
        >
          Tổng quan
        </Link>
        <Link
          href="/account/orders"
          className="px-3.5 py-1.5 text-xs font-semibold rounded-lg text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors flex items-center gap-1.5"
        >
          <span>Đơn hàng của tôi</span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 bg-neutral-100 dark:bg-neutral-800 rounded-full text-neutral-500">
            {orders.length}
          </span>
        </Link>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-8">
        <div className="p-5 bg-white dark:bg-[#111214] border border-neutral-200/80 dark:border-neutral-800 rounded-xl">
          <div className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
            Đơn hàng của bạn
          </div>
          <div className="mt-2 text-2xl font-bold text-neutral-900 dark:text-white">
            {orders.length}
          </div>
          <div className="mt-1 text-xs text-neutral-400">
            {orders.filter((o) => o.status === 'pending' || o.status === 'processing').length} đơn đang xử lý
          </div>
        </div>

        <div className="p-5 bg-white dark:bg-[#111214] border border-neutral-200/80 dark:border-neutral-800 rounded-xl">
          <div className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
            Sổ địa chỉ
          </div>
          <div className="mt-2 text-2xl font-bold text-neutral-900 dark:text-white">
            {addresses.length}
          </div>
          <div className="mt-1 text-xs text-neutral-400">
            {addresses.some((a) => a.is_default) ? '1 địa chỉ mặc định' : 'Chưa có địa chỉ mặc định'}
          </div>
        </div>

        <div className="p-5 bg-white dark:bg-[#111214] border border-neutral-200/80 dark:border-neutral-800 rounded-xl">
          <div className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
            Thông báo
          </div>
          <div className="mt-2 text-2xl font-bold text-neutral-900 dark:text-white">
            {unreadNotifications}
          </div>
          <div className="mt-1 text-xs text-neutral-400">
            Thông báo mới chưa đọc
          </div>
        </div>
      </div>

      {/* Recent Orders or Empty State */}
      <div className="bg-white dark:bg-[#111214] border border-neutral-200/80 dark:border-neutral-800 rounded-xl p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-neutral-900 dark:text-white">
            Đơn hàng gần đây
          </h2>
          {orders.length > 0 && (
            <Link
              href="/account/orders"
              className="text-xs font-semibold text-neutral-900 dark:text-white hover:underline flex items-center gap-1"
            >
              <span>Xem tất cả ({orders.length})</span>
              <span>→</span>
            </Link>
          )}
        </div>

        {orders.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-lg">
            <svg
              className="w-10 h-10 mx-auto text-neutral-400 mb-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
              />
            </svg>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Bạn chưa có đơn hàng nào được lưu.
            </p>
            <p className="text-xs text-neutral-400 mt-1">
              Các đơn hàng đặt khi đã đăng nhập sẽ tự động hiển thị tại đây.
            </p>
            <Link
              href="/"
              className="inline-block mt-4 px-4 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-semibold rounded-lg hover:opacity-90 transition-opacity"
            >
              Khám phá sản phẩm
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {orders.slice(0, 5).map((order) => (
              <div key={order.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-neutral-900 dark:text-white">
                      #{order.orderNumber}
                    </span>
                    <span className="px-2 py-0.5 text-[10px] uppercase font-semibold rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                      {order.status}
                    </span>
                  </div>
                  <div className="text-xs text-neutral-500 mt-1">
                    {order.items.length} món · {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(order.totalAmount)}
                  </div>
                </div>

                <Link
                  href={`/orders/${order.id}`}
                  className="self-start sm:self-center px-3 py-1.5 text-xs font-medium border border-neutral-200 dark:border-neutral-800 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors"
                >
                  Chi tiết đơn →
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
