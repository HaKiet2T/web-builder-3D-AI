import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  calculateCategoryShare,
  calculateFulfillmentBottlenecks,
  calculateInventoryAlerts,
  calculatePaymentDistribution,
  calculateRevenueTrend,
  calculateSalesOverview,
  getDateRange,
  getFullSalesAnalytics,
  parseReferenceDate,
} from '../src/lib/admin/analytics-dal.ts';
import {
  CategoryRevenueShareSchema,
  DailyRevenuePointSchema,
  FulfillmentBottleneckSchema,
  FullSalesAnalyticsSchema,
  InventoryAlertSchema,
  PaymentMethodDistributionSchema,
  SalesOverviewSchema,
  SalesPeriodSchema,
} from '../src/lib/admin/analytics-schema.ts';
import type { Category, Product } from '../src/lib/catalog/types.ts';
import type { Order } from '../src/types/order.ts';

const REF_DATE_STR = '2026-11-17T18:57:53+07:00';
const REF_DATE = new Date(REF_DATE_STR);

function createMockOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: `ord_${Math.random().toString(36).slice(2, 9)}`,
    orderNumber: `HGK-${Math.floor(1000 + Math.random() * 9000)}`,
    customer: {
      fullName: 'Nguyễn Văn A',
      email: 'a@example.com',
      phone: '0901234567',
      address: '123 Phố Huế',
      city: 'Hà Nội',
    },
    items: [
      {
        id: 'item_1',
        productId: 'prd_rog_swift',
        name: 'ROG Swift Pro PG248QP',
        variant: 'Default',
        price: 25990000,
        quantity: 1,
        stockStatus: 'in-stock',
      },
    ],
    fulfillments: [
      {
        id: 'ful_1',
        orderId: 'ord_1',
        type: 'in-stock',
        status: 'pending',
        items: [],
        shippingFee: 0,
        estimatedDelivery: '2026-11-20',
        createdAt: REF_DATE_STR,
      },
    ],
    subtotal: 25990000,
    shippingTotal: 0,
    discountTotal: 0,
    totalAmount: 25990000,
    status: 'paid',
    paymentStatus: 'paid',
    paymentMethod: 'vietqr',
    isSplitShipment: false,
    createdAt: REF_DATE_STR,
    updatedAt: REF_DATE_STR,
    ...overrides,
  };
}

describe('Admin Sales Analytics DAL and Zod Schema (Giai đoạn 1)', () => {
  describe('Zod Schema Validation', () => {
    it('accepts valid sales periods and rejects invalid strings', () => {
      const validPeriods = ['today', '7d', '14d', '30d', 'this_month', 'last_month', 'all'];
      for (const p of validPeriods) {
        assert.equal(SalesPeriodSchema.parse(p), p);
      }
      assert.throws(() => SalesPeriodSchema.parse('yearly'));
      assert.throws(() => SalesPeriodSchema.parse(''));
    });

    it('validates SalesOverview schema structure and constraints', () => {
      const validOverview = {
        totalRevenue: 50000000,
        previousPeriodRevenue: 40000000,
        revenueGrowthRate: 25.0,
        totalOrders: 10,
        paidOrdersCount: 8,
        averageOrderValue: 6250000,
        cancellationRate: 10.0,
        pendingFulfillmentCount: 4,
        splitShipmentCount: 2,
        inStockOrdersCount: 8,
        preorderOrdersCount: 2,
      };
      assert.doesNotThrow(() => SalesOverviewSchema.parse(validOverview));

      // Rejects negative revenue
      assert.throws(() =>
        SalesOverviewSchema.parse({
          ...validOverview,
          totalRevenue: -1000,
        }),
      );

      // Rejects cancellation rate > 100
      assert.throws(() =>
        SalesOverviewSchema.parse({
          ...validOverview,
          cancellationRate: 150,
        }),
      );
    });

    it('validates DailyRevenuePoint, CategoryRevenueShare and PaymentDistribution schemas', () => {
      assert.doesNotThrow(() =>
        DailyRevenuePointSchema.parse({
          date: '2026-11-17',
          revenue: 15000000,
          orderCount: 3,
          paidCount: 2,
        }),
      );

      assert.throws(() =>
        DailyRevenuePointSchema.parse({
          date: '17-11-2026', // invalid date format
          revenue: 15000000,
          orderCount: 3,
          paidCount: 2,
        }),
      );

      assert.doesNotThrow(() =>
        CategoryRevenueShareSchema.parse({
          categoryId: 'monitor',
          categoryName: 'Màn hình',
          revenue: 45000000,
          percentage: 60.5,
          itemsSold: 2,
        }),
      );

      assert.doesNotThrow(() =>
        PaymentMethodDistributionSchema.parse({
          method: 'vietqr',
          label: 'VietQR (Chuyển khoản tức thì)',
          orderCount: 15,
          totalAmount: 90000000,
          percentage: 75.0,
        }),
      );
    });

    it('validates InventoryAlert and FulfillmentBottleneck schemas', () => {
      assert.doesNotThrow(() =>
        InventoryAlertSchema.parse({
          productId: 'prd_1',
          productName: 'ROG Strix Monitor',
          variantId: 'var_1',
          variantName: 'Black 310Hz',
          sku: 'ROG-310-BLK',
          categoryName: 'Màn hình',
          stockQuantity: 2,
          stockStatus: 'in-stock',
          alertLevel: 'warning',
        }),
      );

      assert.doesNotThrow(() =>
        FulfillmentBottleneckSchema.parse({
          orderId: 'ord_123',
          orderNumber: 'HGK-9999',
          customerName: 'Lê Văn B',
          orderStatus: 'processing',
          paymentStatus: 'paid',
          createdAt: REF_DATE_STR,
          hoursWaiting: 36,
          isSplitShipment: true,
          packageCount: 2,
          totalAmount: 18500000,
        }),
      );
    });
  });

  describe('Time Period Range Calculations', () => {
    it('computes exact day range boundaries for today', () => {
      const range = getDateRange('today', REF_DATE);
      assert.equal(range.currentStart.getHours(), 0);
      assert.equal(range.currentStart.getMinutes(), 0);
      assert.equal(range.currentEnd.getHours(), 23);
      assert.equal(range.currentEnd.getMinutes(), 59);

      // Previous period should be yesterday
      const yesterday = new Date(REF_DATE);
      yesterday.setDate(yesterday.getDate() - 1);
      assert.equal(range.prevStart.getDate(), yesterday.getDate());
    });

    it('computes rolling windows for 7d, 14d, and 30d', () => {
      const range7d = getDateRange('7d', REF_DATE);
      const diffDays7 =
        (range7d.currentEnd.getTime() - range7d.currentStart.getTime()) / (24 * 60 * 60 * 1000);
      assert.equal(Math.round(diffDays7), 7);

      const range30d = getDateRange('30d', REF_DATE);
      const diffDays30 =
        (range30d.currentEnd.getTime() - range30d.currentStart.getTime()) / (24 * 60 * 60 * 1000);
      assert.equal(Math.round(diffDays30), 30);
    });

    it('handles parseReferenceDate with string, date, and undefined safely', () => {
      const d1 = parseReferenceDate(REF_DATE_STR);
      assert.equal(d1.getFullYear(), 2026);

      const d2 = parseReferenceDate(new Date('2026-11-17T00:00:00Z'));
      assert.equal(d2.toISOString(), '2026-11-17T00:00:00.000Z');

      const d3 = parseReferenceDate(undefined);
      assert.ok(d3 instanceof Date && !Number.isNaN(d3.getTime()));
    });
  });

  describe('Sales Overview Metrics Engine', () => {
    it('returns zeroes and valid schema when orders array is empty', () => {
      const overview = calculateSalesOverview([], '7d', REF_DATE);
      assert.equal(overview.totalRevenue, 0);
      assert.equal(overview.previousPeriodRevenue, 0);
      assert.equal(overview.revenueGrowthRate, 0);
      assert.equal(overview.totalOrders, 0);
      assert.equal(overview.paidOrdersCount, 0);
      assert.equal(overview.averageOrderValue, 0);
      assert.equal(overview.cancellationRate, 0);
      assert.equal(overview.pendingFulfillmentCount, 0);
      assert.doesNotThrow(() => SalesOverviewSchema.parse(overview));
    });

    it('strictly counts only paid and non-cancelled orders for totalRevenue', () => {
      const orders = [
        createMockOrder({ totalAmount: 10000000, paymentStatus: 'paid', status: 'paid' }),
        createMockOrder({
          totalAmount: 5000000,
          paymentStatus: 'pending',
          status: 'pending',
        }),
        createMockOrder({
          totalAmount: 8000000,
          paymentStatus: 'paid',
          status: 'cancelled',
        }), // Cancelled should be excluded
        createMockOrder({ totalAmount: 6000000, paymentStatus: 'failed', status: 'failed' }),
      ];

      const overview = calculateSalesOverview(orders, '7d', REF_DATE);
      assert.equal(overview.totalRevenue, 10000000);
      assert.equal(overview.totalOrders, 4);
      assert.equal(overview.paidOrdersCount, 1);
      assert.equal(overview.averageOrderValue, 10000000);
      assert.equal(overview.cancellationRate, 50.0); // 2 out of 4 (cancelled + failed)
    });

    it('calculates positive, negative, and baseline revenue growth rates', () => {
      const nowMs = REF_DATE.getTime();
      const currentOrder = createMockOrder({
        totalAmount: 30000000,
        paymentStatus: 'paid',
        status: 'paid',
        createdAt: new Date(nowMs - 2 * 24 * 60 * 60 * 1000).toISOString(),
      });
      const prevOrder = createMockOrder({
        totalAmount: 20000000,
        paymentStatus: 'paid',
        status: 'paid',
        createdAt: new Date(nowMs - 10 * 24 * 60 * 60 * 1000).toISOString(),
      });

      // Current: 30M, Previous: 20M -> +50%
      const overviewGrowth = calculateSalesOverview([currentOrder, prevOrder], '7d', REF_DATE);
      assert.equal(overviewGrowth.totalRevenue, 30000000);
      assert.equal(overviewGrowth.previousPeriodRevenue, 20000000);
      assert.equal(overviewGrowth.revenueGrowthRate, 50.0);

      // Previous 20M, Current 0M -> -100%
      const overviewDrop = calculateSalesOverview([prevOrder], '7d', REF_DATE);
      assert.equal(overviewDrop.totalRevenue, 0);
      assert.equal(overviewDrop.previousPeriodRevenue, 20000000);
      assert.equal(overviewDrop.revenueGrowthRate, -100.0);

      // Current 30M, Previous 0M -> +100%
      const overviewNew = calculateSalesOverview([currentOrder], '7d', REF_DATE);
      assert.equal(overviewNew.previousPeriodRevenue, 0);
      assert.equal(overviewNew.revenueGrowthRate, 100.0);
    });

    it('accurately tracks split shipments, preorder, and in-stock counts', () => {
      const orders = [
        createMockOrder({
          isSplitShipment: true,
          items: [
            {
              id: '1',
              productId: 'p1',
              name: 'In stock item',
              variant: 'V1',
              price: 1000000,
              quantity: 1,
              stockStatus: 'in-stock',
            },
            {
              id: '2',
              productId: 'p2',
              name: 'Preorder item',
              variant: 'V2',
              price: 2000000,
              quantity: 1,
              stockStatus: 'preorder',
            },
          ],
        }),
        createMockOrder({
          isSplitShipment: false,
          items: [
            {
              id: '3',
              productId: 'p1',
              name: 'In stock item',
              variant: 'V1',
              price: 1000000,
              quantity: 2,
              stockStatus: 'in-stock',
            },
          ],
        }),
      ];

      const overview = calculateSalesOverview(orders, '7d', REF_DATE);
      assert.equal(overview.splitShipmentCount, 1);
      assert.equal(overview.preorderOrdersCount, 1);
      assert.equal(overview.inStockOrdersCount, 1);
      assert.equal(overview.totalOrders, 2);
    });
  });

  describe('Revenue Trend Time-Series Generation', () => {
    it('generates exact number of points in ascending chronological order', () => {
      const points = calculateRevenueTrend([], 7, REF_DATE);
      assert.equal(points.length, 7);
      for (let i = 0; i < points.length - 1; i++) {
        assert.ok(points[i].date < points[i + 1].date);
      }
    });

    it('aggregates daily revenues and order counts on matching dates', () => {
      const todayIso = REF_DATE.toISOString();
      const yesterday = new Date(REF_DATE);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayIso = yesterday.toISOString();

      const orders = [
        createMockOrder({
          totalAmount: 15000000,
          paymentStatus: 'paid',
          status: 'paid',
          createdAt: todayIso,
        }),
        createMockOrder({
          totalAmount: 10000000,
          paymentStatus: 'paid',
          status: 'paid',
          createdAt: todayIso,
        }),
        createMockOrder({
          totalAmount: 5000000,
          paymentStatus: 'pending',
          status: 'pending',
          createdAt: todayIso,
        }),
        createMockOrder({
          totalAmount: 20000000,
          paymentStatus: 'paid',
          status: 'paid',
          createdAt: yesterdayIso,
        }),
      ];

      const trend = calculateRevenueTrend(orders, 7, REF_DATE);
      const lastPoint = trend[trend.length - 1]; // today
      const prevPoint = trend[trend.length - 2]; // yesterday

      assert.equal(lastPoint.revenue, 25000000);
      assert.equal(lastPoint.orderCount, 3);
      assert.equal(lastPoint.paidCount, 2);

      assert.equal(prevPoint.revenue, 20000000);
      assert.equal(prevPoint.orderCount, 1);
      assert.equal(prevPoint.paidCount, 1);
    });
  });

  describe('Category Revenue Share Analysis', () => {
    it('aggregates revenue by category and calculates descending percentage', () => {
      const mockProducts: Product[] = [
        {
          id: 'prd_monitor',
          slug: 'rog-monitor',
          name: 'Màn hình ROG',
          categoryId: 'monitor',
          summary: '',
          description: '',
          highlights: [],
          brand: 'ASUS',
          sourceUrl: null,
          priceFrom: 30000000,
          purchasable: true,
          createdAt: REF_DATE_STR,
          variants: [],
          media: [],
        },
        {
          id: 'prd_keyboard',
          slug: 'fl-keyboard',
          name: 'Bàn phím cơ FL-Esports',
          categoryId: 'keyboard',
          summary: '',
          description: '',
          highlights: [],
          brand: 'FL-Esports',
          sourceUrl: null,
          priceFrom: 5000000,
          purchasable: true,
          createdAt: REF_DATE_STR,
          variants: [],
          media: [],
        },
      ];

      const mockCategories: Category[] = [
        { id: 'monitor', slug: 'monitor', name: 'Màn hình', description: '', position: 1 },
        { id: 'keyboard', slug: 'keyboard', name: 'Bàn phím cơ', description: '', position: 2 },
      ];

      const orders = [
        createMockOrder({
          paymentStatus: 'paid',
          status: 'paid',
          items: [
            {
              id: '1',
              productId: 'prd_monitor',
              name: 'Màn hình ROG',
              variant: 'Default',
              price: 30000000,
              quantity: 1,
              stockStatus: 'in-stock',
            },
            {
              id: '2',
              productId: 'prd_keyboard',
              name: 'Bàn phím cơ',
              variant: 'White',
              price: 5000000,
              quantity: 2,
              stockStatus: 'in-stock',
            },
          ],
        }),
      ];

      const shares = calculateCategoryShare(orders, mockProducts, mockCategories);
      assert.equal(shares.length, 2);
      // Total revenue = 30M + 10M = 40M
      // Monitor = 30M (75%), Keyboard = 10M (25%)
      assert.equal(shares[0].categoryId, 'monitor');
      assert.equal(shares[0].revenue, 30000000);
      assert.equal(shares[0].percentage, 75.0);
      assert.equal(shares[0].itemsSold, 1);

      assert.equal(shares[1].categoryId, 'keyboard');
      assert.equal(shares[1].revenue, 10000000);
      assert.equal(shares[1].percentage, 25.0);
      assert.equal(shares[1].itemsSold, 2);
    });
  });

  describe('Payment Method Distribution', () => {
    it('groups orders by payment method and formats standard Vietnamese labels', () => {
      const orders = [
        createMockOrder({ paymentMethod: 'vietqr', totalAmount: 20000000 }),
        createMockOrder({ paymentMethod: 'vietqr', totalAmount: 15000000 }),
        createMockOrder({ paymentMethod: 'cod', totalAmount: 5000000 }),
      ];

      const dist = calculatePaymentDistribution(orders);
      assert.equal(dist.length, 2);
      assert.equal(dist[0].method, 'vietqr');
      assert.equal(dist[0].label, 'VietQR (Chuyển khoản tức thì)');
      assert.equal(dist[0].orderCount, 2);
      assert.equal(dist[0].totalAmount, 35000000);
      assert.equal(dist[0].percentage, 66.7);

      assert.equal(dist[1].method, 'cod');
      assert.equal(dist[1].orderCount, 1);
      assert.equal(dist[1].totalAmount, 5000000);
      assert.equal(dist[1].percentage, 33.3);
    });
  });

  describe('Inventory Alerts Engine', () => {
    it('correctly categorizes critical, preorder, and warning inventory levels', () => {
      const testProducts: Product[] = [
        {
          id: 'prd_1',
          slug: 'prd-1',
          name: 'Sản phẩm thử nghiệm',
          categoryId: 'monitor',
          summary: '',
          description: '',
          highlights: [],
          brand: 'ASUS',
          sourceUrl: null,
          priceFrom: 1000000,
          purchasable: true,
          createdAt: REF_DATE_STR,
          variants: [
            {
              id: 'v_out',
              productId: 'prd_1',
              slug: 'out',
              name: 'Hết hàng',
              sku: 'SKU-OUT',
              price: 1000000,
              compareAtPrice: null,
              stockStatus: 'out-of-stock',
              stockQuantity: 0,
              options: {},
            },
            {
              id: 'v_pre',
              productId: 'prd_1',
              slug: 'pre',
              name: 'Hàng đặt trước',
              sku: 'SKU-PRE',
              price: 2000000,
              compareAtPrice: null,
              stockStatus: 'preorder',
              stockQuantity: 10,
              options: {},
            },
            {
              id: 'v_warn',
              productId: 'prd_1',
              slug: 'warn',
              name: 'Sắp hết hàng',
              sku: 'SKU-WARN',
              price: 3000000,
              compareAtPrice: null,
              stockStatus: 'in-stock',
              stockQuantity: 3,
              options: {},
            },
            {
              id: 'v_safe',
              productId: 'prd_1',
              slug: 'safe',
              name: 'Kho an toàn',
              sku: 'SKU-SAFE',
              price: 4000000,
              compareAtPrice: null,
              stockStatus: 'in-stock',
              stockQuantity: 50,
              options: {},
            },
          ],
          media: [],
        },
      ];

      const alerts = calculateInventoryAlerts(testProducts, [], 5);
      assert.equal(alerts.length, 3); // out, pre, warn (safe is excluded)
      assert.equal(alerts[0].alertLevel, 'critical');
      assert.equal(alerts[0].sku, 'SKU-OUT');

      assert.equal(alerts[1].alertLevel, 'warning');
      assert.equal(alerts[1].sku, 'SKU-WARN');

      assert.equal(alerts[2].alertLevel, 'preorder');
      assert.equal(alerts[2].sku, 'SKU-PRE');
    });
  });

  describe('Fulfillment Bottlenecks Detection', () => {
    it('detects orders waiting beyond threshold and calculates waiting hours', () => {
      const nowMs = REF_DATE.getTime();
      const waiting30h = new Date(nowMs - 30 * 60 * 60 * 1000).toISOString();
      const waiting10h = new Date(nowMs - 10 * 60 * 60 * 1000).toISOString();

      const orders = [
        createMockOrder({
          id: 'ord_stuck',
          orderNumber: 'HGK-STUCK',
          status: 'paid',
          paymentStatus: 'paid',
          createdAt: waiting30h,
          isSplitShipment: true,
        }),
        createMockOrder({
          id: 'ord_fresh',
          orderNumber: 'HGK-FRESH',
          status: 'paid',
          paymentStatus: 'paid',
          createdAt: waiting10h,
        }),
        createMockOrder({
          id: 'ord_done',
          orderNumber: 'HGK-DONE',
          status: 'fulfilled', // Fulfilled should be ignored
          paymentStatus: 'paid',
          createdAt: waiting30h,
        }),
      ];

      const bottlenecks = calculateFulfillmentBottlenecks(orders, 24, REF_DATE);
      assert.equal(bottlenecks.length, 1);
      assert.equal(bottlenecks[0].orderNumber, 'HGK-STUCK');
      assert.equal(bottlenecks[0].hoursWaiting, 30);
      assert.equal(bottlenecks[0].isSplitShipment, true);
      assert.equal(bottlenecks[0].packageCount, 2);
    });
  });

  describe('Consolidated Full Analytics Retrieval', () => {
    it('runs getFullSalesAnalytics and returns complete validated schema', async () => {
      const analytics = await getFullSalesAnalytics({
        period: '7d',
        referenceDate: REF_DATE,
      });

      assert.doesNotThrow(() => FullSalesAnalyticsSchema.parse(analytics));
      assert.equal(analytics.period, '7d');
      assert.ok(Array.isArray(analytics.trend));
      assert.equal(analytics.trend.length, 7);
      assert.ok(Array.isArray(analytics.categoryShare));
      assert.ok(Array.isArray(analytics.paymentDistribution));
      assert.ok(Array.isArray(analytics.inventoryAlerts));
      assert.ok(Array.isArray(analytics.bottlenecks));
    });
  });
});
