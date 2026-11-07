import type { Metadata } from 'next';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { listAdminOrders } from '@/lib/orders/dal';
import { AdminOrdersRealtime } from './AdminOrdersRealtime';

export const metadata: Metadata = { title: 'Đơn hàng' };

interface OrdersPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default function AdminOrdersPage({ searchParams }: OrdersPageProps) {
  return (
    <Suspense
      fallback={
        <p className="admin-notice" role="status" aria-busy="true">
          Đang tải danh sách đơn hàng…
        </p>
      }
    >
      <AdminOrdersContent searchParams={searchParams} />
    </Suspense>
  );
}

async function AdminOrdersContent({ searchParams }: OrdersPageProps) {
  await connection();
  const [orders, query] = await Promise.all([listAdminOrders(), searchParams]);

  return (
    <div>
      {query.updated ? (
        <p className="admin-success" role="status" style={{ margin: '1rem' }}>
          Đã cập nhật trạng thái đơn.
        </p>
      ) : null}
      <AdminOrdersRealtime initialOrders={orders} />
    </div>
  );
}
