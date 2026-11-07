'use client';

import { useState } from 'react';

interface ServiceGuarantee {
  id: string;
  title: string;
  desc: string;
  icon: React.ReactNode;
}

interface FAQItem {
  id: string;
  question: string;
  answer: React.ReactNode;
}

export function BrandFeatures() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleAccordion = (index: number) => {
    setOpenIndex((prev) => (prev === index ? null : index));
  };

  const guarantees: ServiceGuarantee[] = [
    {
      id: 'shipping',
      title: 'Vận chuyển an toàn',
      desc: 'Bảo vệ tuyệt đối cho sản phẩm bạn đặt hàng',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-6 h-6" aria-hidden="true">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
          <line x1="12" y1="22.08" x2="12" y2="12" />
        </svg>
      ),
    },
    {
      id: 'installation',
      title: 'Lắp đặt chuyên nghiệp',
      desc: 'Lắp đặt đúng vị trí bạn mong muốn',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-6 h-6" aria-hidden="true">
          <path d="m15 5 4 4" />
          <path d="M13 7 8.7 11.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0L16 10" />
          <path d="m2 22 5.5-1.5L21.3 6.7a2.1 2.1 0 0 0 0-3v0a2.1 2.1 0 0 0-3 0L4.5 17.5 2 22z" />
        </svg>
      ),
    },
    {
      id: 'cleanup',
      title: 'Hoàn trả mặt bằng',
      desc: 'Thu gom bao bì, vệ sinh không gian lắp đặt trước khi rời đi',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-6 h-6" aria-hidden="true">
          <path d="M12 2v4" />
          <path d="m4.93 10.93 2.83-2.83" />
          <path d="M2 18h4" />
          <path d="M14 6h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6a2 2 0 0 1-2-2v-4" />
          <path d="M10 10l-2 2" />
        </svg>
      ),
    },
    {
      id: 'guide',
      title: 'Hướng dẫn sử dụng',
      desc: 'Đảm bảo làm chủ sản phẩm ngay lập tức',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-6 h-6" aria-hidden="true">
          <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
          <path d="m9 10 2 2 4-4" />
        </svg>
      ),
    },
  ];

  const faqs: FAQItem[] = [
    {
      id: 'faq-payment',
      question: 'Các hình thức thanh toán?',
      answer: (
        <div className="space-y-3 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
          <p className="font-medium text-neutral-900 dark:text-white">HyperWork chấp nhận thanh toán qua:</p>
          <ul className="space-y-1.5 pl-2 list-none">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 inline-block" />
              Chuyển khoản online banking
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 inline-block" />
              Thẻ tín dụng Visa, Master
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 inline-block" />
              QR Code banking
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 inline-block" />
              Thanh toán khi nhận hàng (COD)
            </li>
          </ul>
          <p className="pt-2 text-xs text-neutral-500 italic">
            Chúng tôi luôn có ưu đãi khi khách hàng chuyển khoản trước.
          </p>
        </div>
      ),
    },
    {
      id: 'faq-delivery',
      question: 'Bao lâu có thể nhận được hàng?',
      answer: (
        <div className="space-y-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
          <p>
            Thời gian giao hàng tiêu chuẩn từ 1 - 3 ngày làm việc đối với khu vực nội thành Hà Nội &amp; TP.HCM, và từ 3 - 5 ngày đối với các tỉnh thành khác.
          </p>
          <p className="text-xs text-neutral-500">
            Đối với dịch vụ hỏa tốc nội thành, đơn hàng sẽ được giao trong vòng 2 - 4 giờ sau khi xác nhận.
          </p>
        </div>
      ),
    },
    {
      id: 'faq-warranty',
      question: 'Kiểm tra, bảo hành sản phẩm',
      answer: (
        <div className="space-y-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
          <p>
            Quý khách được quyền đồng kiểm ngoại quan sản phẩm trước khi nhận hàng và thanh toán.
          </p>
          <p>
            Toàn bộ sản phẩm chính hãng đều được kích hoạt bảo hành điện tử từ 12 - 24 tháng theo số điện thoại đặt hàng hoặc mã Serial Number dán trên sản phẩm.
          </p>
        </div>
      ),
    },
    {
      id: 'faq-returns',
      question: 'Quy trình đổi trả sản phẩm',
      answer: (
        <div className="space-y-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
          <p>
            Chính sách 1 đổi 1 trong vòng 30 ngày đầu tiên nếu sản phẩm phát sinh lỗi kỹ thuật từ nhà sản xuất.
          </p>
          <p className="text-xs text-neutral-500">
            Sản phẩm đổi trả cần giữ nguyên tem niêm phong, bao bì hộp, phiếu bảo hành và đầy đủ phụ kiện kèm theo.
          </p>
        </div>
      ),
    },
    {
      id: 'faq-bulk',
      question: 'Mua sản phẩm số lượng lớn',
      answer: (
        <div className="space-y-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
          <p>
            Chúng tôi hỗ trợ mức chiết khấu thương mại đặc biệt và chính sách thanh toán linh hoạt cho khách hàng doanh nghiệp, văn phòng hoặc dự án B2B.
          </p>
          <p>
            Vui lòng liên hệ bộ phận kinh doanh dự án để nhận catalog và báo giá chi tiết trong vòng 24 giờ.
          </p>
        </div>
      ),
    },
    {
      id: 'faq-more',
      question: 'Còn bất kỳ câu hỏi nào khác?',
      answer: (
        <div className="space-y-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
          <p>
            Đội ngũ chuyên viên tư vấn kỹ thuật và setup công thái học luôn sẵn sàng đồng hành cùng bạn.
          </p>
          <p>
            Vui lòng liên hệ hotline 1900 636 660 hoặc gửi tin nhắn qua fanpage/Zalo để được hỗ trợ tức thì.
          </p>
        </div>
      ),
    },
  ];

  return (
    <section className="home-faq-support-section w-full pt-8 sm:pt-12 pb-2 border-t border-[var(--line)]" aria-labelledby="faq-section-title">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* Cột trái: Tiêu đề + Giới thiệu + 4 Thẻ cam kết dịch vụ */}
        <div className="lg:col-span-5 flex flex-col">
          <h2 id="faq-section-title" className="text-3xl sm:text-4xl font-bold tracking-tight text-neutral-900 dark:text-white mb-3">
            Có câu hỏi?
          </h2>
          <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-400 leading-relaxed mb-3">
            Các câu hỏi thường gặp sẽ giúp bạn giải đáp nhanh những thắc mắc phổ biến về sản phẩm/dịch vụ của chúng tôi.
          </p>
          <span className="inline-block text-xs font-medium text-neutral-500 dark:text-neutral-500 mb-8">
            Thời gian trả lời trung bình: 1 giờ
          </span>

          {/* Lưới 4 cam kết dịch vụ (2x2) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {guarantees.map((item) => (
              <div
                key={item.id}
                className="relative flex flex-col justify-between p-4 sm:p-5 rounded-xl bg-neutral-100/40 dark:bg-neutral-900/40 border border-neutral-200/50 dark:border-neutral-800/60 transition-all duration-200 hover:border-neutral-300/70 dark:hover:border-neutral-700 min-h-[140px]"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="text-neutral-800 dark:text-neutral-200">
                    {item.icon}
                  </div>
                  <span className="text-neutral-400 dark:text-neutral-500 text-sm font-light select-none">
                    +
                  </span>
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-neutral-900 dark:text-white mb-1">
                    {item.title}
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-snug">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Cột phải: Accordion FAQ 6 câu hỏi */}
        <div className="lg:col-span-7">
          <div className="rounded-2xl bg-neutral-50/50 dark:bg-neutral-900/30 border border-neutral-200/50 dark:border-neutral-800/50 p-4 sm:p-6 sm:px-8 divide-y divide-neutral-200/40 dark:divide-neutral-800/50">
            {faqs.map((faq, index) => {
              const isOpen = openIndex === index;
              return (
                <div key={faq.id} className="py-4 first:pt-1 last:pb-1">
                  <button
                    type="button"
                    onClick={() => toggleAccordion(index)}
                    className="w-full flex items-center justify-between gap-4 text-left font-medium text-sm sm:text-base text-neutral-900 dark:text-white focus:outline-none py-1 group"
                    aria-expanded={isOpen}
                    aria-controls={`${faq.id}-content`}
                  >
                    <span className="group-hover:text-neutral-700 dark:group-hover:text-neutral-200 transition-colors">
                      {faq.question}
                    </span>
                    <span
                      className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-transform duration-200 ${
                        isOpen
                          ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 rotate-180'
                          : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800/60 dark:text-neutral-400'
                      }`}
                      aria-hidden="true"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </span>
                  </button>

                  {isOpen && (
                    <div id={`${faq.id}-content`} className="pt-3 pb-1 transition-all duration-200">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
