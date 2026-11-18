import 'server-only';
import { SchemaType, type FunctionDeclaration } from '@google/generative-ai';
import {
  getSalesOverview,
  getRevenueTrend,
  getCategoryRevenueShare,
  getPaymentMethodDistribution,
  getInventoryAlerts,
  getFulfillmentBottlenecks,
  getTopProducts,
} from '@/lib/admin/analytics-dal';
import type { SalesPeriod } from '@/lib/admin/analytics-schema';

export const COPILOT_TOOL_DECLARATIONS: FunctionDeclaration[] = [
  {
    name: 'query_sales_summary',
    description:
      'Truy vấn các chỉ số tổng quan bán hàng: tổng doanh thu thực thu, tăng trưởng doanh thu so với kỳ trước, số lượng đơn hàng, giá trị trung bình đơn (AOV), tỷ lệ hủy đơn, số đơn chờ đóng gói giao hàng.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        period: {
          type: SchemaType.STRING,
          description:
            'Kỳ phân tích báo cáo: today (hôm nay), 7d (7 ngày qua), 14d (14 ngày qua), 30d (30 ngày qua), this_month (tháng này), last_month (tháng trước), all (toàn bộ thời gian). Mặc định là 7d.',
        },
      },
      required: ['period'],
    },
  },
  {
    name: 'query_top_products',
    description:
      'Truy vấn danh sách các sản phẩm bán chạy nhất theo doanh thu hoặc số lượng món hàng đã bán ra.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        limit: {
          type: SchemaType.INTEGER,
          description: 'Số lượng sản phẩm cần lấy (mặc định 5, tối đa 20).',
        },
        sortBy: {
          type: SchemaType.STRING,
          description:
            'Tiêu chí sắp xếp: revenue (theo tổng doanh thu) hoặc units_sold (theo số lượng đã bán). Mặc định là revenue.',
        },
      },
    },
  },
  {
    name: 'check_inventory_alerts',
    description:
      'Kiểm tra danh sách cảnh báo hàng tồn kho: hết hàng hoặc tồn kho rất thấp (critical), sắp chạm ngưỡng an toàn (warning), hoặc thuộc diện đặt trước (preorder).',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        threshold: {
          type: SchemaType.INTEGER,
          description: 'Ngưỡng tồn kho tối thiểu để kích hoạt cảnh báo (mặc định 5).',
        },
      },
    },
  },
  {
    name: 'query_unfulfilled_orders',
    description:
      'Truy vấn danh sách các đơn hàng đã thanh toán nhưng chưa hoàn tất đóng gói, bị nghẽn xử lý vượt quá số giờ quy định.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        maxWaitingHours: {
          type: SchemaType.INTEGER,
          description:
            'Số giờ chờ tối thiểu tính từ thời điểm đặt hàng để xác định đơn bị nghẽn (mặc định 24).',
        },
      },
    },
  },
  {
    name: 'query_revenue_trend',
    description:
      'Truy vấn chuỗi doanh thu và số lượng đơn hàng theo từng ngày liên tục phục vụ phân tích xu hướng tăng giảm.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        days: {
          type: SchemaType.INTEGER,
          description: 'Số ngày cần xem xu hướng (mặc định 7, tối đa 90 ngày).',
        },
      },
    },
  },
  {
    name: 'query_category_share',
    description:
      'Truy vấn tỷ trọng doanh thu, phần trăm đóng góp và số lượng món hàng đã bán theo từng danh mục ngành hàng (màn hình, bàn phím cơ, chuột, phụ kiện setup).',
  },
  {
    name: 'query_payment_distribution',
    description:
      'Truy vấn tỷ lệ phân bổ giữa các phương thức thanh toán: chuyển khoản VietQR tức thì so với thu tiền khi giao hàng COD.',
  },
];

export interface CopilotToolExecutionResult {
  tool: string;
  success: boolean;
  data: unknown;
  error?: string;
}

export async function executeCopilotTool(
  name: string,
  args: Record<string, unknown> = {},
  options?: { referenceDate?: Date | string },
): Promise<CopilotToolExecutionResult> {
  try {
    switch (name) {
      case 'query_sales_summary': {
        const period = (args.period as SalesPeriod) || '7d';
        const data = await getSalesOverview(period, options?.referenceDate);
        return { tool: name, success: true, data };
      }

      case 'query_top_products': {
        const limit = typeof args.limit === 'number' ? args.limit : 5;
        const sortBy = args.sortBy === 'units_sold' ? 'units_sold' : 'revenue';
        const data = await getTopProducts(limit, sortBy);
        return { tool: name, success: true, data };
      }

      case 'check_inventory_alerts': {
        const threshold = typeof args.threshold === 'number' ? args.threshold : 5;
        const data = await getInventoryAlerts(threshold);
        return { tool: name, success: true, data };
      }

      case 'query_unfulfilled_orders': {
        const maxWaitingHours =
          typeof args.maxWaitingHours === 'number' ? args.maxWaitingHours : 24;
        const data = await getFulfillmentBottlenecks(maxWaitingHours, options?.referenceDate);
        return { tool: name, success: true, data };
      }

      case 'query_revenue_trend': {
        const days = typeof args.days === 'number' ? args.days : 7;
        const data = await getRevenueTrend(days, options?.referenceDate);
        return { tool: name, success: true, data };
      }

      case 'query_category_share': {
        const data = await getCategoryRevenueShare();
        return { tool: name, success: true, data };
      }

      case 'query_payment_distribution': {
        const data = await getPaymentMethodDistribution();
        return { tool: name, success: true, data };
      }

      default:
        return {
          tool: name,
          success: false,
          data: null,
          error: `Công cụ không tồn tại: ${name}`,
        };
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      tool: name,
      success: false,
      data: null,
      error: `Lỗi thực thi công cụ ${name}: ${errorMsg}`,
    };
  }
}
