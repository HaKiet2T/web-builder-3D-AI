import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Giỏ hàng',
  description: 'Sản phẩm bạn đã chọn.',
};

export default function CartPage() {
  return (
    <div className="home-page">
      <main className="home-main">
        <section className="home-hero" aria-labelledby="cart-title">
          <h1 id="cart-title">Giỏ hàng</h1>
          <p className="home-intro">Chưa có sản phẩm nào trong giỏ hàng.</p>
        </section>

        <p className="page-empty">
          Giỏ hàng dùng chung cho cả năm nhóm thiết bị và sẽ hoạt động khi có sản phẩm. Trong lúc
          chờ, bạn xem{' '}
          <Link className="page-inline-link" href="/monitor">
            bộ sưu tập màn hình ROG
          </Link>
          .
        </p>
      </main>

      <footer className="home-footer">
        <span>Forma</span>
        <span>Thiết bị góc máy</span>
      </footer>
    </div>
  );
}
