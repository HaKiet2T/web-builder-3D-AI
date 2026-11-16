import 'server-only';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { buildSystemPrompt } from './system-prompt';
import type { ChatIntent } from './schema';

interface GenerateChatOptions {
  message: string;
  intent: ChatIntent;
  contextData?: string;
  language: 'vi' | 'en';
}

function generateRuleBasedFallback(options: GenerateChatOptions): string {
  const { intent, language } = options;

  if (language === 'en') {
    switch (intent) {
      case 'greeting':
        return 'Hello! Welcome to E-commerce 3D. I can assist you with product specifications (monitors, mice, keyboards, 3D models), tracking your orders, or answering payment questions. What can I do for you today?';
      case 'product':
        return 'Our store specializes in high-performance esports gaming monitors (such as ASUS ROG Strix 310Hz), mechanical keyboards, ergonomic mousepads, and interactive 3D product previews. You can click on any product to inspect it with our 360-degree 3D Orbit Viewer. Feel free to ask about specific models or prices!';
      case 'order':
        return 'To track your order, please provide your order code (starting with ORD-) or log in to your account at /account/orders to view real-time delivery status and order details. All orders above 1,000,000 VND qualify for free shipping nationwide.';
      case 'payment':
        return 'We support two convenient payment methods: Cash on Delivery (COD) and Bank Transfer via automated VietQR. If a payment attempt fails, you can easily retry payment anytime from your order history at /account/orders.';
      default:
        return 'I can assist you with store products, order tracking, and payment questions. Please let me know what you need help with!';
    }
  }

  // Vietnamese fallback
  switch (intent) {
    case 'greeting':
      return 'Xin chào bạn! Tôi là trợ lý ảo của E-commerce 3D. Tôi có thể hỗ trợ bạn tìm kiếm và tư vấn thông số màn hình gaming, chuột, bàn phím cơ; tra cứu tình trạng đơn hàng hoặc hướng dẫn thanh toán. Bạn đang quan tâm đến nội dung nào ạ?';
    case 'product':
      return 'E-commerce 3D cung cấp các dòng màn hình gaming esports cao cấp (như ASUS ROG Strix 310Hz), bàn phím cơ, lót chuột công thái học và phụ kiện setup. Bạn có thể bấm vào từng sản phẩm để trải nghiệm tính năng xoay 360 độ (3D Orbit) xem chi tiết chân đế và cổng kết nối. Bạn muốn tìm sản phẩm trong tầm giá nào ạ?';
    case 'order':
      return 'Để tra cứu đơn hàng, bạn có thể gửi mã đơn (dạng ORD-...) ngay tại đây hoặc đăng nhập vào trang /account/orders để theo dõi tiến độ giao hàng và danh sách kiện hàng. Đơn hàng từ 1.000.000 VNĐ được miễn phí vận chuyển toàn quốc.';
    case 'payment':
      return 'Cửa hàng hỗ trợ 2 phương thức thanh toán chính: Thanh toán khi nhận hàng (COD) và Chuyển khoản ngân hàng qua mã VietQR tự động. Nếu đơn hàng chưa hoàn tất thanh toán, bạn có thể bấm "Thanh toán lại" bất kỳ lúc nào tại trang /account/orders.';
    default:
      return 'Tôi luôn sẵn sàng hỗ trợ các vấn đề liên quan đến sản phẩm, đơn hàng và thanh toán. Bạn cần shop hỗ trợ cụ thể điều gì ạ?';
  }
}

export async function generateChatReply(options: GenerateChatOptions): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey.trim() === '' || apiKey.includes('your_key_here')) {
    // Graceful resilient fallback when API key is missing
    return generateRuleBasedFallback(options);
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction: buildSystemPrompt(options.contextData),
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 600,
      },
    });

    const result = await model.generateContent(options.message);
    const response = await result.response;
    const text = response.text();

    if (!text || text.trim() === '') {
      return generateRuleBasedFallback(options);
    }

    // Sanitize any em dashes (U+2014) from LLM output to strictly adhere to formatting contract
    return text.replace(/\u2014/g, '-');
  } catch (error) {
    console.warn('[generateChatReply] Gemini API call failed, using resilient fallback:', error);
    return generateRuleBasedFallback(options);
  }
}
