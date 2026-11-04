import type { Metadata } from 'next';
import { CheckoutForm } from '@/components/cart/CheckoutForm';
import { SiteFooter } from '@/components/layout/SiteFooter';

export const metadata: Metadata = {
  title: 'Thanh toán',
  description: 'Nhập thông tin giao hàng và hoàn tất đơn hàng.',
};

export default function CheckoutPage() {
  return (
    <div className="home-page">
      <main className="home-main">
        <CheckoutForm />
      </main>

      <SiteFooter />
    </div>
  );
}