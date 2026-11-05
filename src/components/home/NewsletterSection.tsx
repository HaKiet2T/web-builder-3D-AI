'use client';

import { useState } from 'react';

export function NewsletterSection() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) return;
    setSubmitted(true);
  };

  return (
    <section className="newsletter-section" aria-labelledby="newsletter-title">
      <div className="newsletter-card">
        <div className="newsletter-text">
          <span className="newsletter-badge">BẢN TIN &amp; CẢM HỨNG SETUP</span>
          <h2 id="newsletter-title" className="newsletter-title">
            Nâng Tầm Góc Máy Cùng HGK
          </h2>
          <p className="newsletter-desc">
            Nhận ngay cẩm nang phối ghép góc làm việc công thái học và mã ưu đãi độc quyền 10% cho đơn hàng đầu tiên.
          </p>
        </div>

        {submitted ? (
          <div className="newsletter-success" role="status">
            <span className="newsletter-success-icon" aria-hidden="true">✓</span>
            <div>
              <strong>Đăng ký thành công!</strong>
              <p>Mã ưu đãi đã được gửi tới hòm thư của bạn.</p>
            </div>
          </div>
        ) : (
          <form className="newsletter-form" onSubmit={handleSubmit}>
            <input
              type="email"
              placeholder="Nhập địa chỉ email của bạn..."
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="newsletter-input"
              required
              aria-label="Địa chỉ email nhận tin"
            />
            <button type="submit" className="newsletter-btn">
              Đăng ký ngay
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
