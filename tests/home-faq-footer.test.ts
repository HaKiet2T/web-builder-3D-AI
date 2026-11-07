import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const brandFeaturesContent = readFileSync('src/components/home/BrandFeatures.tsx', 'utf8');
const siteFooterContent = readFileSync('src/components/layout/SiteFooter.tsx', 'utf8');
const newsletterSectionContent = readFileSync('src/components/home/NewsletterSection.tsx', 'utf8');

describe('Home Page FAQ Support Section & HyperWork Flagship Footer', () => {
  it('BrandFeatures provides the "Có câu hỏi?" support section and response time', () => {
    assert.match(brandFeaturesContent, /Có câu hỏi\?/);
    assert.match(brandFeaturesContent, /Thời gian trả lời trung bình: 1 giờ/);
    assert.match(brandFeaturesContent, /home-faq-support-section/);
  });

  it('BrandFeatures renders all 4 service guarantee cards with icons and detail', () => {
    assert.match(brandFeaturesContent, /Vận chuyển an toàn/);
    assert.match(brandFeaturesContent, /Bảo vệ tuyệt đối cho sản phẩm bạn đặt hàng/);
    assert.match(brandFeaturesContent, /Lắp đặt chuyên nghiệp/);
    assert.match(brandFeaturesContent, /Lắp đặt đúng vị trí bạn mong muốn/);
    assert.match(brandFeaturesContent, /Hoàn trả mặt bằng/);
    assert.match(brandFeaturesContent, /Thu gom bao bì, vệ sinh không gian lắp đặt trước khi rời đi/);
    assert.match(brandFeaturesContent, /Hướng dẫn sử dụng/);
    assert.match(brandFeaturesContent, /Đảm bảo làm chủ sản phẩm ngay lập tức/);
  });

  it('BrandFeatures integrates the interactive 6-question FAQ Accordion', () => {
    assert.match(brandFeaturesContent, /Các hình thức thanh toán\?/);
    assert.match(brandFeaturesContent, /Chuyển khoản online banking/);
    assert.match(brandFeaturesContent, /Thẻ tín dụng Visa, Master/);
    assert.match(brandFeaturesContent, /QR Code banking/);
    assert.match(brandFeaturesContent, /Thanh toán khi nhận hàng \(COD\)/);
    assert.match(brandFeaturesContent, /Bao lâu có thể nhận được hàng\?/);
    assert.match(brandFeaturesContent, /Kiểm tra, bảo hành sản phẩm/);
    assert.match(brandFeaturesContent, /Quy trình đổi trả sản phẩm/);
    assert.match(brandFeaturesContent, /Mua sản phẩm số lượng lớn/);
    assert.match(brandFeaturesContent, /Còn bất kỳ câu hỏi nào khác\?/);
    assert.match(brandFeaturesContent, /aria-expanded=\{isOpen\}/);
  });

  it('SiteFooter delivers the 5-column top layout including Newsletter and Social media', () => {
    assert.match(siteFooterContent, /Đăng ký nhận bản tin/);
    assert.match(siteFooterContent, /placeholder="E-mail"/);
    assert.match(siteFooterContent, /Hợp tác Marketing/);
    assert.match(siteFooterContent, /Kết nối nhà sáng tạo/);
    assert.match(siteFooterContent, /Hợp tác Kinh Doanh/);
    assert.match(siteFooterContent, /Gói giải pháp văn phòng/);
    assert.match(siteFooterContent, /Hỗ trợ/);
    assert.match(siteFooterContent, /Chính sách bảo hành/);
    assert.match(siteFooterContent, /Khám phá/);
    assert.match(siteFooterContent, /Tuyển dụng/);

    // Social icons
    assert.match(siteFooterContent, /aria-label="Facebook"/);
    assert.match(siteFooterContent, /aria-label="Instagram"/);
    assert.match(siteFooterContent, /aria-label="Threads"/);
    assert.match(siteFooterContent, /aria-label="YouTube"/);
    assert.match(siteFooterContent, /aria-label="TikTok"/);
  });

  it('SiteFooter provides symbolic company registration, hotline and trust badges', () => {
    assert.match(siteFooterContent, /Giấy chứng nhận đăng ký kinh doanh/);
    assert.match(siteFooterContent, /Sở Kế hoạch và Đầu tư Thành phố Hà Nội/);
    assert.match(siteFooterContent, /1900 636 660/);
    assert.match(siteFooterContent, /3h@3hvn\.com/);

    // Badges
    assert.match(siteFooterContent, /aria-label="Mastercard"/);
    assert.match(siteFooterContent, /aria-label="Visa"/);
    assert.match(siteFooterContent, /aria-label="COD"/);
    assert.match(siteFooterContent, /aria-label="Đã thông báo Bộ Công Thương"/);
  });

  it('NewsletterSection gracefully yields to SiteFooter integrated newsletter form', () => {
    assert.match(newsletterSectionContent, /SiteFooter/);
  });
});
