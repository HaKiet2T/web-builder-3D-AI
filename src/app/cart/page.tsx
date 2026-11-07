import type { Metadata } from 'next';
import { CartView } from '@/components/cart/CartView';
import { SiteFooter } from '@/components/layout/SiteFooter';

export const metadata: Metadata = {
  title: 'Giỏ hàng',
  description: 'Sản phẩm bạn đã chọn.',
};

export default function CartPage() {
  return (
    <div className="home-page">
      <main className="home-main">
        <CartView />
      </main>

      <SiteFooter />
    </div>
  );
}