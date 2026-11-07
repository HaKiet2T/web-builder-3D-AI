'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useActionState, useMemo, useState } from 'react';
import { useCartStore } from '@/store/cart';
import {
  claimAllGuestOrdersAction,
  claimGuestOrderAction,
  retryOrderPaymentAction,
} from '@/lib/account/actions';
import type { Order } from '@/types/order';

interface OrdersManagerClientProps {
  userEmail: string;
  initialOrders: Order[];
}

type TabKey = 'all' | 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

const TAB_CONFIG: Array<{ key: TabKey; label: string }> = [
  { key: 'all', label: 'Tất cả' },
  { key: 'pending', label: 'Chờ thanh toán' },
  { key: 'processing', label: 'Đang xử lý' },
  { key: 'shipped', label: 'Đang giao' },
  { key: 'delivered', label: 'Hoàn tất' },
  { key: 'cancelled', label: 'Đã huỷ' },
];

function formatPrice(price: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
}

function formatDate(dateStr: string) {
  try {
    return new Intl.DateTimeFormat('vi-VN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

function getStatusBadge(order: Order) {
  if (order.status === 'cancelled' || order.status === 'failed') {
    return {
      label: 'Đã huỷ',
      classes: 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400 border-red-200 dark:border-red-900',
    };
  }
  if (order.status === 'fulfilled') {
    return {
      label: 'Đã hoàn tất',
      classes: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900',
    };
  }
  if (order.status === 'partially_fulfilled' || order.fulfillments.some((f) => f.status === 'shipped')) {
    return {
      label: 'Đang vận chuyển',
      classes: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900',
    };
  }
  if (order.status === 'processing' || order.status === 'paid') {
    return {
      label: 'Đang đóng gói',
      classes: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border-blue-200 dark:border-blue-900',
    };
  }
  return {
    label: 'Chờ thanh toán',
    classes: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-900',
  };
}

export function OrdersManagerClient({ userEmail, initialOrders }: OrdersManagerClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);
  const [selectedRepayOrder, setSelectedRepayOrder] = useState<Order | null>(null);
  const [repaySuccessMsg, setRepaySuccessMsg] = useState<string | null>(null);

  // Cart store for 1-click reorder
  const addItem = useCartStore((state) => state.addItem);
  const openCart = useCartStore((state) => state.openCart);

  // Server actions for claiming guest orders
  const [claimOrderState, claimOrderFormAction, isClaimingOrder] = useActionState(
    claimGuestOrderAction,
    {},
  );
  const [claimAllState, claimAllFormAction, isClaimingAll] = useActionState(
    claimAllGuestOrdersAction,
    {},
  );
  const [, repayFormAction, isRepaying] = useActionState(
    retryOrderPaymentAction,
    {},
  );

  // Categorize orders into tabs
  const tabCounts = useMemo(() => {
    const counts: Record<TabKey, number> = {
      all: initialOrders.length,
      pending: 0,
      processing: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
    };

    for (const o of initialOrders) {
      if (o.status === 'cancelled' || o.status === 'failed') {
        counts.cancelled++;
      } else if (o.status === 'fulfilled') {
        counts.delivered++;
      } else if (o.status === 'partially_fulfilled' || o.fulfillments.some((f) => f.status === 'shipped')) {
        counts.shipped++;
      } else if (o.status === 'processing' || o.status === 'paid') {
        counts.processing++;
      } else {
        counts.pending++;
      }
    }

    return counts;
  }, [initialOrders]);

  // Filter orders according to activeTab and searchQuery
  const filteredOrders = useMemo(() => {
    return initialOrders.filter((order) => {
      // Tab filter
      let matchesTab = true;
      if (activeTab === 'pending') {
        matchesTab = order.status === 'pending' || order.paymentStatus === 'pending' || order.paymentStatus === 'failed';
      } else if (activeTab === 'processing') {
        matchesTab = order.status === 'processing' || order.status === 'paid';
      } else if (activeTab === 'shipped') {
        matchesTab = order.status === 'partially_fulfilled' || order.fulfillments.some((f) => f.status === 'shipped');
      } else if (activeTab === 'delivered') {
        matchesTab = order.status === 'fulfilled';
      } else if (activeTab === 'cancelled') {
        matchesTab = order.status === 'cancelled' || order.status === 'failed';
      }

      if (!matchesTab) return false;

      // Query filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.trim().toLowerCase();
      const matchOrderNumber = order.orderNumber.toLowerCase().includes(q);
      const matchItemName = order.items.some((item) => item.name.toLowerCase().includes(q));
      const matchRecipient = order.customer.fullName.toLowerCase().includes(q);

      return matchOrderNumber || matchItemName || matchRecipient;
    });
  }, [initialOrders, activeTab, searchQuery]);

  const handleCopyOrderNumber = (orderNumber: string) => {
    navigator.clipboard.writeText(orderNumber);
    setCopiedOrderId(orderNumber);
    setTimeout(() => setCopiedOrderId(null), 2000);
  };

  const handleReorder = (order: Order) => {
    for (const item of order.items) {
      addItem({
        productId: item.productId,
        variantId: item.variantId || item.id,
        name: item.name,
        variantName: item.variant,
        imageUrl: null,
        unitPrice: item.price,
        stockStatus: item.stockStatus,
        quantity: item.quantity,
      });
    }
    openCart();
  };

  return (
    <div className="space-y-8">
      {/* Top Breadcrumb & Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-neutral-200/80 dark:border-neutral-800 gap-4">
        <div>
          <nav className="flex items-center gap-2 text-xs font-mono text-neutral-500 mb-1">
            <Link href="/account" className="hover:text-neutral-900 dark:hover:text-white transition-colors">
              Tài khoản
            </Link>
            <span>/</span>
            <span className="text-neutral-900 dark:text-white font-medium">Đơn hàng của tôi</span>
          </nav>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Quản lý đơn hàng
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Theo dõi hành trình vận chuyển, kiểm tra thanh toán và quản lý lịch sử mua sắm.
          </p>
        </div>

        {/* Tab switch to overview */}
        <div className="flex items-center gap-2">
          <Link
            href="/account"
            className="px-3.5 py-1.5 text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white border border-neutral-200 dark:border-neutral-800 rounded-lg transition-colors"
          >
            ← Về tổng quan
          </Link>
        </div>
      </div>

      {/* 1-Click Guest Order Claim Card */}
      <div className="p-5 bg-neutral-50 dark:bg-neutral-900/40 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base">📦</span>
              <h2 className="text-sm font-bold text-neutral-900 dark:text-white">
                Bạn từng mua hàng trước khi có tài khoản?
              </h2>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 max-w-xl">
              Dễ dàng liên kết các đơn hàng vãng lai vào tài khoản để theo dõi tiến trình và nhận đặc quyền bảo hành.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <form action={claimAllFormAction}>
              <button
                type="submit"
                disabled={isClaimingAll}
                className="px-3.5 py-2 text-xs font-bold text-neutral-900 dark:text-white bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 border border-neutral-200 dark:border-neutral-700 rounded-xl transition-all shadow-xs disabled:opacity-50"
              >
                {isClaimingAll ? 'Đang quét...' : `⚡ Đồng bộ theo email (${userEmail})`}
              </button>
            </form>

            <form action={claimOrderFormAction} className="flex items-center gap-2">
              <input
                type="text"
                name="orderNumber"
                placeholder="Nhập mã đơn (HGK-...)"
                required
                className="w-44 px-3 py-1.5 text-xs border border-neutral-300 dark:border-neutral-700 rounded-xl bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-neutral-900 dark:focus:ring-white"
              />
              <button
                type="submit"
                disabled={isClaimingOrder}
                className="px-3 py-1.5 text-xs font-semibold bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isClaimingOrder ? 'Liên kết...' : 'Liên kết'}
              </button>
            </form>
          </div>
        </div>

        {/* Claim Status Messages */}
        {(claimOrderState.error || claimAllState.error) && (
          <p className="mt-3 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 p-2.5 rounded-lg border border-red-200 dark:border-red-900">
            ⚠ {claimOrderState.error || claimAllState.error}
          </p>
        )}
        {(claimOrderState.success || claimAllState.success) && (
          <p className="mt-3 text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 p-2.5 rounded-lg border border-emerald-200 dark:border-emerald-900">
            ✓ {claimOrderState.success || claimAllState.success}
          </p>
        )}
      </div>

      {/* Tabs & Search Filter Header */}
      <div className="space-y-4">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-neutral-200/80 dark:border-neutral-800">
          {TAB_CONFIG.map((tab) => {
            const count = tabCounts[tab.key];
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-xs'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800/60'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isActive
                      ? 'bg-neutral-700 dark:bg-neutral-200 text-white dark:text-neutral-900'
                      : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search input */}
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo mã đơn, tên sản phẩm hoặc người nhận..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-neutral-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-[#111214] text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-hidden focus:ring-1 focus:ring-neutral-900 dark:focus:ring-white"
            />
            <svg
              className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <div className="text-xs text-neutral-500 font-mono">
            {filteredOrders.length} đơn hàng
          </div>
        </div>
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl bg-white dark:bg-[#111214]">
          <div className="w-12 h-12 mx-auto rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-xl mb-3">
            📋
          </div>
          <h2 className="text-sm font-bold text-neutral-900 dark:text-white">
            Không tìm thấy đơn hàng nào
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 max-w-xs mx-auto">
            {searchQuery
              ? 'Không có đơn nào khớp với từ khoá tìm kiếm của bạn.'
              : 'Bạn chưa có đơn hàng nào trong phân loại này.'}
          </p>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="mt-4 px-3 py-1.5 text-xs text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-800 rounded-lg hover:text-neutral-900 dark:hover:text-white"
            >
              Xoá bộ lọc tìm kiếm
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const statusBadge = getStatusBadge(order);
            const isUnpaid = order.status === 'pending' || order.paymentStatus === 'pending' || order.paymentStatus === 'failed';

            return (
              <div
                key={order.id}
                className="bg-white dark:bg-[#111214] border border-neutral-200/80 dark:border-neutral-800 rounded-2xl p-5 hover:border-neutral-300 dark:hover:border-neutral-700 transition-all shadow-xs"
              >
                {/* Header: Order number, date, status */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-neutral-100 dark:divide-neutral-800 dark:border-neutral-800/80 gap-3">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-bold text-neutral-900 dark:text-white">
                      #{order.orderNumber}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyOrderNumber(order.orderNumber)}
                      title="Sao chép mã đơn"
                      className="text-[11px] text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 px-1.5 py-0.5 border border-neutral-200 dark:border-neutral-800 rounded"
                    >
                      {copiedOrderId === order.orderNumber ? '✓ Đã chép' : 'Sao chép'}
                    </button>
                    <span className="text-xs text-neutral-400 font-mono">
                      · {formatDate(order.createdAt)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 text-[11px] font-semibold border rounded-lg ${statusBadge.classes}`}>
                      {statusBadge.label}
                    </span>
                    {isUnpaid ? (
                      <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 rounded">
                        Chưa thanh toán
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 rounded">
                        Đã thanh toán
                      </span>
                    )}
                  </div>
                </div>

                {/* Body: Items Preview */}
                <div className="py-4 divide-y divide-neutral-100 dark:divide-neutral-800/60">
                  {order.items.map((item) => (
                    <div key={item.id} className="py-2.5 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-neutral-100 dark:bg-neutral-800/80 rounded-xl flex items-center justify-center text-xs font-mono text-neutral-400 shrink-0 border border-neutral-200/60 dark:border-neutral-800">
                          3D
                        </div>
                        <div>
                          <h3 className="text-xs font-bold text-neutral-900 dark:text-white line-clamp-1">
                            {item.name}
                          </h3>
                          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                            Phân loại: <span className="font-medium text-neutral-700 dark:text-neutral-300">{item.variant}</span> · SL: {item.quantity}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-xs font-bold font-mono text-neutral-900 dark:text-white">
                          {formatPrice(item.price * item.quantity)}
                        </div>
                        {item.stockStatus === 'preorder' && (
                          <span className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold">
                            Đặt trước
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Footer: Total & Actions */}
                <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="text-xs text-neutral-500">
                      Hình thức: <span className="font-medium uppercase text-neutral-700 dark:text-neutral-300">{order.paymentMethod}</span>
                    </div>
                    <div className="text-sm font-bold text-neutral-900 dark:text-white mt-0.5">
                      Tổng thanh toán: <span className="text-base font-extrabold">{formatPrice(order.totalAmount)}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* View Details Link */}
                    <Link
                      href={`/orders/${order.id}`}
                      className="px-3.5 py-2 text-xs font-semibold text-neutral-700 dark:text-neutral-300 bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 border border-neutral-200 dark:border-neutral-700 rounded-xl transition-colors"
                    >
                      Chi tiết đơn →
                    </Link>

                    {/* Re-order Button */}
                    <button
                      type="button"
                      onClick={() => handleReorder(order)}
                      className="px-3.5 py-2 text-xs font-semibold text-neutral-700 dark:text-neutral-300 bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 border border-neutral-200 dark:border-neutral-700 rounded-xl transition-colors"
                    >
                      Mua lại
                    </button>

                    {/* Retry Payment Button if Unpaid */}
                    {isUnpaid && (
                      <button
                        type="button"
                        onClick={() => setSelectedRepayOrder(order)}
                        className="px-3.5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 rounded-xl transition-colors shadow-xs active:scale-95"
                      >
                        Thanh toán lại
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Repay Modal */}
      {selectedRepayOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-[#111214] border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                  Thanh toán lại đơn hàng
                </h3>
                <p className="text-xs font-mono text-neutral-500 mt-0.5">
                  #{selectedRepayOrder.orderNumber}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedRepayOrder(null);
                  setRepaySuccessMsg(null);
                }}
                className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                ✕
              </button>
            </div>

            <div className="p-4 bg-neutral-50 dark:bg-neutral-900/60 rounded-2xl space-y-1">
              <div className="text-xs text-neutral-500">Số tiền cần thanh toán:</div>
              <div className="text-xl font-extrabold text-neutral-900 dark:text-white font-mono">
                {formatPrice(selectedRepayOrder.totalAmount)}
              </div>
            </div>

            {repaySuccessMsg ? (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-xs rounded-xl border border-emerald-200 dark:border-emerald-900">
                ✓ {repaySuccessMsg}
              </div>
            ) : (
              <form
                action={async (formData) => {
                  await repayFormAction(formData);
                  setRepaySuccessMsg('Đã khởi tạo yêu cầu thanh toán thành công! Đang chuyển hướng...');
                  setTimeout(() => {
                    router.push(`/orders/${selectedRepayOrder.id}`);
                  }, 1200);
                }}
                className="space-y-4"
              >
                <input type="hidden" name="orderId" value={selectedRepayOrder.id} />

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                    Chọn phương thức thanh toán:
                  </label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <label className="flex items-center gap-2 p-3 border border-neutral-200 dark:border-neutral-800 rounded-xl cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                      <input type="radio" name="paymentMethod" value="vnpay" defaultChecked className="accent-neutral-900 dark:accent-white" />
                      <span>VNPAY-QR</span>
                    </label>
                    <label className="flex items-center gap-2 p-3 border border-neutral-200 dark:border-neutral-800 rounded-xl cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                      <input type="radio" name="paymentMethod" value="momo" className="accent-neutral-900 dark:accent-white" />
                      <span>Ví MoMo</span>
                    </label>
                    <label className="flex items-center gap-2 p-3 border border-neutral-200 dark:border-neutral-800 rounded-xl cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                      <input type="radio" name="paymentMethod" value="cod" className="accent-neutral-900 dark:accent-white" />
                      <span>COD nhận hàng</span>
                    </label>
                    <label className="flex items-center gap-2 p-3 border border-neutral-200 dark:border-neutral-800 rounded-xl cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                      <input type="radio" name="paymentMethod" value="card" className="accent-neutral-900 dark:accent-white" />
                      <span>Thẻ Visa/Master</span>
                    </label>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => setSelectedRepayOrder(null)}
                    className="px-4 py-2 text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={isRepaying}
                    className="px-5 py-2 text-xs font-bold bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-xl hover:opacity-90 disabled:opacity-50"
                  >
                    {isRepaying ? 'Đang xử lý...' : 'Xác nhận thanh toán'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
