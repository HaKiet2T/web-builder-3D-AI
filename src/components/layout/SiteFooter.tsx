import { SITE } from '@/lib/site';

export function SiteFooter() {
  const marketingLinks = [
    'Kết nối nhà sáng tạo',
    'Báo chí và truyền thông',
    'Sự kiện và chiến dịch',
  ];

  const businessLinks = [
    'Dự án tiêu biểu',
    'Gói giải pháp văn phòng',
    'Hợp tác B2B',
    'Sản phẩm "Open box"',
  ];

  const supportLinks = [
    'Liên hệ',
    'Điều khoản sử dụng',
    'Chính sách bảo mật',
    'Chính sách giao hàng',
    'Chính sách đổi trả',
    'Chính sách bảo hành',
  ];

  const discoverLinks = [
    'Về chúng tôi',
    'Tuyển dụng',
  ];

  return (
    <footer className="w-full bg-[#111214] text-neutral-300 border-t border-neutral-800/80 pt-16 pb-12 transition-colors">
      <div className="max-w-[1240px] mx-auto px-6 sm:px-8 lg:px-12">
        {/* Phần 1: Lưới 5 cột - Bản tin & Các nhóm chuyên mục */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8 pb-12">
          {/* Cột 1: Đăng ký nhận bản tin + Mạng xã hội */}
          <div className="lg:col-span-4 flex flex-col justify-between pr-0 lg:pr-6">
            <div>
              <h3 className="text-xl font-bold text-white mb-2 tracking-tight">
                Đăng ký nhận bản tin
              </h3>
              <p className="text-xs text-neutral-400 leading-relaxed mb-5 max-w-sm">
                Cập nhật tin tức, xu hướng thiết kế không gian làm việc và sản phẩm mới nhất từ {SITE.name}.
              </p>

              {/* Form nhập email tượng trưng */}
              <div className="relative flex items-center max-w-sm mb-6">
                <input
                  type="email"
                  placeholder="E-mail"
                  readOnly
                  aria-label="Địa chỉ email nhận bản tin"
                  className="w-full bg-[#1c1d22] border border-neutral-700/80 rounded-lg px-4 py-2.5 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none cursor-default"
                />
                <button
                  type="button"
                  aria-label="Gửi đăng ký bản tin"
                  className="absolute right-2 w-7 h-7 rounded-full bg-neutral-700/80 hover:bg-neutral-600 text-neutral-200 flex items-center justify-center transition-colors text-xs"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Hàng biểu tượng mạng xã hội */}
            <div className="flex items-center gap-4 text-neutral-400">
              {/* Facebook */}
              <span className="hover:text-white transition-colors cursor-pointer" aria-label="Facebook" role="img">
                <svg className="w-4 h-4 fill-currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </span>

              {/* Instagram */}
              <span className="hover:text-white transition-colors cursor-pointer" aria-label="Instagram" role="img">
                <svg className="w-4 h-4 fill-none stroke-currentColor strokeWidth-2" viewBox="0 0 24 24">
                  <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
                </svg>
              </span>

              {/* Threads */}
              <span className="hover:text-white transition-colors cursor-pointer" aria-label="Threads" role="img">
                <svg className="w-4 h-4 fill-currentColor" viewBox="0 0 24 24">
                  <path d="M12.002 0C5.375 0 0 5.375 0 12c0 6.627 5.375 12 12.002 12 6.625 0 11.998-5.373 11.998-12 0-6.625-5.373-12-11.998-12zm4.316 13.99c-.198 2.062-1.748 3.51-3.956 3.51-2.457 0-4.227-1.848-4.227-4.402 0-2.613 1.845-4.446 4.385-4.446 2.373 0 3.882 1.542 4.07 3.593h-1.64c-.168-1.19-.997-1.992-2.43-1.992-1.578 0-2.678 1.173-2.678 2.845 0 1.638 1.056 2.802 2.584 2.802 1.487 0 2.29-.817 2.456-1.91h1.436z" />
                </svg>
              </span>

              {/* YouTube */}
              <span className="hover:text-white transition-colors cursor-pointer" aria-label="YouTube" role="img">
                <svg className="w-4 h-4 fill-currentColor" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
              </span>

              {/* TikTok */}
              <span className="hover:text-white transition-colors cursor-pointer" aria-label="TikTok" role="img">
                <svg className="w-4 h-4 fill-currentColor" viewBox="0 0 24 24">
                  <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
                </svg>
              </span>
            </div>
          </div>

          {/* Cột 2: Hợp tác Marketing */}
          <div className="lg:col-span-2 flex flex-col">
            <h4 className="font-bold text-white text-xs sm:text-sm mb-4 tracking-tight">
              Hợp tác Marketing
            </h4>
            <ul className="space-y-2.5 text-xs text-neutral-400">
              {marketingLinks.map((item) => (
                <li key={item}>
                  <span className="hover:text-neutral-200 transition-colors cursor-default select-none">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Cột 3: Hợp tác Kinh Doanh */}
          <div className="lg:col-span-2 flex flex-col">
            <h4 className="font-bold text-white text-xs sm:text-sm mb-4 tracking-tight">
              Hợp tác Kinh Doanh
            </h4>
            <ul className="space-y-2.5 text-xs text-neutral-400">
              {businessLinks.map((item) => (
                <li key={item}>
                  <span className="hover:text-neutral-200 transition-colors cursor-default select-none">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Cột 4: Hỗ trợ */}
          <div className="lg:col-span-2 flex flex-col">
            <h4 className="font-bold text-white text-xs sm:text-sm mb-4 tracking-tight">
              Hỗ trợ
            </h4>
            <ul className="space-y-2.5 text-xs text-neutral-400">
              {supportLinks.map((item) => (
                <li key={item}>
                  <span className="hover:text-neutral-200 transition-colors cursor-default select-none">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Cột 5: Khám phá */}
          <div className="lg:col-span-2 flex flex-col">
            <h4 className="font-bold text-white text-xs sm:text-sm mb-4 tracking-tight">
              Khám phá
            </h4>
            <ul className="space-y-2.5 text-xs text-neutral-400">
              {discoverLinks.map((item) => (
                <li key={item}>
                  <span className="hover:text-neutral-200 transition-colors cursor-default select-none">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Đường gạch phân cách mảnh chuẩn Tactile */}
        <div className="w-full border-t border-neutral-800/80 pt-10" />

        {/* Phần 2: Thông tin doanh nghiệp (Tượng trưng) & Tổng đài / Chứng nhận */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end">
          {/* Khối trái: Thông tin đăng ký pháp lý doanh nghiệp (Tượng trưng) */}
          <div className="lg:col-span-7 flex flex-col space-y-2">
            <h4 className="font-bold text-white text-xs sm:text-sm tracking-tight mb-1">
              CÔNG TY CỔ PHẦN DỊCH VỤ VÀ THƯƠNG MẠI 3H VIỆT NAM (TƯỢNG TRƯNG)
            </h4>
            <ul className="space-y-1.5 text-[11px] text-neutral-400 list-none pl-0">
              <li className="flex items-start gap-1.5">
                <span className="text-neutral-500">•</span>
                <span>Giấy chứng nhận đăng ký kinh doanh: 0109193046 (Số tượng trưng)</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-neutral-500">•</span>
                <span>Cấp tại: Sở Kế hoạch và Đầu tư Thành phố Hà Nội</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-neutral-500">•</span>
                <span>Ngày cấp: 21/05/2020</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-neutral-500">•</span>
                <span>Địa chỉ ĐKKD: Số 64 ngõ 26 Hoàng Quốc Việt, P. Nghĩa Đô, TP. Hà Nội</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-neutral-500">•</span>
                <span>Trụ sở Hà Nội: Số 48, Đường 23, KĐT Thành phố Giao Lưu, P. Đông Ngạc, Hà Nội</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-neutral-500">•</span>
                <span>Chi nhánh TP.HCM: 217/14D Nơ Trang Long, P. 12, Quận Bình Thạnh, TP. Hồ Chí Minh</span>
              </li>
            </ul>
          </div>

          {/* Khối phải: Hotline, Email & Huy hiệu thanh toán/Bộ Công Thương */}
          <div className="lg:col-span-5 flex flex-col lg:items-end">
            <span className="text-[11px] text-neutral-400 mb-1">
              Email &amp; tổng đài chăm sóc khách hàng
            </span>
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-0.5">
              1900 636 660
            </div>
            <div className="text-lg sm:text-xl font-bold text-white mb-5 tracking-tight">
              3h@3hvn.com
            </div>

            {/* Hàng biểu trưng thanh toán & chứng nhận Bộ Công Thương */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Mastercard badge */}
              <div
                className="h-7 px-2.5 rounded bg-white flex items-center justify-center gap-1 shadow-sm"
                title="Mastercard"
                aria-label="Mastercard"
              >
                <div className="w-3.5 h-3.5 rounded-full bg-[#EB001B] opacity-90" />
                <div className="w-3.5 h-3.5 rounded-full bg-[#F79E1B] -ml-2 opacity-90" />
              </div>

              {/* Visa badge */}
              <div
                className="h-7 px-2.5 rounded bg-white flex items-center justify-center shadow-sm"
                title="Visa"
                aria-label="Visa"
              >
                <span className="text-[#1A1F71] font-black italic tracking-tighter text-xs">
                  VISA
                </span>
              </div>

              {/* COD badge */}
              <div
                className="h-7 px-2.5 rounded bg-white flex items-center justify-center shadow-sm"
                title="Thanh toán khi nhận hàng COD"
                aria-label="COD"
              >
                <span className="text-neutral-900 font-bold text-[10px] tracking-tight">
                  COD
                </span>
              </div>

              {/* Huy hiệu Đã thông báo Bộ Công Thương */}
              <div
                className="h-7 px-2.5 rounded bg-[#005ba6] border border-[#006cc7] flex items-center gap-1.5 shadow-sm text-white select-none"
                title="Đã thông báo Bộ Công Thương"
                aria-label="Đã thông báo Bộ Công Thương"
              >
                <div className="w-3.5 h-3.5 rounded-full bg-red-600 flex items-center justify-center text-[8px] font-black text-yellow-300">
                  ★
                </div>
                <div className="flex flex-col leading-none">
                  <span className="text-[7px] font-semibold tracking-tighter opacity-90">
                    ĐÃ THÔNG BÁO
                  </span>
                  <span className="text-[8px] font-bold tracking-tighter text-white">
                    BỘ CÔNG THƯƠNG
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
