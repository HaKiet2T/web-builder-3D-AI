import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import {
  CopilotChatRequestSchema,
  TopProductItemSchema,
  SalesOverviewSchema,
} from '../src/lib/admin/analytics-schema.ts';
import {
  COPILOT_TOOL_DECLARATIONS,
  executeCopilotTool,
} from '../src/lib/admin/copilot-tools.ts';
import { buildCopilotSystemPrompt } from '../src/lib/admin/copilot-prompt.ts';
import { generateCopilotChatReply } from '../src/lib/admin/copilot-client.ts';
import { calculateTopProducts } from '../src/lib/admin/analytics-dal.ts';
import type { Order } from '../src/types/order.ts';

const adminChatRouteCode = readFileSync('src/app/api/admin/chat/route.ts', 'utf8');

const mockSampleOrders: Order[] = [
  {
    id: 'ord-101',
    orderNumber: 'ORD-20261117-001',
    status: 'paid',
    paymentStatus: 'paid',
    paymentMethod: 'vietqr',
    createdAt: '2026-11-17T10:00:00.000Z',
    updatedAt: '2026-11-17T10:00:00.000Z',
    subtotal: 18900000,
    shippingTotal: 0,
    discountTotal: 0,
    totalAmount: 18900000,
    isSplitShipment: false,
    fulfillments: [],
    customer: {
      fullName: 'Nguyễn Văn A',
      email: 'a@example.com',
      phone: '0901234567',
      address: '123 Phố Huế',
      city: 'Hà Nội',
    },
    items: [
      {
        id: 'item-1',
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
    id: 'ord-102',
    orderNumber: 'ORD-20261117-002',
    status: 'processing',
    paymentStatus: 'paid',
    paymentMethod: 'cod',
    createdAt: '2026-11-16T08:00:00.000Z',
    updatedAt: '2026-11-16T08:00:00.000Z',
    subtotal: 3170000,
    shippingTotal: 30000,
    discountTotal: 0,
    totalAmount: 3200000,
    isSplitShipment: true,
    fulfillments: [],
    customer: {
      fullName: 'Trần Thị B',
      email: 'b@example.com',
      phone: '0912345678',
      address: '456 Lê Lợi',
      city: 'TP. Hồ Chí Minh',
    },
    items: [
      {
        id: 'item-2',
        productId: 'ban-phim-co-tactile-custom',
        name: 'Bàn phím cơ HyperWork Tactile',
        variant: 'Navy Blue',
        price: 3200000,
        quantity: 1,
        stockStatus: 'in-stock',
      },
    ],
  },
];

describe('Admin BI Copilot Engine & Multi-turn Tool Calling (Giai đoạn 3)', () => {
  describe('Zod Schema Validation', () => {
    it('validates CopilotChatRequest with message and optional history', () => {
      const validReq = {
        message: 'Tình hình doanh thu hôm nay thế nào?',
        history: [
          { role: 'user' as const, content: 'Xin chào' },
          { role: 'assistant' as const, content: 'Chào bạn, tôi có thể giúp gì?' },
        ],
      };
      const parsed = CopilotChatRequestSchema.safeParse(validReq);
      assert.equal(parsed.success, true);
    });

    it('rejects empty or whitespace-only messages in CopilotChatRequest', () => {
      assert.equal(CopilotChatRequestSchema.safeParse({ message: '' }).success, false);
      assert.equal(CopilotChatRequestSchema.safeParse({ message: '   ' }).success, false);
    });

    it('validates TopProductItemSchema constraints', () => {
      const item = {
        productId: 'rog-strix-xg27aqm-g',
        productName: 'Màn hình ASUS ROG Strix XG27AQM-G',
        categoryName: 'Màn hình',
        revenue: 18900000,
        unitsSold: 2,
        ordersCount: 2,
      };
      assert.equal(TopProductItemSchema.safeParse(item).success, true);

      // Negative revenue must fail
      assert.equal(
        TopProductItemSchema.safeParse({ ...item, revenue: -500 }).success,
        false,
      );
    });
  });

  describe('Copilot System Prompt Guard', () => {
    it('strictly forbids em dash and enforces BI Director role', () => {
      const prompt = buildCopilotSystemPrompt('2026-11-17T21:09:00+07:00');
      assert.doesNotMatch(prompt, /\u2014/, 'System prompt must never contain em dash (U+2014)');
      assert.match(prompt, /Giám đốc Phân tích Dữ liệu Bán hàng/);
      assert.match(prompt, /MULTI-TURN TOOL CALLING/);
      assert.match(prompt, /2026-11-17T21:09:00\+07:00/);
      assert.match(prompt, /BẢNG MARKDOWN/);
    });
  });

  describe('Copilot Tool Declarations & Schema Definitions', () => {
    it('declares 7 structured analytics tools', () => {
      const toolNames = COPILOT_TOOL_DECLARATIONS.map((t) => t.name);
      assert.equal(COPILOT_TOOL_DECLARATIONS.length, 7);
      assert.ok(toolNames.includes('query_sales_summary'));
      assert.ok(toolNames.includes('query_top_products'));
      assert.ok(toolNames.includes('check_inventory_alerts'));
      assert.ok(toolNames.includes('query_unfulfilled_orders'));
      assert.ok(toolNames.includes('query_revenue_trend'));
      assert.ok(toolNames.includes('query_category_share'));
      assert.ok(toolNames.includes('query_payment_distribution'));
    });
  });

  describe('Tool Execution Dispatcher (executeCopilotTool)', () => {
    it('executes query_sales_summary and returns valid SalesOverview', async () => {
      const result = await executeCopilotTool('query_sales_summary', { period: '7d' });
      assert.equal(result.success, true);
      assert.equal(result.tool, 'query_sales_summary');
      const parsed = SalesOverviewSchema.safeParse(result.data);
      assert.equal(parsed.success, true);
    });

    it('executes query_top_products with sorting options', async () => {
      const result = await executeCopilotTool('query_top_products', { limit: 3, sortBy: 'revenue' });
      assert.equal(result.success, true);
      assert.ok(Array.isArray(result.data));
    });

    it('executes check_inventory_alerts and filters by threshold', async () => {
      const result = await executeCopilotTool('check_inventory_alerts', { threshold: 5 });
      assert.equal(result.success, true);
      assert.ok(Array.isArray(result.data));
    });

    it('executes query_unfulfilled_orders and returns bottlenecks array', async () => {
      const result = await executeCopilotTool('query_unfulfilled_orders', { maxWaitingHours: 24 });
      assert.equal(result.success, true);
      assert.ok(Array.isArray(result.data));
    });

    it('executes query_revenue_trend and query_category_share', async () => {
      const trend = await executeCopilotTool('query_revenue_trend', { days: 7 });
      assert.equal(trend.success, true);
      assert.ok(Array.isArray(trend.data));

      const share = await executeCopilotTool('query_category_share');
      assert.equal(share.success, true);
      assert.ok(Array.isArray(share.data));
    });

    it('returns error when executing unknown tool name', async () => {
      const result = await executeCopilotTool('non_existent_tool', {});
      assert.equal(result.success, false);
      assert.match(result.error || '', /Công cụ không tồn tại/);
    });
  });

  describe('calculateTopProducts Engine', () => {
    it('accurately aggregates revenue and units sold from orders', () => {
      const top = calculateTopProducts(mockSampleOrders, undefined, undefined, 5, 'revenue');
      assert.ok(top.length >= 2);
      assert.equal(top[0].productId, 'rog-strix-xg27aqm-g');
      assert.equal(top[0].revenue, 18900000);
      assert.equal(top[0].unitsSold, 1);
      assert.equal(top[0].ordersCount, 1);
    });
  });

  describe('generateCopilotChatReply Resilient Execution Engine', () => {
    it('generates structured sales overview with table and recommendations', async () => {
      const res = await generateCopilotChatReply({
        message: 'Báo cáo doanh thu hôm nay và tuần này',
        referenceDate: '2026-11-17T21:09:00+07:00',
      });

      assert.ok(res.reply.length > 50);
      assert.doesNotMatch(res.reply, /\u2014/, 'Output must not contain em dash');
      assert.ok(res.toolsUsed.includes('query_sales_summary'));
      assert.match(res.reply, /doanh thu/i);
      assert.match(res.reply, /Khuyến nghị|Đề xuất/i);
    });

    it('generates stock alert report when user asks about inventory', async () => {
      const res = await generateCopilotChatReply({
        message: 'Kiểm tra tồn kho và các sản phẩm sắp hết hàng',
      });

      assert.ok(res.reply.length > 50);
      assert.doesNotMatch(res.reply, /\u2014/);
      assert.ok(res.toolsUsed.includes('check_inventory_alerts'));
      assert.match(res.reply, /cảnh báo tồn kho/i);
    });

    it('generates top selling report when user asks about bestsellers', async () => {
      const res = await generateCopilotChatReply({
        message: 'Top sản phẩm bán chạy nhất hiện tại',
      });

      assert.ok(res.reply.length > 50);
      assert.doesNotMatch(res.reply, /\u2014/);
      assert.ok(res.toolsUsed.includes('query_top_products'));
      assert.match(res.reply, /Top 5 sản phẩm/i);
    });

    it('generates unfulfilled bottlenecks report when user asks about delayed orders', async () => {
      const res = await generateCopilotChatReply({
        message: 'Có đơn hàng nào chưa giao hoặc bị nghẽn đóng gói quá 24h không?',
      });

      assert.ok(res.reply.length > 50);
      assert.doesNotMatch(res.reply, /\u2014/);
      assert.ok(res.toolsUsed.includes('query_unfulfilled_orders'));
      assert.match(res.reply, /nghẽn đóng gói/i);
    });
  });

  describe('Admin Chat Route Handler Security & Architecture', () => {
    it('verifies getCurrentAdmin session and returns 403 on unauthenticated access', () => {
      assert.match(adminChatRouteCode, /getCurrentAdmin\(\)/);
      assert.match(adminChatRouteCode, /status:\s*403/);
      assert.match(adminChatRouteCode, /Truy cập bị từ chối: Yêu cầu quyền quản trị viên/);
    });

    it('validates request payload with CopilotChatRequestSchema and invokes generateCopilotChatReply', () => {
      assert.match(adminChatRouteCode, /CopilotChatRequestSchema\.safeParse/);
      assert.match(adminChatRouteCode, /generateCopilotChatReply/);
      assert.match(adminChatRouteCode, /export async function POST/);
      assert.match(adminChatRouteCode, /export async function GET/);
    });

    it('ensures no em dash is present in route handler implementation', () => {
      assert.doesNotMatch(adminChatRouteCode, /\u2014/, 'Route code must not contain em dash (U+2014)');
    });
  });
});
