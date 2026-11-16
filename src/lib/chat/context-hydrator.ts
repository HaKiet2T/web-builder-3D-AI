import 'server-only';
import { listProducts, listCategories } from '@/lib/catalog/dal';
import type { Category, Product, Variant } from '@/lib/catalog/types';
import { createServiceSupabaseClient } from '@/lib/supabase/service';
import type { OrderRow } from '@/lib/supabase/database.types';

export interface HydrateContextOptions {
  userId?: string | null;
  message?: string;
}

export interface SanitizedOrder {
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  totalAmount: number;
  createdAt: string;
  itemsSummary: string;
}

function sanitizeOrder(row: OrderRow): SanitizedOrder {
  let itemsSummary = '';
  if (Array.isArray(row.items)) {
    itemsSummary = (row.items as Array<{ name?: string; quantity?: number }>)
      .map((item) => `${item.name || 'Sản phẩm'} (x${item.quantity || 1})`)
      .join(', ');
  }

  return {
    orderNumber: row.order_number,
    status: row.status,
    paymentStatus: row.payment_status,
    paymentMethod: row.payment_method,
    totalAmount: row.total_amount,
    createdAt: row.created_at,
    itemsSummary: itemsSummary || 'Chi tiết đơn hàng',
  };
}

export async function hydrateChatContext(options: HydrateContextOptions = {}): Promise<string> {
  const parts: string[] = [];

  // 1. Safe Product & Catalog Context
  try {
    const [categories, products] = await Promise.all([listCategories(), listProducts()]);

    const categoryList = categories.map((c: Category) => `- ${c.name} (mã: ${c.id})`).join('\n');
    parts.push(`DANH MỤC SẢN PHẨM HIỆN CÓ:\n${categoryList}`);

    const productSummaries = products.slice(0, 10).map((p: Product) => {
      const minPrice = p.variants.reduce((min: number, v: Variant) => Math.min(min, v.price), Infinity);
      const priceStr = Number.isFinite(minPrice) ? `${minPrice.toLocaleString('vi-VN')} đ` : 'Liên hệ';
      const inStock = p.variants.some((v: Variant) => v.stockStatus === 'in-stock');
      const highlights = p.highlights?.slice(0, 3).join(', ') || '';

      return `- ${p.name} | Danh mục: ${p.categoryId} | Giá từ: ${priceStr} | Tình trạng: ${inStock ? 'Còn hàng' : 'Đặt trước'} | Điểm nổi bật: ${highlights}`;
    });

    parts.push(`MỘT SỐ SẢN PHẨM TIÊU BIỂU TẠI CỬA HÀNG:\n${productSummaries.join('\n')}`);
  } catch (err) {
    console.warn('[hydrateChatContext] Could not load catalogue context:', err);
  }

  // 2. Safe Order Context for Authenticated User
  if (options.userId) {
    try {
      const supabase = createServiceSupabaseClient();
      if (supabase) {
        const { data: userOrders } = await supabase
          .from('orders')
          .select('*')
          .eq('user_id', options.userId)
          .order('created_at', { ascending: false })
          .limit(5);

        if (userOrders && userOrders.length > 0) {
          const sanitized = userOrders.map(sanitizeOrder);
          const ordersText = sanitized
            .map(
              (o) =>
                `- Đơn #${o.orderNumber}: Trạng thái ${o.status}, Thanh toán ${o.paymentStatus} (${o.paymentMethod}), Tổng ${o.totalAmount.toLocaleString('vi-VN')} đ, Ngày đặt: ${o.createdAt.slice(0, 10)}. Sản phẩm: ${o.itemsSummary}`,
            )
            .join('\n');
          parts.push(`ĐƠN HÀNG GẦN ĐÂY CỦA KHÁCH HÀNG NÀY (ĐÃ ĐĂNG NHẬP):\n${ordersText}`);
        }
      }
    } catch (err) {
      console.warn('[hydrateChatContext] Could not load user orders context:', err);
    }
  }

  // 3. Order lookup by ORD code if mentioned in message
  if (options.message) {
    const orderMatch = options.message.match(/ORD-[A-Z0-9_-]+/i);
    if (orderMatch) {
      const orderCode = orderMatch[0].toUpperCase();
      try {
        const supabase = createServiceSupabaseClient();
        if (supabase) {
          const { data: foundOrder } = await supabase
            .from('orders')
            .select('*')
            .ilike('order_number', orderCode)
            .maybeSingle();

          if (foundOrder) {
            const sanitized = sanitizeOrder(foundOrder);
            parts.push(
              `THÔNG TIN ĐƠN HÀNG TRA CỨU [${orderCode}]:\n- Mã đơn: ${sanitized.orderNumber}\n- Trạng thái xử lý: ${sanitized.status}\n- Thanh toán: ${sanitized.paymentStatus} (Phương thức: ${sanitized.paymentMethod})\n- Tổng tiền: ${sanitized.totalAmount.toLocaleString('vi-VN')} đ\n- Sản phẩm: ${sanitized.itemsSummary}`,
            );
          }
        }
      } catch (err) {
        console.warn('[hydrateChatContext] Could not lookup order by code:', err);
      }
    }
  }

  return parts.join('\n\n');
}
