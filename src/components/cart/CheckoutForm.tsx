'use client';

import Link from 'next/link';
import { useEffect, useId, useMemo, useState } from 'react';
import { cartSubtotal, useCartHydrated, useCartStore } from '@/store/cart';
import { FREE_SHIPPING_THRESHOLD, SHIPPING_FEE } from '@/lib/cart/pricing';
import { getBrowserSupabaseClient } from '@/lib/supabase/client';
import type { CartTotals } from '@/lib/catalog/types';
import type { Order } from '@/types/order';
import type { UserAddressRow } from '@/lib/supabase/database.types';

function formatPrice(price: number) {
  return new Intl.NumberFormat('vi-VN').format(price) + '₫';
}

export interface CheckoutIssue {
  code?: string;
  variantId?: string;
  field?: string;
  message: string;
}

type SubmitState =
  | { status: 'idle' }
  | { status: 'submitting' }
  | { status: 'error'; message: string; issues: CheckoutIssue[] }
  | { status: 'done'; order: Order; persisted: boolean };

function getFieldLabel(field?: string) {
  if (!field) return null;
  const key = field.replace(/^customer\./, '');
  const labels: Record<string, string> = {
    fullName: 'Họ và tên',
    email: 'Email',
    phone: 'Số điện thoại',
    address: 'Địa chỉ nhận hàng',
    city: 'Tỉnh / Thành phố',
    postalCode: 'Mã bưu chính',
    notes: 'Ghi chú',
  };
  return labels[key] ?? null;
}

const PAYMENT_METHODS = [
  {
    value: 'cod',
    title: 'Thanh toán khi nhận hàng (COD)',
    description: 'Kiểm tra hàng trước khi thanh toán tiền mặt trực tiếp cho nhân viên giao hàng.',
    badge: 'Phổ biến',
    icon: CashIcon,
  },
  {
    value: 'vnpay',
    title: 'VNPAY-QR / Thẻ ATM nội địa',
    description: 'Quét mã QR tức thì qua ứng dụng của hơn 30 ngân hàng lớn hoặc ví VNPAY.',
    badge: 'Tiện lợi',
    icon: QrIcon,
  },
  {
    value: 'momo',
    title: 'Ví điện tử MoMo',
    description: 'Thanh toán siêu tốc một chạm qua ứng dụng ví MoMo trên điện thoại.',
    badge: 'Nhanh chóng',
    icon: WalletIcon,
  },
  {
    value: 'stripe',
    title: 'Thẻ thanh toán quốc tế',
    description: 'Hỗ trợ thẻ Visa, MasterCard, JCB với chuẩn bảo mật mã hoá quốc tế PCI DSS.',
    badge: 'Bảo mật',
    icon: CreditCardIcon,
  },
] as const;

export function CheckoutForm() {
  const items = useCartStore((state) => state.items);
  const clearCart = useCartStore((state) => state.clearCart);
  const openCart = useCartStore((state) => state.openCart);
  const hydrated = useCartHydrated();

  const [paymentMethod, setPaymentMethod] =
    useState<(typeof PAYMENT_METHODS)[number]['value']>('cod');
  const [state, setState] = useState<SubmitState>({ status: 'idle' });
  const formId = useId();

  // User state and saved addresses
  const [currentUser, setCurrentUser] = useState<{ id: string; email?: string } | null>(null);
  const [savedAddresses, setSavedAddresses] = useState<UserAddressRow[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);

  // Form input fields (controlled for auto-fill from saved addresses)
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [notes, setNotes] = useState('');

  // Discount voucher state
  const [voucherCode, setVoucherCode] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState<{
    code: string;
    discount: number;
    description: string;
  } | null>(null);
  const [voucherError, setVoucherError] = useState<string | null>(null);

  // Mobile order summary accordion
  const [mobileSummaryOpen, setMobileSummaryOpen] = useState(false);
  const [copiedOrderNumber, setCopiedOrderNumber] = useState(false);

  // Server-verified total for the cart as it currently stands.
  const linesKey = useMemo(
    () => items.map((item) => `${item.variantId}:${item.quantity}`).join('|'),
    [items],
  );
  const [quote, setQuote] = useState<{ key: string; totals: CartTotals } | null>(null);

  // Load user & addresses on mount
  useEffect(() => {
    const supabase = getBrowserSupabaseClient();
    if (!supabase) return;
    const client = supabase;

    async function loadUserAndAddresses() {
      try {
        const {
          data: { user },
        } = await client.auth.getUser();

        if (user) {
          setCurrentUser({ id: user.id, email: user.email });
          if (user.email) setEmail(user.email);

          const { data, error } = await client
            .from('user_addresses')
            .select('*')
            .eq('user_id', user.id)
            .order('is_default', { ascending: false })
            .order('created_at', { ascending: false });

          if (!error && data && data.length > 0) {
            setSavedAddresses(data);
            const defaultAddr = data.find((a) => a.is_default) || data[0];
            if (defaultAddr) {
              setSelectedAddressId(defaultAddr.id);
              setFullName(defaultAddr.recipient_name);
              setPhone(defaultAddr.phone);
              setAddress(defaultAddr.street_address);
              setCity(defaultAddr.city);
              if (defaultAddr.postal_code) setPostalCode(defaultAddr.postal_code);
            }
          }
        }
      } catch {
        // Table might not exist yet on remote, fail quietly
      }
    }

    loadUserAndAddresses();
  }, []);

  // Sync cart validation quote
  useEffect(() => {
    if (!hydrated || items.length === 0) return;

    let cancelled = false;
    const key = linesKey;

    fetch('/api/cart/validate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        items: items.map((item) => ({ variantId: item.variantId, quantity: item.quantity })),
        lines: items.map((item) => ({ variantId: item.variantId, quantity: item.quantity })),
      }),
    })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error('validate'))))
      .then((data: { totals: CartTotals }) => {
        if (cancelled) return;
        setQuote({ key, totals: data.totals });
      })
      .catch(() => {
        // Totals fall back to the client estimate; the server still wins at submit.
      });

    return () => {
      cancelled = true;
    };
  }, [linesKey, hydrated, items]);

  const rawSubtotal = cartSubtotal(items);
  const subtotal = quote && quote.key === linesKey ? quote.totals.subtotal : rawSubtotal;
  const isFreeShipping = subtotal >= FREE_SHIPPING_THRESHOLD;
  const shippingFee = isFreeShipping
    ? 0
    : quote && quote.key === linesKey
    ? quote.totals.shippingTotal
    : SHIPPING_FEE;
  const discountAmount = appliedVoucher ? appliedVoucher.discount : 0;
  const finalTotal = Math.max(0, subtotal + shippingFee - discountAmount);

  const hasPreorder = items.some((item) => item.stockStatus === 'preorder');
  const hasInStock = items.some((item) => item.stockStatus !== 'preorder');
  const isSplitDelivery = hasPreorder && hasInStock;
  const totalItemsCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const handleApplyVoucher = (e: React.FormEvent) => {
    e.preventDefault();
    const code = voucherCode.trim().toUpperCase();
    if (!code) return;

    if (code === 'HYPER2026' || code === 'SETUP3D') {
      setAppliedVoucher({
        code,
        discount: 100_000,
        description: 'Ưu đãi thành viên: Giảm 100.000₫ đơn công nghệ',
      });
      setVoucherError(null);
    } else if (code === 'FREESHIP') {
      setAppliedVoucher({
        code,
        discount: 35_000,
        description: 'Mã miễn phí vận chuyển',
      });
      setVoucherError(null);
    } else {
      setVoucherError(`Mã giảm giá "${code}" không hợp lệ hoặc đã hết lượt.`);
    }
  };

  const handleSelectAddress = (addr: UserAddressRow) => {
    setSelectedAddressId(addr.id);
    setFullName(addr.recipient_name);
    setPhone(addr.phone);
    setAddress(addr.street_address);
    setCity(addr.city);
    setPostalCode(addr.postal_code || '');
  };

  const handleNewAddress = () => {
    setSelectedAddressId('new');
    setFullName('');
    setPhone('');
    setAddress('');
    setCity('');
    setPostalCode('');
  };

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState({ status: 'submitting' });

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          paymentMethod,
          customer: {
            fullName: fullName.trim(),
            email: email.trim(),
            phone: phone.trim(),
            address: address.trim(),
            city: city.trim(),
            postalCode: postalCode.trim() || undefined,
            notes: notes.trim() || undefined,
          },
          items: items.map((item) => ({
            variantId: item.variantId,
            quantity: item.quantity,
          })),
        }),
      });

      const body = await response.json();

      if (!response.ok || !body?.ok) {
        setState({
          status: 'error',
          message: body?.error ?? 'Không thể tạo đơn hàng. Vui lòng kiểm tra lại thông tin.',
          issues: body?.issues ?? [],
        });
        return;
      }

      clearCart();
      setState({
        status: 'done',
        order: body.order as Order,
        persisted: body.persisted === true,
      });
    } catch {
      setState({
        status: 'error',
        message: 'Không kết nối được tới máy chủ xử lý đơn hàng. Vui lòng thử lại.',
        issues: [],
      });
    }
  }

  const copyOrderNumber = (orderNumber: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(orderNumber);
      setCopiedOrderNumber(true);
      setTimeout(() => setCopiedOrderNumber(false), 2000);
    }
  };

  if (!hydrated) {
    return (
      <div className="max-w-4xl mx-auto py-20 flex flex-col items-center justify-center text-center">
        <div className="w-10 h-10 border-2 border-neutral-300 border-t-neutral-900 dark:border-neutral-700 dark:border-t-white rounded-full animate-spin mb-4" />
        <p className="text-sm text-neutral-500 font-medium tracking-wide">
          Đang khởi tạo phiên thanh toán bảo mật…
        </p>
      </div>
    );
  }

  // Done State
  if (state.status === 'done') {
    const { order, persisted } = state;
    return (
      <section className="max-w-3xl mx-auto py-6 sm:py-12" aria-labelledby="checkout-done-title">
        <div className="bg-white dark:bg-[#141518] rounded-3xl border border-neutral-200/80 dark:border-neutral-800 p-6 sm:p-10 shadow-sm text-center">
          {/* Animated checkmark icon */}
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6 ring-8 ring-emerald-500/10">
            <CheckCircleIcon className="w-9 h-9 sm:w-11 sm:h-11" />
          </div>

          <h1
            id="checkout-done-title"
            className="text-2xl sm:text-3xl font-semibold tracking-tight text-neutral-900 dark:text-white"
          >
            Đặt hàng thành công!
          </h1>
          <p className="mt-2.5 text-neutral-600 dark:text-neutral-400 text-sm sm:text-base max-w-lg mx-auto">
            Cảm ơn bạn đã lựa chọn sản phẩm của chúng tôi. Thông tin chi tiết đơn hàng đã được gửi tới{' '}
            <strong className="text-neutral-900 dark:text-neutral-100">{order.customer.email}</strong>.
          </p>

          {!persisted ? (
            <div className="mt-5 p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-2xl text-amber-800 dark:text-amber-200 text-xs sm:text-sm text-left">
              <span className="font-semibold">Lưu ý xem trước:</span> Đơn hàng này đang chạy trong môi trường demo/preview và chưa lưu vào cơ sở dữ liệu Supabase thực tế.
            </div>
          ) : null}

          {/* Order Details Pill */}
          <div className="mt-6 inline-flex items-center gap-3 px-4 py-2 bg-neutral-100 dark:bg-neutral-800/80 rounded-full text-sm font-medium">
            <span className="text-neutral-500">Mã đơn:</span>
            <span className="font-mono font-bold text-neutral-900 dark:text-white">
              #{order.orderNumber}
            </span>
            <button
              type="button"
              onClick={() => copyOrderNumber(order.orderNumber)}
              className="text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors text-xs flex items-center gap-1 ml-1"
              title="Sao chép mã đơn"
            >
              <CopyIcon className="w-3.5 h-3.5" />
              <span>{copiedOrderNumber ? 'Đã sao chép' : 'Chép'}</span>
            </button>
          </div>

          {/* Order Timeline steps */}
          <div className="mt-8 border-t border-b border-neutral-100 dark:border-neutral-800/80 py-6">
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              <div className="flex flex-col items-center">
                <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold mb-1.5">
                  ✓
                </div>
                <span className="font-medium text-neutral-900 dark:text-white">Tiếp nhận</span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400">Đã xong</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-7 h-7 rounded-full bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 flex items-center justify-center font-bold mb-1.5 ring-4 ring-neutral-200 dark:ring-neutral-700">
                  2
                </div>
                <span className="font-medium text-neutral-900 dark:text-white">Xử lý & Đóng gói</span>
                <span className="text-[10px] text-neutral-500">Đang thực hiện</span>
              </div>
              <div className="flex flex-col items-center opacity-40">
                <div className="w-7 h-7 rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-500 flex items-center justify-center font-bold mb-1.5">
                  3
                </div>
                <span className="font-medium">Vận chuyển</span>
                <span className="text-[10px]">Chờ bưu tá</span>
              </div>
              <div className="flex flex-col items-center opacity-40">
                <div className="w-7 h-7 rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-500 flex items-center justify-center font-bold mb-1.5">
                  4
                </div>
                <span className="font-medium">Giao hàng</span>
                <span className="text-[10px]">Hoàn tất</span>
              </div>
            </div>
          </div>

          {/* Split shipments if applicable */}
          {order.isSplitShipment ? (
            <div className="mt-6 text-left">
              <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-2.5">
                Kiện hàng được tách giao ({order.fulfillments.length} kiện)
              </p>
              <div className="space-y-2.5">
                {order.fulfillments.map((fulfillment) => (
                  <div
                    key={fulfillment.id}
                    className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-900/40 border border-neutral-200/60 dark:border-neutral-800 flex items-center justify-between text-xs sm:text-sm"
                  >
                    <div>
                      <span className="font-semibold text-neutral-900 dark:text-white">
                        {fulfillment.type === 'preorder' ? '📦 Kiện Đặt trước' : '⚡ Kiện Giao ngay'}
                      </span>
                      <p className="text-neutral-500 text-xs mt-0.5">
                        {fulfillment.items.length} món · Dự kiến giao: {fulfillment.estimatedDelivery}
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-medium">
                      Đang xử lý
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* Action links */}
          <div className="mt-8 pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href={`/orders/${order.id}`}
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-medium text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-xs"
            >
              <span>Theo dõi đơn hàng thời gian thực</span>
              <ArrowRightIcon className="w-4 h-4" />
            </Link>
            <Link
              href="/"
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl border border-neutral-200 dark:border-neutral-700 font-medium text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors flex items-center justify-center"
            >
              Tiếp tục chọn thiết bị
            </Link>
          </div>
        </div>
      </section>
    );
  }

  // Empty Cart State
  if (items.length === 0) {
    return (
      <section
        className="max-w-2xl mx-auto py-16 sm:py-24 text-center"
        aria-labelledby="checkout-empty-title"
      >
        <div className="w-20 h-20 bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 text-neutral-400 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xs">
          <ShoppingBagIcon className="w-10 h-10" />
        </div>
        <h1
          id="checkout-empty-title"
          className="text-2xl sm:text-3xl font-semibold tracking-tight text-neutral-900 dark:text-white"
        >
          Giỏ hàng của bạn đang trống
        </h1>
        <p className="mt-3 text-neutral-500 dark:text-neutral-400 text-sm sm:text-base max-w-md mx-auto">
          Chưa có thiết bị công nghệ nào trong giỏ. Hãy chọn các sản phẩm bạn yêu thích để tiếp tục hoàn tất thanh toán.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
          <Link
            href="/"
            className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 text-sm font-medium hover:opacity-90 transition-opacity shadow-xs"
          >
            Khám phá trang chủ
          </Link>
          <Link
            href="/monitor"
            className="w-full sm:w-auto px-6 py-3.5 rounded-2xl border border-neutral-200 dark:border-neutral-700 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            Xem bộ sưu tập màn hình 3D
          </Link>
        </div>
      </section>
    );
  }

  return (
    <div className="w-full pb-12">
      {/* Breadcrumb Navigation */}
      <nav aria-label="Tiến trình thanh toán" className="mb-6 sm:mb-8">
        <ol className="flex items-center gap-2 text-xs sm:text-sm text-neutral-500">
          <li>
            <button
              type="button"
              onClick={openCart}
              className="hover:text-neutral-900 dark:hover:text-white transition-colors flex items-center gap-1.5 font-medium"
            >
              <span>Giỏ hàng</span>
              <span className="w-5 h-5 rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs flex items-center justify-center font-bold">
                {totalItemsCount}
              </span>
            </button>
          </li>
          <li aria-hidden="true" className="text-neutral-300 dark:text-neutral-600">/</li>
          <li className="font-semibold text-neutral-900 dark:text-white flex items-center gap-1">
            <span>Thông tin & Thanh toán</span>
          </li>
          <li aria-hidden="true" className="text-neutral-300 dark:text-neutral-600">/</li>
          <li className="text-neutral-400 dark:text-neutral-600">Hoàn tất</li>
        </ol>
      </nav>

      {/* Mobile Collapsible Order Summary Dropdown */}
      <div className="lg:hidden mb-6 bg-white dark:bg-[#141518] border border-neutral-200/80 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-xs">
        <button
          type="button"
          onClick={() => setMobileSummaryOpen(!mobileSummaryOpen)}
          className="w-full px-4 py-3.5 flex items-center justify-between text-sm"
        >
          <div className="flex items-center gap-2 text-neutral-700 dark:text-neutral-300 font-medium">
            <ShoppingBagIcon className="w-4 h-4 text-neutral-500" />
            <span>{mobileSummaryOpen ? 'Thu gọn đơn hàng' : 'Xem tóm tắt đơn hàng'}</span>
            <ChevronDownIcon
              className={`w-3.5 h-3.5 text-neutral-400 transition-transform duration-200 ${
                mobileSummaryOpen ? 'rotate-180' : ''
              }`}
            />
          </div>
          <span className="font-bold text-neutral-900 dark:text-white text-base">
            {formatPrice(finalTotal)}
          </span>
        </button>

        {mobileSummaryOpen && (
          <div className="p-4 border-t border-neutral-100 dark:border-neutral-800 space-y-3 bg-neutral-50/50 dark:bg-neutral-900/30">
            {items.map((item) => (
              <div key={item.variantId} className="flex items-center gap-3">
                <div className="relative w-12 h-12 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200/70 dark:border-neutral-700 p-1 flex-shrink-0">
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-neutral-400">
                      <ShoppingBagIcon className="w-5 h-5" />
                    </div>
                  )}
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-[10px] font-bold flex items-center justify-center">
                    {item.quantity}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-neutral-900 dark:text-white truncate">
                    {item.name}
                  </p>
                  <p className="text-[11px] text-neutral-500 truncate">{item.variantName}</p>
                </div>
                <span className="text-xs font-medium text-neutral-900 dark:text-white">
                  {formatPrice(item.unitPrice * item.quantity)}
                </span>
              </div>
            ))}
            <div className="pt-3 border-t border-neutral-200/60 dark:border-neutral-800 space-y-1.5 text-xs">
              <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                <span>Tạm tính</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                <span>Vận chuyển</span>
                <span>{isFreeShipping ? 'Miễn phí' : formatPrice(shippingFee)}</span>
              </div>
              {appliedVoucher ? (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-medium">
                  <span>Giảm giá ({appliedVoucher.code})</span>
                  <span>-{formatPrice(appliedVoucher.discount)}</span>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>

      {/* 2-Column Responsive Layout */}
      <div className="lg:grid lg:grid-cols-12 lg:gap-8 xl:gap-12 items-start">
        {/* Left Column: Form & Payment Methods (7/12) */}
        <div className="lg:col-span-7 xl:col-span-7 space-y-8">
          {/* Error Alert Box */}
          {state.status === 'error' ? (
            <div
              className="p-4 sm:p-5 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-200 shadow-xs"
              role="alert"
            >
              <div className="flex items-start gap-3">
                <span className="text-rose-500 font-bold text-lg leading-none">⚠</span>
                <div className="flex-1">
                  <p className="font-semibold text-sm">{state.message}</p>
                  {state.issues.length > 0 ? (
                    <ul className="mt-2 space-y-1 text-xs">
                      {state.issues.map((issue, index) => {
                        const issueKey =
                          issue.variantId && issue.code
                            ? `${issue.code}-${issue.variantId}-${index}`
                            : issue.field
                            ? `field-${issue.field}-${index}`
                            : `issue-${index}-${issue.message || 'error'}`;
                        const label = getFieldLabel(issue.field);
                        return (
                          <li key={issueKey} className="flex items-center gap-1.5">
                            <span className="w-1 h-1 rounded-full bg-rose-500" />
                            {label ? <strong>{label}: </strong> : null}
                            <span>{issue.message}</span>
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          <form id="checkout-main-form" onSubmit={handleSubmit} className="space-y-8">
            {/* 1. Customer Shipping Info */}
            <div className="bg-white dark:bg-[#141518] rounded-3xl border border-neutral-200/80 dark:border-neutral-800 p-6 sm:p-8 shadow-xs">
              <div className="flex items-center justify-between pb-5 border-b border-neutral-100 dark:border-neutral-800">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 flex items-center justify-center font-bold text-xs">
                    1
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-semibold tracking-tight text-neutral-900 dark:text-white">
                      Thông tin giao hàng
                    </h2>
                    <p className="text-xs text-neutral-500">
                      Địa chỉ nhận hàng và thông tin liên hệ của người nhận
                    </p>
                  </div>
                </div>

                {currentUser ? (
                  <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-medium border border-emerald-200/60 dark:border-emerald-800/60">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    {currentUser.email}
                  </span>
                ) : (
                  <Link
                    href="/account/login?redirect=/checkout"
                    className="text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white underline"
                  >
                    Đăng nhập
                  </Link>
                )}
              </div>

              {/* Saved Addresses quick-picker for logged-in user */}
              {savedAddresses.length > 0 && (
                <div className="mt-5 p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-900/40 border border-neutral-200/60 dark:border-neutral-800">
                  <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 block mb-2">
                    Sổ địa chỉ đã lưu
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {savedAddresses.map((addr) => {
                      const isSelected = selectedAddressId === addr.id;
                      return (
                        <button
                          key={addr.id}
                          type="button"
                          onClick={() => handleSelectAddress(addr)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all text-left flex items-center gap-1.5 ${
                            isSelected
                              ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-xs'
                              : 'bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:border-neutral-400'
                          }`}
                        >
                          <span>{addr.recipient_name}</span>
                          <span className="opacity-70 text-[11px]">({addr.city})</span>
                          {addr.is_default ? (
                            <span className="text-[10px] bg-emerald-500 text-white px-1.5 py-0.2 rounded-md">
                              Mặc định
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={handleNewAddress}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                        selectedAddressId === 'new'
                          ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                          : 'bg-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-white border border-dashed border-neutral-300 dark:border-neutral-700'
                      }`}
                    >
                      + Nhập địa chỉ khác
                    </button>
                  </div>
                </div>
              )}

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Full name */}
                <div>
                  <label
                    htmlFor={`${formId}-name`}
                    className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5"
                  >
                    Họ và tên <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id={`${formId}-name`}
                    name="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    autoComplete="name"
                    placeholder="Ví dụ: Nguyễn Văn A"
                    minLength={2}
                    className="w-full px-4 py-2.5 rounded-xl border border-neutral-200/90 dark:border-neutral-800 bg-white dark:bg-neutral-900/50 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 dark:focus:ring-white/20 dark:focus:border-white transition-all placeholder:text-neutral-400"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label
                    htmlFor={`${formId}-phone`}
                    className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5"
                  >
                    Số điện thoại <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id={`${formId}-phone`}
                    name="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    autoComplete="tel"
                    placeholder="Ví dụ: 0912345678"
                    className="w-full px-4 py-2.5 rounded-xl border border-neutral-200/90 dark:border-neutral-800 bg-white dark:bg-neutral-900/50 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 dark:focus:ring-white/20 dark:focus:border-white transition-all placeholder:text-neutral-400"
                  />
                </div>

                {/* Email */}
                <div className="sm:col-span-2">
                  <label
                    htmlFor={`${formId}-email`}
                    className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5"
                  >
                    Địa chỉ Email <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id={`${formId}-email`}
                    name="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    placeholder="name@example.com"
                    className="w-full px-4 py-2.5 rounded-xl border border-neutral-200/90 dark:border-neutral-800 bg-white dark:bg-neutral-900/50 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 dark:focus:ring-white/20 dark:focus:border-white transition-all placeholder:text-neutral-400"
                  />
                  <p className="mt-1 text-[11px] text-neutral-500">
                    Dùng để nhận hoá đơn điện tử VAT và thông báo hành trình đơn hàng
                  </p>
                </div>

                {/* Address */}
                <div className="sm:col-span-2">
                  <label
                    htmlFor={`${formId}-address`}
                    className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5"
                  >
                    Địa chỉ nhận hàng <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id={`${formId}-address`}
                    name="address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    required
                    autoComplete="street-address"
                    placeholder="Số nhà, tên đường, toà nhà, phường / xã..."
                    minLength={5}
                    className="w-full px-4 py-2.5 rounded-xl border border-neutral-200/90 dark:border-neutral-800 bg-white dark:bg-neutral-900/50 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 dark:focus:ring-white/20 dark:focus:border-white transition-all placeholder:text-neutral-400"
                  />
                </div>

                {/* City */}
                <div>
                  <label
                    htmlFor={`${formId}-city`}
                    className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5"
                  >
                    Tỉnh / Thành phố <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id={`${formId}-city`}
                    name="city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    required
                    autoComplete="address-level2"
                    placeholder="Hà Nội, TP. Hồ Chí Minh, Đà Nẵng..."
                    minLength={2}
                    className="w-full px-4 py-2.5 rounded-xl border border-neutral-200/90 dark:border-neutral-800 bg-white dark:bg-neutral-900/50 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 dark:focus:ring-white/20 dark:focus:border-white transition-all placeholder:text-neutral-400"
                  />
                </div>

                {/* Postal Code */}
                <div>
                  <label
                    htmlFor={`${formId}-postal`}
                    className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5"
                  >
                    Mã bưu chính <span className="text-neutral-400 font-normal">(tuỳ chọn)</span>
                  </label>
                  <input
                    id={`${formId}-postal`}
                    name="postalCode"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    autoComplete="postal-code"
                    placeholder="Ví dụ: 700000"
                    className="w-full px-4 py-2.5 rounded-xl border border-neutral-200/90 dark:border-neutral-800 bg-white dark:bg-neutral-900/50 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 dark:focus:ring-white/20 dark:focus:border-white transition-all placeholder:text-neutral-400"
                  />
                </div>

                {/* Notes */}
                <div className="sm:col-span-2">
                  <label
                    htmlFor={`${formId}-notes`}
                    className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5"
                  >
                    Ghi chú đơn hàng <span className="text-neutral-400 font-normal">(tuỳ chọn)</span>
                  </label>
                  <textarea
                    id={`${formId}-notes`}
                    name="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    placeholder="Chỉ dẫn giao hàng đặc biệt, giờ nhận hàng phù hợp..."
                    className="w-full px-4 py-2.5 rounded-xl border border-neutral-200/90 dark:border-neutral-800 bg-white dark:bg-neutral-900/50 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 dark:focus:ring-white/20 dark:focus:border-white transition-all placeholder:text-neutral-400 resize-none"
                  />
                </div>
              </div>
            </div>

            {/* 2. Delivery & Fulfillment Strategy */}
            <div className="bg-white dark:bg-[#141518] rounded-3xl border border-neutral-200/80 dark:border-neutral-800 p-6 sm:p-8 shadow-xs">
              <div className="flex items-center gap-3 pb-5 border-b border-neutral-100 dark:border-neutral-800">
                <div className="w-8 h-8 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 flex items-center justify-center font-bold text-xs">
                  2
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-semibold tracking-tight text-neutral-900 dark:text-white">
                    Phương thức vận chuyển
                  </h2>
                  <p className="text-xs text-neutral-500">
                    Đơn vị vận chuyển liên kết hỏa tốc và tiêu chuẩn toàn quốc
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                <div className="p-4 rounded-2xl border border-neutral-900 dark:border-white bg-neutral-900/[0.02] dark:bg-white/[0.03] flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-800 dark:text-neutral-200">
                      <TruckIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-neutral-900 dark:text-white">
                          Giao hàng tiêu chuẩn toàn quốc
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                          1 - 3 ngày
                        </span>
                      </div>
                      <p className="text-xs text-neutral-500 mt-0.5">
                        Theo dõi định vị kiện hàng thời gian thực qua Viettel Post / GHTK
                      </p>
                    </div>
                  </div>
                  <span className="font-bold text-sm text-neutral-900 dark:text-white">
                    {isFreeShipping ? (
                      <span className="text-emerald-600 dark:text-emerald-400">Miễn phí</span>
                    ) : (
                      formatPrice(shippingFee)
                    )}
                  </span>
                </div>

                {isSplitDelivery && (
                  <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/40 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
                    <span className="text-amber-600 font-bold">⚡</span>
                    <div>
                      <strong className="font-semibold">Tách kiện hàng thông minh:</strong> Đơn hàng của bạn có chứa cả sản phẩm sẵn hàng và sản phẩm đặt trước. Hệ thống sẽ tự động tách thành 2 kiện để giao các sản phẩm sẵn có trước, không tính thêm bất kỳ khoản phí phụ trội nào.
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 3. Payment Method Selection */}
            <div className="bg-white dark:bg-[#141518] rounded-3xl border border-neutral-200/80 dark:border-neutral-800 p-6 sm:p-8 shadow-xs">
              <div className="flex items-center gap-3 pb-5 border-b border-neutral-100 dark:border-neutral-800">
                <div className="w-8 h-8 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 flex items-center justify-center font-bold text-xs">
                  3
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-semibold tracking-tight text-neutral-900 dark:text-white">
                    Phương thức thanh toán
                  </h2>
                  <p className="text-xs text-neutral-500">
                    Chọn phương thức thanh toán an toàn và tiện lợi cho bạn
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {PAYMENT_METHODS.map((method) => {
                  const isSelected = paymentMethod === method.value;
                  const Icon = method.icon;
                  return (
                    <div
                      key={method.value}
                      onClick={() => setPaymentMethod(method.value)}
                      className={`cursor-pointer rounded-2xl border p-4 sm:p-4.5 transition-all flex items-start gap-4 ${
                        isSelected
                          ? 'border-neutral-900 bg-neutral-900/[0.03] dark:border-white dark:bg-white/[0.04] ring-1 ring-neutral-900 dark:ring-white shadow-xs'
                          : 'border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900/30 hover:border-neutral-300 dark:hover:border-neutral-700'
                      }`}
                    >
                      {/* Hidden radio for standard form semantics */}
                      <input
                        type="radio"
                        name="paymentMethod"
                        value={method.value}
                        checked={isSelected}
                        onChange={() => setPaymentMethod(method.value)}
                        className="sr-only"
                      />

                      {/* Custom radio indicator */}
                      <div className="pt-0.5 flex-shrink-0">
                        <div
                          className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                            isSelected
                              ? 'border-neutral-900 bg-neutral-900 dark:border-white dark:bg-white'
                              : 'border-neutral-300 dark:border-neutral-600 bg-transparent'
                          }`}
                        >
                          {isSelected && (
                            <div className="w-2 h-2 rounded-full bg-white dark:bg-neutral-900" />
                          )}
                        </div>
                      </div>

                      {/* Method Icon & Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-neutral-900 dark:text-white">
                            {method.title}
                          </span>
                          <span className="px-2 py-0.2 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 text-[10px] font-medium">
                            {method.badge}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-500 mt-0.5 leading-relaxed">
                          {method.description}
                        </p>
                      </div>

                      <div className="hidden sm:flex text-neutral-400 dark:text-neutral-500 flex-shrink-0 pt-0.5">
                        <Icon className="w-6 h-6" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 4. Trust Badges & Guarantees */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-3.5 rounded-2xl bg-white dark:bg-[#141518] border border-neutral-200/60 dark:border-neutral-800 flex items-center gap-3">
                <ShieldCheckIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                <span className="text-xs text-neutral-600 dark:text-neutral-400 font-medium">
                  Bảo mật giao dịch 256-bit SSL
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-white dark:bg-[#141518] border border-neutral-200/60 dark:border-neutral-800 flex items-center gap-3">
                <ShoppingBagIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                <span className="text-xs text-neutral-600 dark:text-neutral-400 font-medium">
                  Đồng kiểm hàng trước khi nhận
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-white dark:bg-[#141518] border border-neutral-200/60 dark:border-neutral-800 flex items-center gap-3">
                <CheckCircleIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                <span className="text-xs text-neutral-600 dark:text-neutral-400 font-medium">
                  Đổi mới trong 7 ngày nếu lỗi
                </span>
              </div>
            </div>

            {/* Submit button on Desktop */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={state.status === 'submitting'}
                className="w-full py-4 px-6 rounded-2xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-semibold text-base hover:opacity-95 active:scale-[0.99] transition-all flex items-center justify-center gap-3 shadow-md disabled:opacity-50 disabled:pointer-events-none"
              >
                {state.status === 'submitting' ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white dark:border-black/30 dark:border-t-black rounded-full animate-spin" />
                    <span>Đang khởi tạo đơn hàng…</span>
                  </>
                ) : (
                  <>
                    <LockIcon className="w-4 h-4" />
                    <span>Đặt hàng · {formatPrice(finalTotal)}</span>
                  </>
                )}
              </button>
              <p className="text-center text-[11px] text-neutral-500 mt-2.5">
                Nhấn Đặt hàng đồng nghĩa với việc bạn đồng ý với Điều khoản dịch vụ và Chính sách giao hàng.
              </p>
            </div>
          </form>
        </div>

        {/* Right Column: Sticky Order Summary (5/12) */}
        <div className="hidden lg:block lg:col-span-5 xl:col-span-5">
          <aside
            aria-label="Tóm tắt đơn hàng"
            className="sticky top-28 bg-white dark:bg-[#141518] rounded-3xl border border-neutral-200/80 dark:border-neutral-800 p-6 sm:p-7 shadow-xs space-y-6"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-base text-neutral-900 dark:text-white">
                  Đơn hàng của bạn
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 text-xs font-bold">
                  {totalItemsCount}
                </span>
              </div>
              <button
                type="button"
                onClick={openCart}
                className="text-xs font-medium text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
              >
                Sửa giỏ hàng
              </button>
            </div>

            {/* Product items list */}
            <div className="max-h-72 overflow-y-auto pr-1 space-y-3.5">
              {items.map((item) => (
                <div key={item.variantId} className="flex items-center gap-3.5">
                  <div className="relative w-14 h-14 rounded-2xl bg-neutral-100 dark:bg-neutral-800/80 border border-neutral-200/60 dark:border-neutral-700/60 p-1 flex-shrink-0">
                    {item.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-neutral-400">
                        <ShoppingBagIcon className="w-6 h-6" />
                      </div>
                    )}
                    <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-[11px] font-bold flex items-center justify-center shadow-xs">
                      {item.quantity}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-neutral-900 dark:text-white truncate">
                      {item.name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] text-neutral-500 truncate">
                        {item.variantName}
                      </span>
                      {item.stockStatus === 'preorder' ? (
                        <span className="px-1.5 py-0.2 rounded bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 text-[9px] font-semibold">
                          Đặt trước
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <span className="text-xs font-semibold text-neutral-900 dark:text-white flex-shrink-0">
                    {formatPrice(item.unitPrice * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            {/* Voucher Coupon Input */}
            <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800">
              <form onSubmit={handleApplyVoucher} className="flex gap-2">
                <input
                  value={voucherCode}
                  onChange={(e) => setVoucherCode(e.target.value)}
                  placeholder="Mã ưu đãi (thử: HYPER2026)"
                  className="flex-1 px-3.5 py-2 rounded-xl border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 text-neutral-900 dark:text-white text-xs uppercase focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-white placeholder:text-neutral-400 placeholder:normal-case"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-xs font-medium hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                >
                  Áp dụng
                </button>
              </form>

              {appliedVoucher && (
                <div className="mt-2.5 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300">
                  <span>{appliedVoucher.description}</span>
                  <button
                    type="button"
                    onClick={() => setAppliedVoucher(null)}
                    className="text-emerald-600 hover:text-emerald-900 dark:hover:text-white font-bold ml-2"
                  >
                    ✕
                  </button>
                </div>
              )}

              {voucherError && (
                <p className="mt-1.5 text-xs text-rose-600 dark:text-rose-400">{voucherError}</p>
              )}
            </div>

            {/* Cost Breakdown */}
            <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 space-y-2.5 text-xs">
              <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                <span>Tạm tính</span>
                <span className="font-medium text-neutral-900 dark:text-white">
                  {formatPrice(subtotal)}
                </span>
              </div>

              <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                <span>Phí vận chuyển</span>
                <span className="font-medium">
                  {isFreeShipping ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                      Miễn phí
                    </span>
                  ) : (
                    formatPrice(shippingFee)
                  )}
                </span>
              </div>

              {appliedVoucher ? (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-medium">
                  <span>Mã giảm giá ({appliedVoucher.code})</span>
                  <span>-{formatPrice(appliedVoucher.discount)}</span>
                </div>
              ) : null}

              <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex justify-between items-baseline">
                <div>
                  <span className="text-sm font-semibold text-neutral-900 dark:text-white block">
                    Tổng thanh toán
                  </span>
                  <span className="text-[10px] text-neutral-400">Đã bao gồm thuế GTGT (VAT)</span>
                </div>
                <span className="text-xl font-bold text-neutral-900 dark:text-white tracking-tight">
                  {formatPrice(finalTotal)}
                </span>
              </div>
            </div>

            {/* Hotline support */}
            <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-900/40 text-[11px] text-neutral-500 space-y-0.5">
              <p className="font-medium text-neutral-700 dark:text-neutral-300">
                Cần hỗ trợ đơn hàng nhanh?
              </p>
              <p>Hotline tư vấn: <strong className="text-neutral-900 dark:text-white font-mono">1900 636 660</strong> (8:30 - 21:30)</p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

// Inline Minimal SVGs
function LockIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <rect x="5" y="11" width="14" height="10" rx="2" strokeWidth="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function TruckIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path d="M1 3h15v13H1zM16 8h4l3 3v5h-7V8z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="5.5" cy="18.5" r="2.5" strokeWidth="2" />
      <circle cx="18.5" cy="18.5" r="2.5" strokeWidth="2" />
    </svg>
  );
}

function ShieldCheckIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 12l2 2 4-4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckCircleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <circle cx="12" cy="12" r="10" strokeWidth="2" />
      <path d="M9 12l2 2 4-4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ShoppingBagIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="3" y1="6" x2="21" y2="6" strokeWidth="2" strokeLinecap="round" />
      <path d="M16 10a4 4 0 0 1-8 0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CashIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <rect x="2" y="6" width="20" height="12" rx="2" strokeWidth="2" />
      <circle cx="12" cy="12" r="3" strokeWidth="2" />
      <path d="M6 12h.01M18 12h.01" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function QrIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <rect x="3" y="3" width="7" height="7" strokeWidth="2" />
      <rect x="14" y="3" width="7" height="7" strokeWidth="2" />
      <rect x="3" y="14" width="7" height="7" strokeWidth="2" />
      <rect x="14" y="14" width="3" height="3" strokeWidth="2" />
      <path d="M17 17h4v4h-4z" strokeWidth="2" />
    </svg>
  );
}

function WalletIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 7v13a2 2 0 0 0 2 2h16v-5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="16" cy="14" r="2" strokeWidth="2" />
    </svg>
  );
}

function CreditCardIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <rect x="2" y="5" width="20" height="14" rx="2" strokeWidth="2" />
      <line x1="2" y1="10" x2="22" y2="10" strokeWidth="2" />
    </svg>
  );
}

function ChevronDownIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path d="M6 9l6 6 6-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CopyIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <rect x="9" y="9" width="13" height="13" rx="2" strokeWidth="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ArrowRightIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path d="M5 12h14M12 5l7 7-7 7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
