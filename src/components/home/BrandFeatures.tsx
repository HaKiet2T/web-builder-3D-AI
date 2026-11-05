export function BrandFeatures() {
  const features = [
    {
      id: 'warranty',
      title: 'Bảo hành chính hãng 12 - 24 tháng',
      desc: 'Cam kết 1 đổi 1 trong 30 ngày nếu phát sinh lỗi từ nhà sản xuất.',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="feature-icon" aria-hidden="true">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="m9 12 2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      id: 'shipping',
      title: 'Giao hàng hỏa tốc toàn quốc',
      desc: 'Miễn phí vận chuyển cho đơn hàng từ 1.000.000₫, đóng gói chuẩn an toàn.',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="feature-icon" aria-hidden="true">
          <rect x="1" y="3" width="15" height="13" />
          <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
          <circle cx="5.5" cy="18.5" r="2.5" />
          <circle cx="18.5" cy="18.5" r="2.5" />
        </svg>
      ),
    },
    {
      id: 'consulting',
      title: 'Tư vấn setup 1-1',
      desc: 'Đội ngũ kỹ thuật hỗ trợ đo đạc và thiết kế góc làm việc tối ưu công thái học.',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="feature-icon" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" strokeWidth="2" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      id: 'support',
      title: 'Hỗ trợ kỹ thuật 24/7',
      desc: 'Luôn sẵn sàng hỗ trợ cài đặt driver, căn chỉnh màn hình và bảo dưỡng trọn đời.',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="feature-icon" aria-hidden="true">
          <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
          <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
        </svg>
      ),
    },
  ];

  return (
    <section className="brand-features-section" aria-label="Cam kết thương hiệu và dịch vụ">
      <div className="features-grid">
        {features.map((item) => (
          <div key={item.id} className="feature-card">
            <div className="feature-icon-wrapper">{item.icon}</div>
            <div className="feature-content">
              <h3 className="feature-title">{item.title}</h3>
              <p className="feature-desc">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
