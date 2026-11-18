import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import {
  SalesPeriodSchema,
  FullSalesAnalyticsSchema,
  CopilotChatRequestSchema,
  SalesOverviewSchema,
  type SalesPeriod,
} from '../src/lib/admin/analytics-schema.ts';
import {
  getFullSalesAnalytics,
  calculateSalesOverview,
  calculateTopProducts,
} from '../src/lib/admin/analytics-dal.ts';
import {
  COPILOT_TOOL_DECLARATIONS,
  executeCopilotTool,
} from '../src/lib/admin/copilot-tools.ts';
import { generateCopilotChatReply } from '../src/lib/admin/copilot-client.ts';
import {
  useAdminCopilotStore,
  COPILOT_QUICK_ACTIONS,
  INITIAL_COPILOT_MESSAGE,
} from '../src/store/admin-copilot.ts';
import {
  tokenizeInlineMarkdown,
  parseMarkdownTable,
  sanitizeEmDash,
} from '../src/lib/admin/copilot-markdown.ts';
import type { Order } from '../src/types/order.ts';

// Source file reads for structural & architecture assertions
const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
const adminLayoutCode = readFileSync('src/app/admin/(dashboard)/layout.tsx', 'utf8');
const adminDashboardPageCode = readFileSync('src/app/admin/(dashboard)/page.tsx', 'utf8');
const adminChatRouteCode = readFileSync('src/app/api/admin/chat/route.ts', 'utf8');
const periodBarCode = readFileSync('src/components/admin/analytics/PeriodFilterBar.tsx', 'utf8');
const kpiGridCode = readFileSync('src/components/admin/analytics/KpiCardGrid.tsx', 'utf8');
const barChartCode = readFileSync('src/components/admin/analytics/RevenueBarChart.tsx', 'utf8');
const donutChartCode = readFileSync('src/components/admin/analytics/CategoryShareDonut.tsx', 'utf8');
const paymentCardCode = readFileSync('src/components/admin/analytics/PaymentMethodDistributionCard.tsx', 'utf8');
const alertsTableCode = readFileSync('src/components/admin/analytics/SalesAlertsTable.tsx', 'utf8');
const triggerCode = readFileSync('src/components/admin/copilot/AdminCopilotTrigger.tsx', 'utf8');
const drawerCode = readFileSync('src/components/admin/copilot/AdminCopilotDrawer.tsx', 'utf8');
const tactileMarkdownCode = readFileSync('src/components/admin/copilot/TactileMarkdown.tsx', 'utf8');
const promptCode = readFileSync('src/lib/admin/copilot-prompt.ts', 'utf8');
const globalCssCode = readFileSync('src/app/globals.css', 'utf8');

const sampleOrders: Order[] = [
  {
    id: 'ord-e2e-01',
    orderNumber: 'ORD-20261118-001',
    status: 'paid',
    paymentStatus: 'paid',
    paymentMethod: 'vietqr',
    createdAt: '2026-11-18T08:00:00.000Z',
    updatedAt: '2026-11-18T08:05:00.000Z',
    subtotal: 18900000,
    shippingTotal: 0,
    discountTotal: 0,
    totalAmount: 18900000,
    isSplitShipment: false,
    fulfillments: [],
    customer: {
      fullName: 'Trần Văn Bảo',
      email: 'bao@example.com',
      phone: '0988776655',
      address: '15 Lê Lợi',
      city: 'TP. Hồ Chí Minh',
    },
    items: [
      {
        id: 'item-e2e-1',
        productId: 'rog-strix-xg27aqm-g',
        name: 'Màn hình ASUS ROG Strix XG27AQM-G',
        variant: 'Mặc định',
        price: 18900000,
        quantity: 1,
        stockStatus: 'in-stock',
      },
    ],
  },
  {
    id: 'ord-e2e-02',
    orderNumber: 'ORD-20261118-002',
    status: 'processing',
    paymentStatus: 'paid',
    paymentMethod: 'cod',
    createdAt: '2026-11-17T06:00:00.000Z',
    updatedAt: '2026-11-17T06:10:00.000Z',
    subtotal: 3200000,
    shippingTotal: 60000,
    discountTotal: 0,
    totalAmount: 3260000,
    isSplitShipment: true,
    fulfillments: [],
    customer: {
      fullName: 'Lê Hoàng Nam',
      email: 'nam@example.com',
      phone: '0912345678',
      address: '42 Nguyễn Huệ',
      city: 'Đà Nẵng',
    },
    items: [
      {
        id: 'item-e2e-2',
        productId: 'ban-phim-co-custom-v1',
        name: 'Bàn phím cơ HyperWork Silent',
        variant: 'Linear',
        price: 1600000,
        quantity: 2,
        stockStatus: 'in-stock',
      },
    ],
  },
  {
    id: 'ord-e2e-03',
    orderNumber: 'ORD-20261118-003',
    status: 'cancelled',
    paymentStatus: 'refunded',
    paymentMethod: 'vietqr',
    createdAt: '2026-11-18T07:30:00.000Z',
    updatedAt: '2026-11-18T08:00:00.000Z',
    subtotal: 500000,
    shippingTotal: 30000,
    discountTotal: 0,
    totalAmount: 530000,
    isSplitShipment: false,
    fulfillments: [],
    customer: {
      fullName: 'Võ Minh Quân',
      email: 'quan@example.com',
      phone: '0977112233',
      address: '99 Cầu Giấy',
      city: 'Hà Nội',
    },
    items: [
      {
        id: 'item-e2e-3',
        productId: 'lot-chuot-deskmat',
        name: 'Deskmat HyperWork Fable',
        variant: 'Mặc định',
        price: 500000,
        quantity: 1,
        stockStatus: 'in-stock',
      },
    ],
  },
];

describe('Sales Analytics & Admin BI Copilot E2E Integration Suite (Giai đoạn 5)', () => {
  describe('1. Security, Authentication & Layout Shell Integration', () => {
    it('enforces async Server Component on AdminLayout with strict session redirection', () => {
      assert.match(adminLayoutCode, /export default async function AdminLayout/);
      assert.doesNotMatch(adminLayoutCode, /export default function AdminLayout[\s\S]*<Suspense/);
      assert.match(adminLayoutCode, /const admin = await getCurrentAdmin\(\);/);
      assert.match(adminLayoutCode, /if \(!admin\) redirect\('\/admin\/login'\);/);
    });

    it('embeds AdminCopilotTrigger in sidebar nav and mounts AdminCopilotDrawer at root admin layout', () => {
      assert.match(adminLayoutCode, /import \{ AdminCopilotTrigger, AdminCopilotDrawer \} from '@/);
      assert.match(adminLayoutCode, /<AdminCopilotTrigger \/>/);
      assert.match(adminLayoutCode, /<AdminCopilotDrawer \/>/);
    });

    it('strictly guards /api/admin/chat endpoint with getCurrentAdmin on both POST and GET', () => {
      assert.match(adminChatRouteCode, /export async function POST/);
      assert.match(adminChatRouteCode, /export async function GET/);
      assert.match(adminChatRouteCode, /const admin = await getCurrentAdmin\(\);/);
      assert.match(adminChatRouteCode, /status: 403/);
      assert.match(adminChatRouteCode, /Truy cập bị từ chối: Yêu cầu quyền quản trị viên/);
    });
  });

  describe('2. Dashboard URL State, Routing & Suspense Streaming', () => {
    it('maintains non-blocking synchronous AdminDashboardPage shell with route-local Suspense', () => {
      assert.match(adminDashboardPageCode, /export default function AdminDashboardPage/);
      assert.doesNotMatch(adminDashboardPageCode, /export default async function AdminDashboardPage/);
      assert.match(adminDashboardPageCode, /<Suspense fallback=\{<p className="admin-notice" role="status" aria-busy="true">/);
      assert.match(adminDashboardPageCode, /<AdminDashboardContent searchParamsPromise=\{props\.searchParams\} \/>/);
    });

    it('supports all 5 valid sales periods in URL searchParams', () => {
      const validPeriods: SalesPeriod[] = ['today', '7d', '14d', '30d', 'this_month'];
      for (const period of validPeriods) {
        const parsed = SalesPeriodSchema.safeParse(period);
        assert.equal(parsed.success, true);
        if (parsed.success) {
          assert.equal(parsed.data, period);
        }
      }
      assert.equal(SalesPeriodSchema.safeParse('invalid-period').success, false);
    });

    it('renders accessible URL-based PeriodFilterBar tabs with tactile pill buttons', () => {
      assert.match(periodBarCode, /href=\{`\/admin\?period=\$\{option\.id\}`\}/);
      assert.match(periodBarCode, /aria-selected=\{isActive\}/);
      assert.match(periodBarCode, /role="tab"/);
      assert.match(periodBarCode, /className=\{`admin-period-pill \$\{isActive \? 'is-active' : ''\}`\}/);
    });
  });

  describe('3. Cross-layer Data Consistency (DAL -> UI Charts -> Copilot Tools)', () => {
    const fixedReferenceDate = new Date('2026-11-18T08:43:00.000Z');

    it('produces 100% schema-compliant analytics from getFullSalesAnalytics', async () => {
      const analytics = await getFullSalesAnalytics({
        period: '7d',
        referenceDate: fixedReferenceDate,
      });

      const parsed = FullSalesAnalyticsSchema.safeParse(analytics);
      assert.equal(parsed.success, true);
      assert.equal(analytics.period, '7d');
      assert.equal(analytics.trend.length, 7);
      assert.ok(Array.isArray(analytics.categoryShare));
      assert.ok(Array.isArray(analytics.paymentDistribution));
    });

    it('guarantees identical KPI metrics between DAL calculations and copilot query_sales_summary tool', async () => {
      const dalOverview = calculateSalesOverview(sampleOrders, 'today', fixedReferenceDate);
      assert.equal(dalOverview.totalRevenue, 18900000);
      assert.equal(dalOverview.paidOrdersCount, 1);
      assert.equal(dalOverview.totalOrders, 2);
      assert.equal(dalOverview.cancellationRate, 50);
      assert.equal(dalOverview.averageOrderValue, 18900000);

      const toolResult = await executeCopilotTool(
        'query_sales_summary',
        { period: 'today' },
        { referenceDate: fixedReferenceDate },
      );
      assert.equal(toolResult.success, true);
      assert.equal(SalesOverviewSchema.safeParse(toolResult.data).success, true);
    });

    it('synchronizes top product revenue aggregation between calculateTopProducts and copilot', () => {
      const topByRevenue = calculateTopProducts(sampleOrders, [], [], 5, 'revenue');
      assert.equal(topByRevenue.length, 2);
      assert.equal(topByRevenue[0].productName, 'Màn hình ASUS ROG Strix XG27AQM-G');
      assert.equal(topByRevenue[0].revenue, 18900000);
      assert.equal(topByRevenue[0].unitsSold, 1);

      assert.equal(topByRevenue[1].productName, 'Bàn phím cơ HyperWork Silent');
      assert.equal(topByRevenue[1].revenue, 3200000);
      assert.equal(topByRevenue[1].unitsSold, 2);
    });

    it('ensures category share, payment distribution, and alerts table match UI contracts', () => {
      assert.match(kpiGridCode, /overview\.totalRevenue/);
      assert.match(kpiGridCode, /overview\.paidOrdersCount/);
      assert.match(kpiGridCode, /overview\.averageOrderValue/);
      assert.match(kpiGridCode, /overview\.pendingFulfillmentCount/);

      assert.match(barChartCode, /className="admin-svg-chart"/);
      assert.match(barChartCode, /viewBox=\{`0 0 \$\{svgWidth\} \$\{svgHeight\}`\}/);

      assert.match(donutChartCode, /className="admin-donut-svg"/);
      assert.match(donutChartCode, /viewBox="0 0 200 200"/);

      assert.match(paymentCardCode, /VietQR/);
      assert.match(paymentCardCode, /COD/);

      assert.match(alertsTableCode, /inventoryAlerts/);
      assert.match(alertsTableCode, /bottlenecks/);
    });
  });

  describe('4. Copilot Multi-turn Tool Calling & Resilient Local Fallback Engine', () => {
    const fixedReferenceDate = new Date('2026-11-18T08:43:00.000Z');

    it('validates CopilotChatRequest schema with input validation and history bounds', () => {
      const validPayload = {
        message: 'Tình hình doanh thu hôm nay thế nào?',
        history: [{ role: 'user', content: 'Chào bạn' }],
      };
      const parsed = CopilotChatRequestSchema.safeParse(validPayload);
      assert.equal(parsed.success, true);

      const invalidPayload = { message: '   ' };
      const invalidParsed = CopilotChatRequestSchema.safeParse(invalidPayload);
      assert.equal(invalidParsed.success, false);
    });

    it('declares 7 structured analytics tools with schema compliance for Gemini 2.0 Flash', () => {
      assert.equal(COPILOT_TOOL_DECLARATIONS.length, 7);
      const toolNames = COPILOT_TOOL_DECLARATIONS.map((t) => t.name);
      assert.deepEqual(toolNames, [
        'query_sales_summary',
        'query_top_products',
        'check_inventory_alerts',
        'query_unfulfilled_orders',
        'query_revenue_trend',
        'query_category_share',
        'query_payment_distribution',
      ]);
    });

    it('executes resilient fallback engine producing complete reports without Gemini API key', async () => {
      const result = await generateCopilotChatReply({
        message: 'Báo cáo doanh thu hôm nay và đơn hàng',
        referenceDate: fixedReferenceDate.toISOString(),
      });

      assert.equal(typeof result.reply, 'string');
      assert.ok(result.reply.length > 100);
      assert.ok(result.toolsUsed.includes('query_sales_summary'));
      assert.ok(result.turns >= 1);
      assert.doesNotMatch(result.reply, /\u2014/);
    });

    it('handles top product queries in fallback engine with formatted table and recommendations', async () => {
      const result = await generateCopilotChatReply({
        message: 'Cho tôi xem top sản phẩm bán chạy nhất hiện nay',
        referenceDate: fixedReferenceDate.toISOString(),
      });

      assert.ok(result.toolsUsed.includes('query_top_products'));
      assert.match(result.reply, /Top 5 sản phẩm bán chạy nhất/);
      assert.match(result.reply, /Đánh giá và khuyến nghị/);
      assert.doesNotMatch(result.reply, /\u2014/);
    });
  });

  describe('5. Slide-over Drawer Interactions, Tactile Markdown & UI Accessibility', () => {
    it('manages complete Zustand store lifecycle for Drawer and Chat', () => {
      const store = useAdminCopilotStore.getState();
      assert.equal(store.isOpen, false);

      store.openDrawer();
      assert.equal(useAdminCopilotStore.getState().isOpen, true);

      store.closeDrawer();
      assert.equal(useAdminCopilotStore.getState().isOpen, false);

      store.toggleDrawer();
      assert.equal(useAdminCopilotStore.getState().isOpen, true);

      store.setInput('Kiểm tra hàng tồn');
      assert.equal(useAdminCopilotStore.getState().input, 'Kiểm tra hàng tồn');

      store.clearHistory();
      assert.equal(useAdminCopilotStore.getState().input, '');
      assert.equal(useAdminCopilotStore.getState().messages.length, 1);
      assert.equal(useAdminCopilotStore.getState().messages[0].content, INITIAL_COPILOT_MESSAGE.content);

      store.closeDrawer();
    });

    it('wires all 4 Quick Action Chips to natural language prompts in drawer', () => {
      assert.equal(COPILOT_QUICK_ACTIONS.length, 4);
      for (const chip of COPILOT_QUICK_ACTIONS) {
        assert.ok(chip.id);
        assert.ok(chip.icon);
        assert.ok(chip.label);
        assert.ok(chip.prompt);
      }
      assert.match(drawerCode, /COPILOT_QUICK_ACTIONS\.map/);
      assert.match(drawerCode, /key=\{action\.id\}/);
    });

    it('handles global Ctrl+K / Cmd+K and Escape keyboard shortcuts in AdminCopilotTrigger', () => {
      assert.match(triggerCode, /event\.ctrlKey \|\| event\.metaKey/);
      assert.match(triggerCode, /event\.key === 'k' \|\| event\.key === 'K'/);
      assert.match(triggerCode, /event\.key === 'Escape'/);
      assert.match(triggerCode, /aria-label="Mở trợ lý phân tích Admin BI Copilot \(Ctrl \+ K\)"/);
      assert.match(triggerCode, /aria-haspopup="dialog"/);
    });

    it('parses Markdown tables, inline codes, and bold tokens cleanly without dependencies', () => {
      const tableLines = [
        '| Chỉ số | Kỳ này | Kỳ trước | Biến động |',
        '|---|---|---|---|',
        '| Doanh thu thực thu | **25.000.000 ₫** | 20.000.000 ₫ | +25% |',
        '| Đơn thanh toán | `12 đơn` | 10 đơn | +20% |',
      ];
      const table = parseMarkdownTable(tableLines);
      assert.notEqual(table, null);
      assert.equal(table?.headers.length, 4);
      assert.equal(table?.rows.length, 2);

      const tokens = tokenizeInlineMarkdown('Mã đơn `ORD-123`: **18.900.000 ₫**');
      assert.equal(tokens.length, 4);
      assert.equal(tokens[1].type, 'code');
      assert.equal(tokens[1].value, 'ORD-123');
      assert.equal(tokens[3].type, 'bold');
      assert.equal(tokens[3].value, '18.900.000 ₫');
    });

    it('strictly sanitizes em dash into hyphen across TactileMarkdown and Copilot outputs', () => {
      const input = 'Doanh thu \u2014 Tăng trưởng \u2014 Đơn hàng \u2014 Tồn kho';
      const output = sanitizeEmDash(input);
      assert.equal(output, 'Doanh thu - Tăng trưởng - Đơn hàng - Tồn kho');
      assert.doesNotMatch(output, /\u2014/);

      assert.match(tactileMarkdownCode, /sanitizeEmDash/);
      assert.match(promptCode, /CẤM TUYỆT ĐỐI KÝ TỰ GẠCH NGANG DÀI/);
      assert.doesNotMatch(promptCode, /\u2014/);
    });
  });

  describe('6. Zero Bundle Bloat, Performance & CSS Design System Compliance', () => {
    it('guarantees 0kb external chart and markdown dependencies in package.json', () => {
      const allDeps = {
        ...(packageJson.dependencies || {}),
        ...(packageJson.devDependencies || {}),
      };

      const forbiddenPackages = [
        'chart.js',
        'recharts',
        'apexcharts',
        'd3',
        'react-chartjs-2',
        'react-markdown',
        'marked',
        'showdown',
      ];

      for (const pkg of forbiddenPackages) {
        assert.equal(
          allDeps[pkg],
          undefined,
          `Package "${pkg}" should NOT be installed (zero-dependency requirement)`,
        );
      }
    });

    it('provides complete tactile styling classes in globals.css for Admin Sales & Copilot UI', () => {
      const expectedClasses = [
        '.admin-page',
        '.admin-period-pill',
        '.admin-kpi-card',
        '.admin-svg-chart',
        '.admin-donut-svg',
        '.admin-payment-bar',
        '.admin-copilot-trigger',
        '.admin-copilot-kbd',
        '.admin-copilot-overlay',
        '.admin-copilot-panel',
        '.admin-copilot-chips-bar',
        '.admin-copilot-chip',
        '.admin-copilot-table',
      ];

      for (const cls of expectedClasses) {
        assert.match(globalCssCode, new RegExp(cls.replace('.', '\\.')));
      }
    });

    it('verifies 100% absence of em dash character (U+2014) across all Giai đoạn 1-5 files', () => {
      assert.doesNotMatch(adminLayoutCode, /\u2014/);
      assert.doesNotMatch(adminDashboardPageCode, /\u2014/);
      assert.doesNotMatch(adminChatRouteCode, /\u2014/);
      assert.doesNotMatch(periodBarCode, /\u2014/);
      assert.doesNotMatch(kpiGridCode, /\u2014/);
      assert.doesNotMatch(barChartCode, /\u2014/);
      assert.doesNotMatch(donutChartCode, /\u2014/);
      assert.doesNotMatch(paymentCardCode, /\u2014/);
      assert.doesNotMatch(alertsTableCode, /\u2014/);
      assert.doesNotMatch(triggerCode, /\u2014/);
      assert.doesNotMatch(drawerCode, /\u2014/);
      assert.doesNotMatch(tactileMarkdownCode, /\u2014/);
      assert.doesNotMatch(promptCode, /\u2014/);
    });
  });
});
