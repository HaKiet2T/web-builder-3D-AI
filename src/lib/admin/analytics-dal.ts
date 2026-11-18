import 'server-only';
import { listAdminProducts } from '@/lib/catalog/dal';
import { CATEGORY_RECORDS, PRODUCT_RECORDS } from '@/lib/catalog/sample-data';
import type { Category, Product } from '@/lib/catalog/types';
import { listAdminOrders } from '@/lib/orders/dal';
import { createServiceSupabaseClient } from '@/lib/supabase/service';
import type { Order } from '@/types/order';
import {
  CategoryRevenueShareSchema,
  DailyRevenuePointSchema,
  FulfillmentBottleneckSchema,
  FullSalesAnalyticsSchema,
  InventoryAlertSchema,
  PaymentMethodDistributionSchema,
  SalesOverviewSchema,
  TopProductItemSchema,
  type CategoryRevenueShare,
  type DailyRevenuePoint,
  type FulfillmentBottleneck,
  type FullSalesAnalytics,
  type InventoryAlert,
  type InventoryAlertLevel,
  type PaymentMethodDistribution,
  type SalesOverview,
  type SalesPeriod,
  type TopProductItem,
} from '@/lib/admin/analytics-schema';

export function parseReferenceDate(ref?: Date | string): Date {
  if (!ref) return new Date();
  if (typeof ref === 'string') {
    const parsed = new Date(ref);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  if (ref instanceof Date && !Number.isNaN(ref.getTime())) return ref;
  return new Date();
}

export function getDateRange(
  period: SalesPeriod,
  referenceDate: Date,
): { currentStart: Date; currentEnd: Date; prevStart: Date; prevEnd: Date } {
  const currentEnd = new Date(referenceDate);

  if (period === 'today') {
    const currentStart = new Date(referenceDate);
    currentStart.setHours(0, 0, 0, 0);
    const endOfDay = new Date(referenceDate);
    endOfDay.setHours(23, 59, 59, 999);

    const prevStart = new Date(currentStart);
    prevStart.setDate(prevStart.getDate() - 1);
    const prevEnd = new Date(endOfDay);
    prevEnd.setDate(prevEnd.getDate() - 1);

    return { currentStart, currentEnd: endOfDay, prevStart, prevEnd };
  }

  if (period === '7d' || period === '14d' || period === '30d') {
    const days = period === '7d' ? 7 : period === '14d' ? 14 : 30;
    const durationMs = days * 24 * 60 * 60 * 1000;
    const currentStart = new Date(currentEnd.getTime() - durationMs);
    const prevEnd = new Date(currentStart);
    const prevStart = new Date(prevEnd.getTime() - durationMs);

    return { currentStart, currentEnd, prevStart, prevEnd };
  }

  if (period === 'this_month') {
    const currentStart = new Date(
      referenceDate.getFullYear(),
      referenceDate.getMonth(),
      1,
      0,
      0,
      0,
      0,
    );
    const prevStart = new Date(
      referenceDate.getFullYear(),
      referenceDate.getMonth() - 1,
      1,
      0,
      0,
      0,
      0,
    );

    const lastDayOfPrevMonth = new Date(
      referenceDate.getFullYear(),
      referenceDate.getMonth(),
      0,
    ).getDate();
    const prevDay = Math.min(referenceDate.getDate(), lastDayOfPrevMonth);
    const prevEnd = new Date(
      referenceDate.getFullYear(),
      referenceDate.getMonth() - 1,
      prevDay,
      referenceDate.getHours(),
      referenceDate.getMinutes(),
      referenceDate.getSeconds(),
      referenceDate.getMilliseconds(),
    );

    return { currentStart, currentEnd, prevStart, prevEnd };
  }

  if (period === 'last_month') {
    const currentStart = new Date(
      referenceDate.getFullYear(),
      referenceDate.getMonth() - 1,
      1,
      0,
      0,
      0,
      0,
    );
    const lastDayPrevMonth = new Date(
      referenceDate.getFullYear(),
      referenceDate.getMonth(),
      0,
      23,
      59,
      59,
      999,
    );
    const prevStart = new Date(
      referenceDate.getFullYear(),
      referenceDate.getMonth() - 2,
      1,
      0,
      0,
      0,
      0,
    );
    const prevEnd = new Date(
      referenceDate.getFullYear(),
      referenceDate.getMonth() - 1,
      0,
      23,
      59,
      59,
      999,
    );

    return { currentStart, currentEnd: lastDayPrevMonth, prevStart, prevEnd };
  }

  // period === 'all'
  return {
    currentStart: new Date(0),
    currentEnd,
    prevStart: new Date(0),
    prevEnd: new Date(0),
  };
}

function isOrderInWindow(order: Order, start: Date, end: Date): boolean {
  const time = new Date(order.createdAt).getTime();
  return time >= start.getTime() && time <= end.getTime();
}

export function calculateSalesOverview(
  orders: Order[],
  period: SalesPeriod = '7d',
  referenceDate?: Date | string,
): SalesOverview {
  const ref = parseReferenceDate(referenceDate);
  const range = getDateRange(period, ref);

  const currentOrders = orders.filter((o) =>
    isOrderInWindow(o, range.currentStart, range.currentEnd),
  );
  const prevOrders =
    period === 'all'
      ? []
      : orders.filter((o) => isOrderInWindow(o, range.prevStart, range.prevEnd));

  const isOrderPaid = (o: Order) =>
    o.paymentStatus === 'paid' && o.status !== 'cancelled' && o.status !== 'failed';

  const paidCurrentOrders = currentOrders.filter(isOrderPaid);
  const paidPrevOrders = prevOrders.filter(isOrderPaid);

  const totalRevenue = paidCurrentOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const previousPeriodRevenue = paidPrevOrders.reduce(
    (sum, o) => sum + (o.totalAmount || 0),
    0,
  );

  let revenueGrowthRate = 0;
  if (previousPeriodRevenue > 0) {
    revenueGrowthRate = Number(
      (((totalRevenue - previousPeriodRevenue) / previousPeriodRevenue) * 100).toFixed(1),
    );
  } else if (totalRevenue > 0) {
    revenueGrowthRate = 100;
  }

  const totalOrders = currentOrders.length;
  const paidOrdersCount = paidCurrentOrders.length;
  const averageOrderValue =
    paidOrdersCount > 0 ? Math.round(totalRevenue / paidOrdersCount) : 0;

  const cancelledOrdersCount = currentOrders.filter(
    (o) => o.status === 'cancelled' || o.status === 'failed',
  ).length;
  const cancellationRate =
    totalOrders > 0 ? Number(((cancelledOrdersCount / totalOrders) * 100).toFixed(1)) : 0;

  const pendingFulfillmentCount = currentOrders.filter(
    (o) =>
      o.status === 'processing' ||
      o.status === 'pending' ||
      o.status === 'paid' ||
      o.status === 'partially_fulfilled',
  ).length;

  const splitShipmentCount = currentOrders.filter((o) => Boolean(o.isSplitShipment)).length;
  const preorderOrdersCount = currentOrders.filter(
    (o) => Array.isArray(o.items) && o.items.some((item) => item.stockStatus === 'preorder'),
  ).length;
  const inStockOrdersCount = Math.max(0, totalOrders - preorderOrdersCount);

  const overview: SalesOverview = {
    totalRevenue,
    previousPeriodRevenue,
    revenueGrowthRate,
    totalOrders,
    paidOrdersCount,
    averageOrderValue,
    cancellationRate,
    pendingFulfillmentCount,
    splitShipmentCount,
    inStockOrdersCount,
    preorderOrdersCount,
  };

  SalesOverviewSchema.parse(overview);
  return overview;
}

export function calculateRevenueTrend(
  orders: Order[],
  days: number = 7,
  referenceDate?: Date | string,
): DailyRevenuePoint[] {
  const ref = parseReferenceDate(referenceDate);
  const safeDays = Math.max(1, Math.min(days, 90));
  const points: DailyRevenuePoint[] = [];

  for (let i = safeDays - 1; i >= 0; i--) {
    const target = new Date(ref);
    target.setDate(target.getDate() - i);
    const year = target.getFullYear();
    const month = String(target.getMonth() + 1).padStart(2, '0');
    const day = String(target.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    const dayOrders = orders.filter((o) => {
      const orderDate = new Date(o.createdAt);
      if (Number.isNaN(orderDate.getTime())) return false;
      const oYear = orderDate.getFullYear();
      const oMonth = String(orderDate.getMonth() + 1).padStart(2, '0');
      const oDay = String(orderDate.getDate()).padStart(2, '0');
      return `${oYear}-${oMonth}-${oDay}` === dateStr;
    });

    const dayPaid = dayOrders.filter(
      (o) => o.paymentStatus === 'paid' && o.status !== 'cancelled' && o.status !== 'failed',
    );
    const revenue = dayPaid.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

    const point: DailyRevenuePoint = {
      date: dateStr,
      revenue,
      orderCount: dayOrders.length,
      paidCount: dayPaid.length,
    };
    DailyRevenuePointSchema.parse(point);
    points.push(point);
  }

  return points;
}

export function calculateCategoryShare(
  orders: Order[],
  products: Product[] = PRODUCT_RECORDS,
  categories: Category[] = CATEGORY_RECORDS,
): CategoryRevenueShare[] {
  const productMap = new Map<string, Product>();
  for (const p of products) {
    productMap.set(p.id, p);
    productMap.set(p.slug, p);
  }

  const categoryMap = new Map<string, string>();
  for (const c of categories) {
    categoryMap.set(c.id, c.name);
    categoryMap.set(c.slug, c.name);
  }

  const defaultCategoryNames: Record<string, string> = {
    monitor: 'Màn hình',
    speaker: 'Loa',
    mouse: 'Chuột',
    keyboard: 'Bàn phím cơ',
    'monitor-led': 'Đèn treo màn hình',
    'desk-setup': 'Bàn ghế & Setup',
    other: 'Khác',
  };

  const catStats = new Map<string, { revenue: number; itemsSold: number; name: string }>();

  const paidOrders = orders.filter(
    (o) => o.paymentStatus === 'paid' && o.status !== 'cancelled' && o.status !== 'failed',
  );

  for (const order of paidOrders) {
    if (!Array.isArray(order.items)) continue;
    for (const item of order.items) {
      const product = productMap.get(item.productId);
      const categoryId = product?.categoryId || 'other';
      const categoryName =
        categoryMap.get(categoryId) || defaultCategoryNames[categoryId] || categoryId;

      const current = catStats.get(categoryId) || {
        revenue: 0,
        itemsSold: 0,
        name: categoryName,
      };

      current.revenue += (item.price || 0) * (item.quantity || 1);
      current.itemsSold += item.quantity || 1;
      catStats.set(categoryId, current);
    }
  }

  const totalRevenue = Array.from(catStats.values()).reduce((sum, c) => sum + c.revenue, 0);
  const result: CategoryRevenueShare[] = [];

  for (const [categoryId, data] of catStats.entries()) {
    const percentage =
      totalRevenue > 0 ? Number(((data.revenue / totalRevenue) * 100).toFixed(1)) : 0;
    const item: CategoryRevenueShare = {
      categoryId,
      categoryName: data.name,
      revenue: data.revenue,
      percentage,
      itemsSold: data.itemsSold,
    };
    CategoryRevenueShareSchema.parse(item);
    result.push(item);
  }

  result.sort((a, b) => b.revenue - a.revenue);
  return result;
}

export function calculatePaymentDistribution(orders: Order[]): PaymentMethodDistribution[] {
  const methodStats = new Map<string, { orderCount: number; totalAmount: number }>();

  for (const order of orders) {
    const rawMethod = (order.paymentMethod || 'cod').toLowerCase();
    const current = methodStats.get(rawMethod) || { orderCount: 0, totalAmount: 0 };
    current.orderCount += 1;
    current.totalAmount += order.totalAmount || 0;
    methodStats.set(rawMethod, current);
  }

  const totalOrders = orders.length;
  const labelMap: Record<string, string> = {
    vietqr: 'VietQR (Chuyển khoản tức thì)',
    cod: 'COD (Thanh toán khi nhận hàng)',
    banking: 'Chuyển khoản ngân hàng',
    card: 'Thẻ quốc tế (Visa/Mastercard)',
    momo: 'Ví điện tử MoMo',
    other: 'Phương thức khác',
  };

  const result: PaymentMethodDistribution[] = [];
  for (const [method, data] of methodStats.entries()) {
    const label = labelMap[method] || method.toUpperCase();
    const percentage =
      totalOrders > 0 ? Number(((data.orderCount / totalOrders) * 100).toFixed(1)) : 0;

    const item: PaymentMethodDistribution = {
      method,
      label,
      orderCount: data.orderCount,
      totalAmount: data.totalAmount,
      percentage,
    };
    PaymentMethodDistributionSchema.parse(item);
    result.push(item);
  }

  result.sort((a, b) => b.orderCount - a.orderCount);
  return result;
}

export function calculateInventoryAlerts(
  products: Product[] = PRODUCT_RECORDS,
  categories: Category[] = CATEGORY_RECORDS,
  threshold: number = 5,
): InventoryAlert[] {
  const categoryMap = new Map<string, string>();
  for (const c of categories) categoryMap.set(c.id, c.name);

  const alerts: InventoryAlert[] = [];

  for (const product of products) {
    const categoryName = categoryMap.get(product.categoryId) || 'Khác';
    if (!Array.isArray(product.variants)) continue;

    for (const variant of product.variants) {
      let alertLevel: InventoryAlertLevel | null = null;

      if (variant.stockQuantity <= 0 || variant.stockStatus === 'out-of-stock') {
        alertLevel = 'critical';
      } else if (variant.stockStatus === 'preorder') {
        alertLevel = 'preorder';
      } else if (variant.stockQuantity <= threshold) {
        alertLevel = 'warning';
      }

      if (alertLevel) {
        const item: InventoryAlert = {
          productId: product.id,
          productName: product.name,
          variantId: variant.id,
          variantName: variant.name,
          sku: variant.sku,
          categoryName,
          stockQuantity: variant.stockQuantity,
          stockStatus: variant.stockStatus,
          alertLevel,
        };
        InventoryAlertSchema.parse(item);
        alerts.push(item);
      }
    }
  }

  const priorityWeight: Record<InventoryAlertLevel, number> = {
    critical: 0,
    warning: 1,
    preorder: 2,
  };

  alerts.sort((a, b) => {
    const pDiff = priorityWeight[a.alertLevel] - priorityWeight[b.alertLevel];
    if (pDiff !== 0) return pDiff;
    return a.stockQuantity - b.stockQuantity;
  });

  return alerts;
}

export function calculateFulfillmentBottlenecks(
  orders: Order[],
  maxWaitingHours: number = 24,
  referenceDate?: Date | string,
): FulfillmentBottleneck[] {
  const ref = parseReferenceDate(referenceDate);
  const bottlenecks: FulfillmentBottleneck[] = [];

  for (const order of orders) {
    const isPending =
      (order.paymentStatus === 'paid' ||
        order.status === 'processing' ||
        order.status === 'pending' ||
        order.status === 'partially_fulfilled') &&
      order.status !== 'fulfilled' &&
      order.status !== 'cancelled' &&
      order.status !== 'failed';

    if (!isPending) continue;

    const createdTime = new Date(order.createdAt).getTime();
    if (Number.isNaN(createdTime)) continue;

    const diffMs = ref.getTime() - createdTime;
    const hoursWaiting = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60)));

    if (hoursWaiting >= maxWaitingHours) {
      const packageCount = Math.max(
        Array.isArray(order.fulfillments) ? order.fulfillments.length : 0,
        order.isSplitShipment ? 2 : 1,
      );

      const bottleneck: FulfillmentBottleneck = {
        orderId: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customer?.fullName || 'Khách vãng lai',
        orderStatus: order.status,
        paymentStatus: order.paymentStatus,
        createdAt: order.createdAt,
        hoursWaiting,
        isSplitShipment: Boolean(order.isSplitShipment),
        packageCount,
        totalAmount: order.totalAmount || 0,
      };
      FulfillmentBottleneckSchema.parse(bottleneck);
      bottlenecks.push(bottleneck);
    }
  }

  bottlenecks.sort((a, b) => b.hoursWaiting - a.hoursWaiting);
  return bottlenecks;
}

export async function fetchAnalyticsOrders(): Promise<Order[]> {
  try {
    return await listAdminOrders();
  } catch {
    try {
      const serviceClient = createServiceSupabaseClient();
      if (serviceClient) {
        const { data, error } = await serviceClient
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(data)) {
          return data as unknown as Order[];
        }
      }
    } catch {
      // Ignore fallback error
    }
  }
  return [];
}

export async function fetchAnalyticsProducts(): Promise<Product[]> {
  try {
    return await listAdminProducts();
  } catch {
    return PRODUCT_RECORDS;
  }
}

export async function getSalesOverview(
  period: SalesPeriod = '7d',
  referenceDate?: Date | string,
): Promise<SalesOverview> {
  const orders = await fetchAnalyticsOrders();
  return calculateSalesOverview(orders, period, referenceDate);
}

export async function getRevenueTrend(
  days: number = 7,
  referenceDate?: Date | string,
): Promise<DailyRevenuePoint[]> {
  const orders = await fetchAnalyticsOrders();
  return calculateRevenueTrend(orders, days, referenceDate);
}

export async function getCategoryRevenueShare(): Promise<CategoryRevenueShare[]> {
  const [orders, products] = await Promise.all([
    fetchAnalyticsOrders(),
    fetchAnalyticsProducts(),
  ]);
  return calculateCategoryShare(orders, products, CATEGORY_RECORDS);
}

export async function getPaymentMethodDistribution(): Promise<PaymentMethodDistribution[]> {
  const orders = await fetchAnalyticsOrders();
  return calculatePaymentDistribution(orders);
}

export async function getInventoryAlerts(threshold: number = 5): Promise<InventoryAlert[]> {
  const products = await fetchAnalyticsProducts();
  return calculateInventoryAlerts(products, CATEGORY_RECORDS, threshold);
}

export async function getFulfillmentBottlenecks(
  maxWaitingHours: number = 24,
  referenceDate?: Date | string,
): Promise<FulfillmentBottleneck[]> {
  const orders = await fetchAnalyticsOrders();
  return calculateFulfillmentBottlenecks(orders, maxWaitingHours, referenceDate);
}

export function calculateTopProducts(
  orders: Order[],
  products: Product[] = PRODUCT_RECORDS,
  categories: Category[] = CATEGORY_RECORDS,
  limit: number = 5,
  sortBy: 'revenue' | 'units_sold' = 'revenue',
): TopProductItem[] {
  const productMap = new Map<string, Product>();
  for (const p of products) {
    productMap.set(p.id, p);
    productMap.set(p.slug, p);
  }

  const categoryMap = new Map<string, string>();
  for (const c of categories) {
    categoryMap.set(c.id, c.name);
    categoryMap.set(c.slug, c.name);
  }

  const stats = new Map<
    string,
    { revenue: number; unitsSold: number; ordersCount: number; name: string; categoryName?: string }
  >();

  const paidOrders = orders.filter(
    (o) => o.paymentStatus === 'paid' && o.status !== 'cancelled' && o.status !== 'failed',
  );

  for (const order of paidOrders) {
    if (!Array.isArray(order.items)) continue;
    const seenProductIdsInOrder = new Set<string>();

    for (const item of order.items) {
      const product = productMap.get(item.productId);
      const name = product?.name || item.name || item.productId;
      const catId = product?.categoryId;
      const catName = catId ? (categoryMap.get(catId) || catId) : undefined;

      const current = stats.get(item.productId) || {
        revenue: 0,
        unitsSold: 0,
        ordersCount: 0,
        name,
        categoryName: catName,
      };

      current.revenue += (item.price || 0) * (item.quantity || 1);
      current.unitsSold += item.quantity || 1;
      if (!seenProductIdsInOrder.has(item.productId)) {
        current.ordersCount += 1;
        seenProductIdsInOrder.add(item.productId);
      }
      stats.set(item.productId, current);
    }
  }

  const items: TopProductItem[] = [];
  for (const [productId, data] of stats.entries()) {
    const item: TopProductItem = {
      productId,
      productName: data.name,
      categoryName: data.categoryName,
      revenue: data.revenue,
      unitsSold: data.unitsSold,
      ordersCount: data.ordersCount,
    };
    TopProductItemSchema.parse(item);
    items.push(item);
  }

  if (sortBy === 'units_sold') {
    items.sort((a, b) => b.unitsSold - a.unitsSold || b.revenue - a.revenue);
  } else {
    items.sort((a, b) => b.revenue - a.revenue || b.unitsSold - a.unitsSold);
  }

  return items.slice(0, Math.max(1, limit));
}

export async function getTopProducts(
  limit: number = 5,
  sortBy: 'revenue' | 'units_sold' = 'revenue',
): Promise<TopProductItem[]> {
  const [orders, products] = await Promise.all([
    fetchAnalyticsOrders(),
    fetchAnalyticsProducts(),
  ]);
  return calculateTopProducts(orders, products, CATEGORY_RECORDS, limit, sortBy);
}

export async function getFullSalesAnalytics(
  options: {
    period?: SalesPeriod;
    trendDays?: number;
    threshold?: number;
    maxWaitingHours?: number;
    referenceDate?: Date | string;
  } = {},
): Promise<FullSalesAnalytics> {
  const period = options.period ?? '7d';
  const trendDays = options.trendDays ?? 7;
  const threshold = options.threshold ?? 5;
  const maxWaitingHours = options.maxWaitingHours ?? 24;
  const ref = parseReferenceDate(options.referenceDate);

  const [orders, products] = await Promise.all([
    fetchAnalyticsOrders(),
    fetchAnalyticsProducts(),
  ]);

  const overview = calculateSalesOverview(orders, period, ref);
  const trend = calculateRevenueTrend(orders, trendDays, ref);
  const categoryShare = calculateCategoryShare(orders, products, CATEGORY_RECORDS);
  const paymentDistribution = calculatePaymentDistribution(orders);
  const inventoryAlerts = calculateInventoryAlerts(products, CATEGORY_RECORDS, threshold);
  const bottlenecks = calculateFulfillmentBottlenecks(orders, maxWaitingHours, ref);
  const topProducts = calculateTopProducts(orders, products, CATEGORY_RECORDS, 5);

  const analytics: FullSalesAnalytics = {
    period,
    generatedAt: ref.toISOString(),
    overview,
    trend,
    categoryShare,
    paymentDistribution,
    inventoryAlerts,
    bottlenecks,
    topProducts,
  };

  FullSalesAnalyticsSchema.parse(analytics);
  return analytics;
}
