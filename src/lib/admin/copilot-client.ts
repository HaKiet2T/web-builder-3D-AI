import 'server-only';
import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  COPILOT_TOOL_DECLARATIONS,
  executeCopilotTool,
  type CopilotToolExecutionResult,
} from '@/lib/admin/copilot-tools';
import { buildCopilotSystemPrompt } from '@/lib/admin/copilot-prompt';
import type {
  CategoryRevenueShare,
  FulfillmentBottleneck,
  InventoryAlert,
  PaymentMethodDistribution,
  SalesOverview,
  SalesPeriod,
  TopProductItem,
} from '@/lib/admin/analytics-schema';

export interface CopilotChatOptions {
  message: string;
  history?: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  referenceDate?: string;
  maxTurns?: number;
}

export interface CopilotChatResult {
  reply: string;
  toolsUsed: string[];
  turns: number;
}

const formatCurrency = (val: number): string =>
  new Intl.NumberFormat('vi-VN').format(val) + ' ₫';

async function generateRuleBasedFallback(
  options: CopilotChatOptions,
): Promise<CopilotChatResult> {
  const msg = options.message.toLowerCase();
  const toolsUsed: string[] = [];

  // Determine which period is requested
  let period: SalesPeriod = '7d';
  if (msg.includes('hôm nay') || msg.includes('today')) {
    period = 'today';
  } else if (msg.includes('tháng này') || msg.includes('tháng 11')) {
    period = 'this_month';
  } else if (msg.includes('tháng trước') || msg.includes('tháng 10')) {
    period = 'last_month';
  } else if (msg.includes('14 ngày')) {
    period = '14d';
  } else if (msg.includes('30 ngày')) {
    period = '30d';
  } else if (msg.includes('tất cả') || msg.includes('toàn bộ')) {
    period = 'all';
  }

  // 1. Inventory & Stock Alerts
  if (
    msg.includes('tồn kho') ||
    msg.includes('hết hàng') ||
    msg.includes('sắp hết') ||
    msg.includes('kho')
  ) {
    toolsUsed.push('check_inventory_alerts');
    const res = await executeCopilotTool('check_inventory_alerts', { threshold: 5 }, options);
    const alerts = (res.data as InventoryAlert[]) || [];

    const criticalCount = alerts.filter((a) => a.alertLevel === 'critical').length;
    const warningCount = alerts.filter((a) => a.alertLevel === 'warning').length;
    const preorderCount = alerts.filter((a) => a.alertLevel === 'preorder').length;

    let reply = `Hệ thống ghi nhận **${alerts.length} cảnh báo tồn kho**, trong đó có ${criticalCount} sản phẩm hết hàng hoặc rất thấp cần nhập bổ sung ngay.\n\n`;

    if (alerts.length > 0) {
      reply += `| Tên sản phẩm | SKU | Tồn kho | Trạng thái | Mức độ |\n`;
      reply += `|---|---|---|---|---|\n`;
      for (const a of alerts.slice(0, 8)) {
        const levelLabel =
          a.alertLevel === 'critical'
            ? 'Khẩn cấp'
            : a.alertLevel === 'warning'
              ? 'Cảnh báo'
              : 'Đặt trước';
        reply += `| ${a.productName} (${a.variantName}) | \`${a.sku}\` | ${a.stockQuantity} | ${a.stockStatus} | ${levelLabel} |\n`;
      }
      reply += `\n`;
    }

    reply += `### Khuyến nghị hành động\n`;
    reply += `- Liên hệ ngay nhà cung cấp để lên đơn nhập hàng cho ${criticalCount} sản phẩm mức khẩn cấp.\n`;
    reply += `- Theo dõi tốc độ tiêu thụ của ${warningCount} sản phẩm sắp chạm ngưỡng an toàn.\n`;
    reply += `- Kiểm tra lại tiến độ bàn giao linh kiện đối với ${preorderCount} đơn hàng đặt trước (Preorder).\n`;

    return {
      reply: reply.replace(/\u2014/g, '-'),
      toolsUsed,
      turns: 1,
    };
  }

  // 2. Top Selling Products
  if (
    msg.includes('bán chạy') ||
    msg.includes('top sản phẩm') ||
    msg.includes('sản phẩm hot') ||
    msg.includes('chạy nhất')
  ) {
    toolsUsed.push('query_top_products');
    const res = await executeCopilotTool('query_top_products', { limit: 5 }, options);
    const top = (res.data as TopProductItem[]) || [];

    let reply = `Danh sách **Top 5 sản phẩm bán chạy nhất** đã được tổng hợp dựa trên doanh thu thực tế.\n\n`;

    if (top.length > 0) {
      reply += `| Thứ hạng | Tên sản phẩm | Ngành hàng | Doanh thu | Số lượng bán | Số đơn hàng |\n`;
      reply += `|---|---|---|---|---|---|\n`;
      top.forEach((p, idx) => {
        reply += `| #${idx + 1} | ${p.productName} | ${p.categoryName || 'Khác'} | ${formatCurrency(p.revenue)} | ${p.unitsSold} | ${p.ordersCount} |\n`;
      });
      reply += `\n`;
    } else {
      reply += `Hiện tại chưa có dữ liệu sản phẩm bán ra trong kỳ đối soát.\n\n`;
    }

    reply += `### Đánh giá và khuyến nghị\n`;
    reply += `- Duy trì nguồn cung dồi dào cho các sản phẩm trong Top 3 để tránh đứt gãy doanh số.\n`;
    reply += `- Thiết lập các gói khuyến mãi mua kèm (Combo) giữa sản phẩm bán chạy và phụ kiện setup.\n`;
    reply += `- Cân nhắc đẩy mạnh chiến dịch tiếp thị số cho các dòng sản phẩm có biên lợi nhuận cao.\n`;

    return {
      reply: reply.replace(/\u2014/g, '-'),
      toolsUsed,
      turns: 1,
    };
  }

  // 3. Unfulfilled Orders & Bottlenecks
  if (
    msg.includes('chưa giao') ||
    msg.includes('nghẽn') ||
    msg.includes('đóng gói') ||
    msg.includes('chậm') ||
    msg.includes('đơn chờ')
  ) {
    toolsUsed.push('query_unfulfilled_orders');
    const res = await executeCopilotTool('query_unfulfilled_orders', { maxWaitingHours: 24 }, options);
    const bottlenecks = (res.data as FulfillmentBottleneck[]) || [];

    let reply = `Hiện có **${bottlenecks.length} đơn hàng bị nghẽn đóng gói** vượt quá 24 giờ kể từ lúc đặt hàng.\n\n`;

    if (bottlenecks.length > 0) {
      reply += `| Mã đơn | Khách hàng | Chờ (giờ) | Giá trị | Tách kiện | Trạng thái |\n`;
      reply += `|---|---|---|---|---|---|\n`;
      for (const b of bottlenecks.slice(0, 6)) {
        reply += `| \`${b.orderNumber}\` | ${b.customerName} | ${b.hoursWaiting}h | ${formatCurrency(b.totalAmount)} | ${b.isSplitShipment ? 'Có (' + b.packageCount + ' kiện)' : 'Không'} | ${b.orderStatus} |\n`;
      }
      reply += `\n`;
    }

    reply += `### Đề xuất xử lý khẩn cấp\n`;
    reply += `- Ưu tiên xử lý đóng gói các đơn có thời gian chờ cao nhất trong danh sách.\n`;
    reply += `- Kiểm tra kho đối với các đơn hàng tách nhiều kiện để đồng bộ thời gian bàn giao cho bưu tá.\n`;
    reply += `- Chủ động nhắn tin thông báo tiến độ giao hàng cho khách để nâng cao sự an tâm.\n`;

    return {
      reply: reply.replace(/\u2014/g, '-'),
      toolsUsed,
      turns: 1,
    };
  }

  // 4. Category Share & Payment Distribution
  if (msg.includes('ngành hàng') || msg.includes('danh mục') || msg.includes('cơ cấu')) {
    toolsUsed.push('query_category_share');
    const res = await executeCopilotTool('query_category_share', {}, options);
    const share = (res.data as CategoryRevenueShare[]) || [];

    let reply = `Cơ cấu doanh thu theo **danh mục ngành hàng** cho thấy sự phân bổ rõ rệt giữa các dòng sản phẩm.\n\n`;

    if (share.length > 0) {
      reply += `| Ngành hàng | Doanh thu | Tỷ trọng | Số lượng đã bán |\n`;
      reply += `|---|---|---|---|\n`;
      for (const s of share) {
        reply += `| ${s.categoryName} | ${formatCurrency(s.revenue)} | **${s.percentage}%** | ${s.itemsSold} |\n`;
      }
      reply += `\n`;
    }

    reply += `### Đề xuất phát triển danh mục\n`;
    reply += `- Tận dụng sức hút của ngành hàng chủ lực để quảng bá chéo các phụ kiện setup 3D.\n`;
    reply += `- Bổ sung thêm biến thể vật liệu hoặc màu sắc cho danh mục có tỷ trọng cao nhất.\n`;

    return {
      reply: reply.replace(/\u2014/g, '-'),
      toolsUsed,
      turns: 1,
    };
  }

  // 5. Payment Distribution
  if (msg.includes('thanh toán') || msg.includes('vietqr') || msg.includes('cod')) {
    toolsUsed.push('query_payment_distribution');
    const res = await executeCopilotTool('query_payment_distribution', {}, options);
    const dist = (res.data as PaymentMethodDistribution[]) || [];

    let reply = `Tỷ lệ phân bổ giữa các **phương thức thanh toán** của cửa hàng:\n\n`;

    if (dist.length > 0) {
      reply += `| Phương thức | Tên hiển thị | Số lượng đơn | Tổng tiền | Tỷ lệ |\n`;
      reply += `|---|---|---|---|---|\n`;
      for (const d of dist) {
        reply += `| \`${d.method}\` | ${d.label} | ${d.orderCount} | ${formatCurrency(d.totalAmount)} | **${d.percentage}%** |\n`;
      }
      reply += `\n`;
    }

    reply += `### Đánh giá vận hành thanh toán\n`;
    reply += `- Thanh toán VietQR giúp dòng tiền về tài khoản ngay lập tức và giảm thiểu rủi ro bom hàng COD.\n`;
    reply += `- Tiếp tục duy trì thông báo nhắc quét mã tự động để giữ tỷ lệ hoàn tất thanh toán ở mức cao.\n`;

    return {
      reply: reply.replace(/\u2014/g, '-'),
      toolsUsed,
      turns: 1,
    };
  }

  // 6. Default: Comprehensive Sales Overview + Inventory Check (Multi-tool fallback)
  toolsUsed.push('query_sales_summary');
  toolsUsed.push('check_inventory_alerts');

  const [salesRes, alertRes] = await Promise.all([
    executeCopilotTool('query_sales_summary', { period }, options),
    executeCopilotTool('check_inventory_alerts', { threshold: 5 }, options),
  ]);

  const sales = (salesRes.data as SalesOverview) || {
    totalRevenue: 0,
    previousPeriodRevenue: 0,
    revenueGrowthRate: 0,
    totalOrders: 0,
    paidOrdersCount: 0,
    averageOrderValue: 0,
    cancellationRate: 0,
    pendingFulfillmentCount: 0,
    splitShipmentCount: 0,
    inStockOrdersCount: 0,
    preorderOrdersCount: 0,
  };
  const alerts = (alertRes.data as InventoryAlert[]) || [];
  const criticalCount = alerts.filter((a) => a.alertLevel === 'critical').length;

  const periodLabels: Record<SalesPeriod, string> = {
    today: 'Hôm nay',
    '7d': '7 ngày qua',
    '14d': '14 ngày qua',
    '30d': '30 ngày qua',
    this_month: 'Tháng này',
    last_month: 'Tháng trước',
    all: 'Toàn bộ thời gian',
  };

  const periodTitle = periodLabels[period] || period;

  let reply = `Tổng doanh thu thực thu trong kỳ **${periodTitle}** đạt **${formatCurrency(sales.totalRevenue)}** với ${sales.paidOrdersCount} đơn thanh toán thành công.\n\n`;

  reply += `| Chỉ số kinh doanh | Giá trị kỳ này | So với kỳ trước / Chi tiết |\n`;
  reply += `|---|---|---|\n`;
  reply += `| **Tổng doanh thu thực thu** | ${formatCurrency(sales.totalRevenue)} | Tăng trưởng: **${sales.revenueGrowthRate >= 0 ? '+' : ''}${sales.revenueGrowthRate}%** |\n`;
  reply += `| **Sản lượng đơn hàng** | ${sales.totalOrders} đơn | ${sales.paidOrdersCount} đã thanh toán, ${sales.totalOrders - sales.paidOrdersCount} chờ/hủy |\n`;
  reply += `| **Giá trị trung bình đơn (AOV)** | ${formatCurrency(sales.averageOrderValue)} | Hiệu quả bán lẻ ổn định |\n`;
  reply += `| **Tỷ lệ hủy đơn** | ${sales.cancellationRate}% | Tỷ lệ an toàn |\n`;
  reply += `| **Đơn chờ hoàn tất** | ${sales.pendingFulfillmentCount} đơn | ${sales.splitShipmentCount} đơn tách kiện, ${sales.preorderOrdersCount} đơn đặt trước |\n\n`;

  if (criticalCount > 0) {
    reply += `> [!WARNING]\n`;
    reply += `> Phát hiện **${criticalCount} sản phẩm hết hàng hoặc ở mức khẩn cấp** cần nhập kho bổ sung ngay để không gián đoạn việc bán hàng.\n\n`;
  }

  reply += `### Đề xuất hành động trọng tâm\n`;
  reply += `- Xử lý nhanh ${sales.pendingFulfillmentCount} đơn hàng chờ hoàn tất để đảm bảo thời gian giao hàng đúng cam kết.\n`;
  if (criticalCount > 0) {
    reply += `- Kiểm tra danh sách ${criticalCount} sản phẩm hết hàng trong bảng Tồn kho để gửi yêu cầu nhập bổ sung.\n`;
  }
  reply += `- Tận dụng đà tăng trưởng để áp dụng các chương trình ưu đãi phụ kiện đi kèm màn hình và bàn phím cơ.\n`;

  return {
    reply: reply.replace(/\u2014/g, '-'),
    toolsUsed,
    turns: 1,
  };
}

export async function generateCopilotChatReply(
  options: CopilotChatOptions,
): Promise<CopilotChatResult> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey.trim() === '' || apiKey.includes('your_key_here')) {
    // Resilient fallback when API key is missing
    return generateRuleBasedFallback(options);
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction: buildCopilotSystemPrompt(options.referenceDate),
      tools: [{ functionDeclarations: COPILOT_TOOL_DECLARATIONS }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 1500,
      },
    });

    const chatHistory = (options.history || [])
      .filter((h) => h.role === 'user' || h.role === 'assistant')
      .map((h) => ({
        role: h.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: h.content }],
      }));

    const chat = model.startChat({
      history: chatHistory,
    });

    let result = await chat.sendMessage(options.message);
    const toolsUsed: string[] = [];
    const maxTurns = options.maxTurns ?? 3;
    let turnCount = 0;

    // Multi-turn tool calling loop
    while (turnCount < maxTurns) {
      const response = await result.response;
      const functionCalls = response.functionCalls();

      if (!functionCalls || functionCalls.length === 0) {
        // Model provided final text
        const text = response.text();
        return {
          reply: (text || '').replace(/\u2014/g, '-'),
          toolsUsed,
          turns: turnCount + 1,
        };
      }

      // Execute all function calls requested in this turn
      const functionResponses = [];
      for (const fc of functionCalls) {
        if (!toolsUsed.includes(fc.name)) {
          toolsUsed.push(fc.name);
        }

        const execResult: CopilotToolExecutionResult = await executeCopilotTool(
          fc.name,
          fc.args as Record<string, unknown>,
          { referenceDate: options.referenceDate },
        );

        functionResponses.push({
          functionResponse: {
            name: fc.name,
            response: {
              success: execResult.success,
              data: execResult.data,
              error: execResult.error,
            },
          },
        });
      }

      // Send tool results back to Gemini for next reasoning step
      result = await chat.sendMessage(functionResponses);
      turnCount++;
    }

    // Final response extraction after loop
    const finalResponse = await result.response;
    const finalText = finalResponse.text() || '';
    return {
      reply: finalText.replace(/\u2014/g, '-'),
      toolsUsed,
      turns: turnCount,
    };
  } catch (error) {
    console.warn('[generateCopilotChatReply] Gemini API call failed, falling back:', error);
    return generateRuleBasedFallback(options);
  }
}
