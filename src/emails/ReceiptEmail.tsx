import * as React from 'react';
import {
  Body,
  Button,
  Container,
  Column,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Row,
  Section,
  Text,
} from '@react-email/components';

export interface ReceiptItem {
  id?: string;
  name: string;
  variant: string;
  price: number;
  quantity: number;
  stockStatus: 'in-stock' | 'preorder';
}

export interface ReceiptFulfillment {
  type: 'in-stock' | 'preorder';
  title: string;
  estimatedDelivery: string;
  shippingFee: number;
  items: ReceiptItem[];
}

export interface ReceiptEmailProps {
  orderNumber?: string;
  orderDate?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  shippingAddress?: string;
  city?: string;
  paymentMethod?: string;
  transactionId?: string;
  items?: ReceiptItem[];
  subtotal?: number;
  shippingTotal?: number;
  discountTotal?: number;
  totalAmount?: number;
  isSplitShipment?: boolean;
  fulfillments?: ReceiptFulfillment[];
  portalUrl?: string;
}

const formatVND = (num: number) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(num);

export function ReceiptEmail({
  orderNumber = 'ORD-20261102-8821',
  orderDate = '02/11/2026 19:48 (GMT+7)',
  customerName = 'Hà Gia Kiệt',
  customerEmail = 'kietjob24h@gmail.com',
  customerPhone = '0987 654 321',
  shippingAddress = 'Tòa nhà Landmark 81, 720A Điện Biên Phủ, Phường 22, Bình Thạnh',
  city = 'TP. Hồ Chí Minh',
  paymentMethod = 'Thẻ tín dụng / Ghi nợ Quốc tế (Stripe)',
  transactionId = 'txn_live_7ca11dd652d5_f9020677',
  items = [
    {
      id: 'item-1',
      name: 'Loa Không dây Studio One Coaxial',
      variant: 'Than chì (Graphite)',
      price: 3_490_000,
      quantity: 1,
      stockStatus: 'in-stock',
    },
    {
      id: 'item-2',
      name: 'Chân đế Nhôm Phay CNC Studio Stand',
      variant: 'Matte Black',
      price: 690_000,
      quantity: 1,
      stockStatus: 'preorder',
    },
  ],
  subtotal = 4_180_000,
  shippingTotal = 70_000,
  discountTotal = 0,
  totalAmount = 4_250_000,
  isSplitShipment = true,
  fulfillments = [
    {
      type: 'in-stock',
      title: 'Kiện 1: Giao ngay (Hàng có sẵn)',
      estimatedDelivery: '2 - 4 ngày làm việc (04/11 - 06/11/2026)',
      shippingFee: 35_000,
      items: [
        {
          id: 'item-1',
          name: 'Loa Không dây Studio One Coaxial',
          variant: 'Than chì (Graphite)',
          price: 3_490_000,
          quantity: 1,
          stockStatus: 'in-stock',
        },
      ],
    },
    {
      type: 'preorder',
      title: 'Kiện 2: Đặt trước (Lô xuất xưởng)',
      estimatedDelivery: '14 - 21 ngày làm việc (16/11 - 23/11/2026)',
      shippingFee: 35_000,
      items: [
        {
          id: 'item-2',
          name: 'Chân đế Nhôm Phay CNC Studio Stand',
          variant: 'Matte Black',
          price: 690_000,
          quantity: 1,
          stockStatus: 'preorder',
        },
      ],
    },
  ],
  portalUrl = 'https://forma-audio.vn/orders/ORD-20261102-8821',
}: ReceiptEmailProps) {
  const previewText = `Biên lai điện tử & Xác nhận đơn hàng #${orderNumber} (${formatVND(totalAmount)})`;

  return (
    <Html lang="vi">
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={mainStyle}>
        <Container style={containerStyle}>
          {/* Header Brand */}
          <Section style={headerSection}>
            <Row>
              <Column>
                <Text style={brandLogoText}>FORMA / AUDIO</Text>
                <Text style={brandSubtitle}>KỸ NGHỆ ÂM HỌC CAO CẤP</Text>
              </Column>
              <Column align="right">
                <span style={paidBadgeStyle}>ĐÃ THANH TOÁN • PAID</span>
              </Column>
            </Row>
          </Section>

          <Hr style={dividerStyle} />

          {/* Receipt Title & Greeting */}
          <Section style={introSection}>
            <Heading style={headingTitle}>Biên lai Điện tử Đơn hàng</Heading>
            <Text style={paragraphMuted}>
              Kính gửi <strong style={{ color: '#ffffff' }}>{customerName}</strong>, cảm ơn bạn đã lựa chọn Studio One. Giao dịch thanh toán điện tử của bạn đã được đối soát thành công qua cổng thanh toán bảo mật.
            </Text>
          </Section>

          {/* Order Details Metadata Card */}
          <Section style={metaCardStyle}>
            <Row style={{ marginBottom: '8px' }}>
              <Column style={metaLabelCol}>Mã đơn hàng:</Column>
              <Column style={metaValueCol}>
                <span style={codeBadgeStyle}>{orderNumber}</span>
              </Column>
            </Row>
            <Row style={{ marginBottom: '8px' }}>
              <Column style={metaLabelCol}>Thời gian lập:</Column>
              <Column style={metaValueCol}>{orderDate}</Column>
            </Row>
            <Row style={{ marginBottom: '8px' }}>
              <Column style={metaLabelCol}>Phương thức:</Column>
              <Column style={metaValueCol}>{paymentMethod}</Column>
            </Row>
            <Row>
              <Column style={metaLabelCol}>Mã giao dịch:</Column>
              <Column style={metaValueCol}>{transactionId}</Column>
            </Row>
          </Section>

          {/* Customer & Shipping Address */}
          <Section style={addressCardStyle}>
            <Text style={sectionSubheader}>THÔNG TIN GIAO NHẬN HÀNG</Text>
            <Text style={addressLine}>
              <strong style={{ color: '#ffffff' }}>{customerName}</strong> ({customerEmail}) • {customerPhone}
            </Text>
            <Text style={addressLine}>{shippingAddress}</Text>
            <Text style={addressLine}>{city}, Việt Nam</Text>
          </Section>

          {/* Split Shipment Notice & Fulfillment Breakdown */}
          {isSplitShipment && fulfillments && fulfillments.length > 0 ? (
            <Section style={splitNoticeSection}>
              <Text style={splitNoticeHeader}>
                ⚡ ĐƠN HÀNG ÁP DỤNG CƠ CHẾ TÁCH ĐƠN (SPLIT SHIPMENT)
              </Text>
              <Text style={splitNoticeBody}>
                Đơn hàng của bạn bao gồm sản phẩm có sẵn tại kho và sản phẩm chế tác theo đợt đặt trước. Hệ thống đã tự động phân tách thành <strong>{fulfillments.length} kiện hàng riêng biệt</strong> để sản phẩm có sẵn được giao ngay tới bạn mà không cần chờ đợi.
              </Text>

              {fulfillments.map((ful, idx) => (
                <div key={idx} style={fulfillmentCardStyle}>
                  <Row style={{ marginBottom: '6px' }}>
                    <Column>
                      <span
                        style={
                          ful.type === 'in-stock' ? inStockPillStyle : preorderPillStyle
                        }
                      >
                        {ful.title}
                      </span>
                    </Column>
                    <Column align="right">
                      <span style={feeTextStyle}>
                        Phí vận chuyển: {formatVND(ful.shippingFee)}
                      </span>
                    </Column>
                  </Row>
                  <Text style={estimatedDeliveryText}>
                    📅 Dự kiến giao hàng: <strong>{ful.estimatedDelivery}</strong>
                  </Text>

                  {/* Items in this fulfillment */}
                  <div style={{ marginTop: '10px' }}>
                    {ful.items.map((item, itemIdx) => (
                      <Row key={itemIdx} style={itemRowStyle}>
                        <Column style={{ width: '70%' }}>
                          <Text style={itemNameText}>{item.name}</Text>
                          <Text style={itemSubtext}>Phiên bản: {item.variant}</Text>
                        </Column>
                        <Column align="right" style={{ width: '30%' }}>
                          <Text style={itemQuantityPrice}>
                            {item.quantity} × {formatVND(item.price)}
                          </Text>
                          <Text style={itemTotalPrice}>
                            {formatVND(item.quantity * item.price)}
                          </Text>
                        </Column>
                      </Row>
                    ))}
                  </div>
                </div>
              ))}
            </Section>
          ) : (
            /* Single Fulfillment Item List */
            <Section style={{ marginTop: '24px' }}>
              <Text style={sectionSubheader}>DANH MỤC SẢN PHẨM</Text>
              {items.map((item, idx) => (
                <Row key={idx} style={itemRowStyle}>
                  <Column style={{ width: '70%' }}>
                    <Text style={itemNameText}>{item.name}</Text>
                    <Text style={itemSubtext}>Phiên bản: {item.variant}</Text>
                  </Column>
                  <Column align="right" style={{ width: '30%' }}>
                    <Text style={itemQuantityPrice}>
                      {item.quantity} × {formatVND(item.price)}
                    </Text>
                    <Text style={itemTotalPrice}>
                      {formatVND(item.quantity * item.price)}
                    </Text>
                  </Column>
                </Row>
              ))}
            </Section>
          )}

          <Hr style={dividerStyle} />

          {/* Financial Breakdown Table */}
          <Section style={pricingBreakdownSection}>
            <Row style={pricingRow}>
              <Column style={pricingLabelCol}>Tạm tính (Tiền hàng):</Column>
              <Column align="right" style={pricingValueCol}>
                {formatVND(subtotal)}
              </Column>
            </Row>

            <Row style={pricingRow}>
              <Column style={pricingLabelCol}>
                Phí vận chuyển {isSplitShipment ? '(Kép 2 kiện)' : '(Tiêu chuẩn)'}:
              </Column>
              <Column align="right" style={pricingValueCol}>
                {formatVND(shippingTotal)}
              </Column>
            </Row>

            {discountTotal > 0 && (
              <Row style={pricingRow}>
                <Column style={pricingLabelCol}>Khuyến mãi & Giảm trừ:</Column>
                <Column align="right" style={{ ...pricingValueCol, color: '#34d399' }}>
                  -{formatVND(discountTotal)}
                </Column>
              </Row>
            )}

            <Hr style={pricingDivider} />

            <Row style={{ paddingTop: '8px' }}>
              <Column style={{ verticalAlign: 'middle' }}>
                <Text style={grandTotalLabel}>TỔNG CỘNG THANH TOÁN</Text>
                <Text style={vatNotice}>(Đã bao gồm thuế GTGT 8%)</Text>
              </Column>
              <Column align="right" style={{ verticalAlign: 'middle' }}>
                <Text style={grandTotalValue}>{formatVND(totalAmount)}</Text>
              </Column>
            </Row>
          </Section>

          {/* CTA Action Button */}
          <Section style={ctaSection}>
            <Button style={ctaButtonStyle} href={portalUrl}>
              Tra cứu Hành trình & Lộ trình Vận chuyển
            </Button>
            <Text style={ctaSubtext}>
              Hoặc truy cập trực tiếp tại: <Link href={portalUrl} style={linkStyle}>{portalUrl}</Link>
            </Text>
          </Section>

          <Hr style={dividerStyle} />

          {/* Footer & Warranty Notice */}
          <Section style={footerSection}>
            <Text style={warrantyHeader}>CHÍNH SÁCH BẢO HÀNH & HỖ TRỢ KHÁCH HÀNG</Text>
            <Text style={footerNotice}>
              • Mọi sản phẩm Studio One được bảo hành chính hãng <strong>24 tháng 1-đổi-1</strong> đối với toàn bộ lỗi từ nhà sản xuất.
              <br />
              • Quý khách có quyền mở hộp kiểm tra ngoại quan cùng nhân viên giao hàng trước khi nhận.
              <br />
              • Hotline hỗ trợ kỹ thuật âm học: <strong>1900 6868</strong> (8:00 - 21:00 hàng ngày).
            </Text>

            <Text style={copyrightText}>
              © 2026 FORMA Audio Inc. All rights reserved.
              <br />
              Biên lai điện tử có giá trị đối soát pháp lý và bảo hành điện tử chính thức.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// ----------------------------------------------------
// Dark-Theme CSS Inline Styles (High Email-Client Compatibility)
// ----------------------------------------------------

const mainStyle: React.CSSProperties = {
  backgroundColor: '#0a0d13',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  margin: '0',
  padding: '40px 0',
  color: '#e2e8f0',
};

const containerStyle: React.CSSProperties = {
  backgroundColor: '#121620',
  borderRadius: '20px',
  border: '1px solid #1f2737',
  maxWidth: '620px',
  margin: '0 auto',
  padding: '36px 32px',
  boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.7)',
};

const headerSection: React.CSSProperties = {
  marginBottom: '20px',
};

const brandLogoText: React.CSSProperties = {
  fontSize: '20px',
  fontWeight: '800',
  letterSpacing: '0.24em',
  color: '#ffffff',
  margin: '0',
};

const brandSubtitle: React.CSSProperties = {
  fontSize: '10px',
  fontWeight: '600',
  letterSpacing: '0.18em',
  color: '#64748b',
  margin: '4px 0 0 0',
};

const paidBadgeStyle: React.CSSProperties = {
  display: 'inline-block',
  backgroundColor: 'rgba(16, 185, 129, 0.15)',
  color: '#34d399',
  border: '1px solid rgba(16, 185, 129, 0.35)',
  borderRadius: '9999px',
  padding: '6px 14px',
  fontSize: '11px',
  fontWeight: '700',
  letterSpacing: '0.08em',
};

const dividerStyle: React.CSSProperties = {
  borderColor: '#1e2638',
  margin: '24px 0',
};

const introSection: React.CSSProperties = {
  marginBottom: '24px',
};

const headingTitle: React.CSSProperties = {
  fontSize: '24px',
  fontWeight: '700',
  color: '#ffffff',
  margin: '0 0 10px 0',
  letterSpacing: '-0.02em',
};

const paragraphMuted: React.CSSProperties = {
  fontSize: '14px',
  lineHeight: '1.6',
  color: '#94a3b8',
  margin: '0',
};

const metaCardStyle: React.CSSProperties = {
  backgroundColor: 'rgba(255, 255, 255, 0.03)',
  border: '1px solid #1e2638',
  borderRadius: '14px',
  padding: '16px 20px',
  marginBottom: '16px',
};

const metaLabelCol: React.CSSProperties = {
  width: '35%',
  fontSize: '13px',
  color: '#64748b',
  fontWeight: '500',
};

const metaValueCol: React.CSSProperties = {
  width: '65%',
  fontSize: '13px',
  color: '#e2e8f0',
  fontWeight: '600',
};

const codeBadgeStyle: React.CSSProperties = {
  fontFamily: 'SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  fontSize: '12px',
  backgroundColor: '#1a2233',
  padding: '3px 8px',
  borderRadius: '6px',
  border: '1px solid #2b364e',
  color: '#38bdf8',
};

const addressCardStyle: React.CSSProperties = {
  backgroundColor: 'rgba(255, 255, 255, 0.03)',
  border: '1px solid #1e2638',
  borderRadius: '14px',
  padding: '16px 20px',
  marginBottom: '24px',
};

const sectionSubheader: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: '700',
  letterSpacing: '0.12em',
  color: '#94a3b8',
  margin: '0 0 10px 0',
};

const addressLine: React.CSSProperties = {
  fontSize: '13px',
  lineHeight: '1.5',
  color: '#cbd5e1',
  margin: '3px 0',
};

const splitNoticeSection: React.CSSProperties = {
  backgroundColor: 'rgba(245, 158, 11, 0.08)',
  border: '1px solid rgba(245, 158, 11, 0.25)',
  borderRadius: '16px',
  padding: '20px',
  marginBottom: '24px',
};

const splitNoticeHeader: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: '800',
  letterSpacing: '0.06em',
  color: '#fbbf24',
  margin: '0 0 6px 0',
};

const splitNoticeBody: React.CSSProperties = {
  fontSize: '13px',
  lineHeight: '1.6',
  color: '#e2e8f0',
  margin: '0 0 16px 0',
};

const fulfillmentCardStyle: React.CSSProperties = {
  backgroundColor: '#10141d',
  border: '1px solid #222c3f',
  borderRadius: '12px',
  padding: '16px',
  marginBottom: '12px',
};

const inStockPillStyle: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: '700',
  backgroundColor: 'rgba(16, 185, 129, 0.2)',
  color: '#34d399',
  padding: '3px 10px',
  borderRadius: '9999px',
};

const preorderPillStyle: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: '700',
  backgroundColor: 'rgba(245, 158, 11, 0.2)',
  color: '#fbbf24',
  padding: '3px 10px',
  borderRadius: '9999px',
};

const feeTextStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#94a3b8',
  fontWeight: '500',
};

const estimatedDeliveryText: React.CSSProperties = {
  fontSize: '12px',
  color: '#cbd5e1',
  margin: '8px 0 12px 0',
};

const itemRowStyle: React.CSSProperties = {
  borderTop: '1px solid #1e2638',
  paddingTop: '12px',
  marginTop: '8px',
};

const itemNameText: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: '600',
  color: '#ffffff',
  margin: '0',
};

const itemSubtext: React.CSSProperties = {
  fontSize: '12px',
  color: '#64748b',
  margin: '2px 0 0 0',
};

const itemQuantityPrice: React.CSSProperties = {
  fontSize: '12px',
  color: '#94a3b8',
  margin: '0',
};

const itemTotalPrice: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: '700',
  color: '#ffffff',
  margin: '2px 0 0 0',
};

const pricingBreakdownSection: React.CSSProperties = {
  marginTop: '8px',
  marginBottom: '28px',
};

const pricingRow: React.CSSProperties = {
  marginBottom: '8px',
};

const pricingLabelCol: React.CSSProperties = {
  width: '60%',
  fontSize: '13px',
  color: '#94a3b8',
};

const pricingValueCol: React.CSSProperties = {
  width: '40%',
  fontSize: '14px',
  fontWeight: '600',
  color: '#ffffff',
};

const pricingDivider: React.CSSProperties = {
  borderColor: '#263147',
  margin: '12px 0',
};

const grandTotalLabel: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: '800',
  letterSpacing: '0.06em',
  color: '#ffffff',
  margin: '0',
};

const vatNotice: React.CSSProperties = {
  fontSize: '11px',
  color: '#64748b',
  margin: '2px 0 0 0',
};

const grandTotalValue: React.CSSProperties = {
  fontSize: '22px',
  fontWeight: '800',
  color: '#38bdf8',
  margin: '0',
  letterSpacing: '-0.02em',
};

const ctaSection: React.CSSProperties = {
  textAlign: 'center',
  marginBottom: '24px',
};

const ctaButtonStyle: React.CSSProperties = {
  backgroundColor: '#ffffff',
  color: '#0f172a',
  borderRadius: '12px',
  fontSize: '14px',
  fontWeight: '700',
  padding: '14px 28px',
  display: 'inline-block',
  textDecoration: 'none',
  boxShadow: '0 4px 15px rgba(255, 255, 255, 0.15)',
};

const ctaSubtext: React.CSSProperties = {
  fontSize: '12px',
  color: '#64748b',
  marginTop: '12px',
};

const linkStyle: React.CSSProperties = {
  color: '#38bdf8',
  textDecoration: 'underline',
};

const footerSection: React.CSSProperties = {
  marginTop: '20px',
  textAlign: 'center',
};

const warrantyHeader: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: '700',
  letterSpacing: '0.1em',
  color: '#94a3b8',
  margin: '0 0 8px 0',
};

const footerNotice: React.CSSProperties = {
  fontSize: '12px',
  lineHeight: '1.7',
  color: '#64748b',
  margin: '0 0 16px 0',
  textAlign: 'left',
};

const copyrightText: React.CSSProperties = {
  fontSize: '11px',
  color: '#475569',
  margin: '0',
  lineHeight: '1.5',
};

export default ReceiptEmail;
