import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { connection } from 'next/server';
import { getCurrentUser } from '@/lib/account/actions';
import { listUserOrders } from '@/lib/orders/dal';
import { OrdersManagerClient } from './OrdersManagerClient';

export const metadata: Metadata = {
  title: 'Đơn hàng của tôi',
  description: 'Trung tâm quản lý, tra cứu tiến trình đơn hàng và lịch sử mua sắm.',
};

export default function AccountOrdersPage() {
  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <Suspense
        fallback={
          <div className="space-y-6 animate-pulse">
            <div className="h-16 bg-neutral-100 dark:bg-neutral-900 rounded-2xl" />
            <div className="h-28 bg-neutral-100 dark:bg-neutral-900 rounded-2xl" />
            <div className="h-12 bg-neutral-100 dark:bg-neutral-900 rounded-xl" />
            <div className="space-y-4">
              <div className="h-44 bg-neutral-100 dark:bg-neutral-900 rounded-2xl" />
              <div className="h-44 bg-neutral-100 dark:bg-neutral-900 rounded-2xl" />
            </div>
          </div>
        }
      >
        <OrdersContent />
      </Suspense>
    </main>
  );
}

async function OrdersContent() {
  await connection();

  const user = await getCurrentUser();
  if (!user) {
    redirect('/account/login?redirect=/account/orders');
  }

  const orders = await listUserOrders(user.id).catch(() => []);

  return (
    <OrdersManagerClient
      userEmail={user.email ?? ''}
      initialOrders={orders}
    />
  );
}
