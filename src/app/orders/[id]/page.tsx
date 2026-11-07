import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { connection } from 'next/server';
import { getOrderByIdOrNumber } from '@/lib/orders/dal';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { OrderTrackingClient } from './OrderTrackingClient';

export const metadata: Metadata = {
  title: 'Theo dõi đơn hàng',
  description: 'Theo dõi trạng thái thanh toán và vận chuyển đơn hàng thời gian thực.',
};

interface OrderPageProps {
  params: Promise<{ id: string }>;
}

export default function OrderDetailPage({ params }: OrderPageProps) {
  return (
    <div className="home-page">
      <main className="home-main">
        <Suspense
          fallback={
            <div style={{ maxWidth: '840px', margin: '4rem auto', textAlign: 'center', padding: '2rem 1rem' }}>
              <p aria-busy="true">Đang tải thông tin đơn hàng…</p>
            </div>
          }
        >
          <OrderContent params={params} />
        </Suspense>
      </main>
      <SiteFooter />
    </div>
  );
}

async function OrderContent({ params }: OrderPageProps) {
  await connection();
  const { id } = await params;
  const order = await getOrderByIdOrNumber(id);

  if (!order) {
    return (
      <div style={{ maxWidth: '640px', margin: '4rem auto', textAlign: 'center', padding: '0 1rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Không tìm thấy đơn hàng</h1>
        <p style={{ color: '#4b5563', margin: '1rem 0 2rem 0' }}>
          Mã đơn hàng <code>{id}</code> không tồn tại hoặc đã bị xóa khỏi hệ thống.
        </p>
        <Link
          href="/"
          style={{
            display: 'inline-block',
            padding: '0.75rem 1.5rem',
            backgroundColor: '#111827',
            color: '#ffffff',
            borderRadius: '6px',
            textDecoration: 'none',
            fontWeight: 600,
          }}
        >
          Quay lại trang chủ
        </Link>
      </div>
    );
  }

  return <OrderTrackingClient initialOrder={order} />;
}
