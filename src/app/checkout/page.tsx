import type { Metadata } from 'next';
import { CheckoutForm } from '@/components/cart/CheckoutForm';
import { SiteFooter } from '@/components/layout/SiteFooter';

export const metadata: Metadata = {
  title: 'Thanh toán & Đặt hàng',
  description: 'Nhập thông tin giao hàng, chọn phương thức thanh toán và hoàn tất đơn hàng nhanh chóng, an toàn.',
};

export default function CheckoutPage() {
  return (
    <div className="min-h-screen bg-neutral-50/60 dark:bg-[#0c0d0e] text-neutral-900 dark:text-neutral-100 flex flex-col justify-between transition-colors">
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        <CheckoutForm />
      </main>

      <SiteFooter />
    </div>
  );
}
