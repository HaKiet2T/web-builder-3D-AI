import type { ChatIntent } from './schema';

export interface GuardClassification {
  intent: ChatIntent;
  allowed: boolean;
  detectedLanguage: 'vi' | 'en';
  refusalMessage?: string;
}

// Prompt injection and jailbreak signatures
const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior)\s+(instructions|prompts|rules)/i,
  /bỏ\s+qua\s+(hết\s+|toàn\s+bộ\s+)?(hướng\s+dẫn|luật|quy\s+tắc|lệnh)/i,
  /system\s+prompt/i,
  /developer\s+mode/i,
  /jailbreak/i,
  /you\s+are\s+now\s+(an?\s+unrestricted|a\s+different)/i,
  /đóng\s+vai\s+(một\s+)?(ai\s+khác|hacker|tổng\s+thống)/i,
  /reveal\s+(your\s+)?(hidden\s+)?(instructions|source\s+code)/i,
  /tiết\s+lộ\s+(prompt|mã\s+nguồn|chỉ\s+dẫn)/i,
];

// Off-topic patterns (clearly unrelated domains)
const OFF_TOPIC_PATTERNS = [
  /\b(thời\s+tiết|weather)\b/i,
  /\b(viết\s+thơ|write\s+a?\s+poem|bài\s+thơ)\b/i,
  /\b(viết\s+code|write\s+code|python|javascript|c\+\+|golang)\b/i,
  /\b(giải\s+toán|solve\s+math|phương\s+trình|đạo\s+hàm)\b/i,
  /\b(chính\s+trị|politics|bầu\s+cử|election|tổng\s+thống)\b/i,
  /\b(công\s+thức\s+nấu|recipe|món\s+ăn|nấu\s+ăn)\b/i,
  /\b(bất\s+động\s+sản|nhà\s+đất|cổ\s+phiếu|stock|crypto|bitcoin)\b/i,
  /\b(khám\s+bệnh|uống\s+thuốc|bệnh\s+viện|chẩn\s+đoán)\b/i,
];

// Greeting patterns
const GREETING_PATTERNS = [
  /^(xin\s+)?chào(\s+(bạn|shop|ad|em|anh|chị|mọi\s+người|cả\s+nhà))?(\s+(ơi|nha|nhé|ạ))?$/i,
  /^(hello|hi|hey|good\s+(morning|afternoon|evening))(\s+(there|shop|admin))?$/i,
  /^(bạn|em)\s+là\s+ai(\s+thế|\s+vậy)?$/i,
  /^(who\s+are\s+you|what\s+can\s+you\s+do|how\s+can\s+you\s+help)$/i,
  /^(giúp\s+tôi|tôi\s+cần\s+(hỗ\s+trợ|giúp\s+đỡ)|help(\s+me)?)$/i,
  /^(alo|ê|ad ơi|shop ơi)$/i,
];

// Product keywords
const PRODUCT_KEYWORDS = [
  'sản phẩm',
  'san pham',
  'màn hình',
  'man hinh',
  'monitor',
  'chuột',
  'chuot',
  'mouse',
  'bàn phím',
  'ban phim',
  'keyboard',
  'lót chuột',
  'pad',
  'desk pad',
  'tai nghe',
  'headphone',
  'audio',
  'loa',
  'speaker',
  'giá đỡ',
  'arm',
  '3d',
  'mô hình',
  'mo hinh',
  'model',
  'xem 3d',
  'orbit',
  'thông số',
  'thong so',
  'specs',
  'cấu hình',
  'tần số quét',
  'hz',
  'độ phân giải',
  'resolution',
  'tấm nền',
  'ips',
  'oled',
  'giá',
  'gia',
  'price',
  'chi phí',
  'cost',
  'bao nhiêu',
  'còn hàng',
  'con hang',
  'hết hàng',
  'het hang',
  'stock',
  'in stock',
  'out of stock',
  'tồn kho',
  'bảo hành',
  'bao hanh',
  'warranty',
  'chính hãng',
  'màu',
  'mau',
  'color',
  'chất liệu',
  'material',
  'rog',
  'asus',
  'strix',
  'hyperwork',
  'vxe',
  'filco',
  'keychron',
];

// Order keywords
const ORDER_KEYWORDS = [
  'đơn hàng',
  'don hang',
  'order',
  'ord-',
  'tra cứu',
  'tra cuu',
  'kiểm tra đơn',
  'kiem tra don',
  'tracking',
  'track',
  'mã đơn',
  'ma don',
  'vận chuyển',
  'van chuyen',
  'giao hàng',
  'giao hang',
  'shipping',
  'delivery',
  'đang ở đâu',
  'khi nào tới',
  'khi nao toi',
  'trạng thái đơn',
  'status',
  'hủy đơn',
  'huy don',
  'huỷ đơn',
  'cancel',
  'đổi trả',
  'doi tra',
  'hoàn tiền',
  'hoan tien',
  'refund',
  'return',
  'địa chỉ nhận',
  'dia chi',
  'shipment',
  'kiện hàng',
  'split shipment',
];

// Payment keywords
const PAYMENT_KEYWORDS = [
  'thanh toán',
  'thanh toan',
  'payment',
  'chuyển khoản',
  'chuyen khoan',
  'bank transfer',
  'vietqr',
  'qr code',
  'quét qr',
  'quet qr',
  'cod',
  'tiền mặt',
  'tien mat',
  'thẻ tín dụng',
  'thẻ atm',
  'the tin dung',
  'the atm',
  'credit card',
  'lỗi thanh toán',
  'thanh toán lại',
  'retry payment',
  'xác nhận thanh toán',
  'đã chuyển tiền',
  'chưa nhận được tiền',
  'hoá đơn',
  'hoa don',
  'invoice',
  'stk',
  'số tài khoản',
  'so tai khoan',
  'ngân hàng',
  'ngan hang',
];

export function detectLanguage(text: string): 'vi' | 'en' {
  // Vietnamese specific characters (diacritics)
  const vietnameseDiacritics = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
  if (vietnameseDiacritics.test(text)) {
    return 'vi';
  }

  // Count common Vietnamese vs English stopwords
  const viWords = [
    'tôi', 'bạn', 'có', 'không', 'cho', 'của', 'ở', 'được', 'là', 'gì',
    'sao', 'và', 'xin', 'cần', 'mình', 'shop', 'ơi', 'nhé', 'nha', 'ạ',
    'đơn', 'hàng', 'giá', 'bao', 'nhiêu',
  ];
  const enWords = [
    'the', 'is', 'at', 'which', 'on', 'and', 'a', 'an', 'in', 'to', 'for',
    'my', 'how', 'what', 'can', 'hello', 'hi', 'hey', 'there', 'you',
    'your', 'please', 'help', 'do', 'does', 'order', 'product', 'payment',
  ];

  const lower = text.toLowerCase();
  let viScore = 0;
  let enScore = 0;

  for (const word of viWords) {
    if (new RegExp(`\\b${word}\\b`, 'i').test(lower)) viScore++;
  }
  for (const word of enWords) {
    if (new RegExp(`\\b${word}\\b`, 'i').test(lower)) enScore++;
  }

  if (enScore > viScore) {
    return 'en';
  }
  return 'vi'; // Default to Vietnamese for the store
}

export function classifyIntent(message: string): GuardClassification {
  const trimmed = message.trim();
  const lower = trimmed.toLowerCase();
  const lang = detectLanguage(trimmed);

  // 1. Check Prompt Injection / Jailbreak
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(lower)) {
      return {
        intent: 'rejected',
        allowed: false,
        detectedLanguage: lang,
        refusalMessage:
          lang === 'vi'
            ? 'Yêu cầu không hợp lệ. Tôi là trợ lý chuyên trách hỗ trợ sản phẩm, đơn hàng và thanh toán tại E-commerce 3D.'
            : 'Invalid request. I am a dedicated assistant specialized in products, orders, and payments at E-commerce 3D.',
      };
    }
  }

  // 2. Check explicitly Off-topic patterns
  for (const pattern of OFF_TOPIC_PATTERNS) {
    if (pattern.test(lower)) {
      return {
        intent: 'rejected',
        allowed: false,
        detectedLanguage: lang,
        refusalMessage:
          lang === 'vi'
            ? 'Xin lỗi bạn, tôi chỉ hỗ trợ các câu hỏi liên quan đến **sản phẩm**, **đơn hàng** và **thanh toán** của cửa hàng. Bạn cần giúp gì về các chủ đề này không ạ?'
            : "I apologize, but I only assist with inquiries regarding our store's **products**, **orders**, and **payment methods**. How may I help you with those?",
      };
    }
  }

  // 3. Check Greeting
  for (const pattern of GREETING_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        intent: 'greeting',
        allowed: true,
        detectedLanguage: lang,
      };
    }
  }

  // 4. Check Payment
  const hasPayment =
    PAYMENT_KEYWORDS.some((kw) => lower.includes(kw)) ||
    /\b(pay|paying|thẻ)\b/i.test(lower);
  if (hasPayment) {
    return {
      intent: 'payment',
      allowed: true,
      detectedLanguage: lang,
    };
  }

  // 5. Check Order
  const hasOrder = ORDER_KEYWORDS.some((kw) => lower.includes(kw));
  if (hasOrder) {
    return {
      intent: 'order',
      allowed: true,
      detectedLanguage: lang,
    };
  }

  // 6. Check Product
  const hasProduct = PRODUCT_KEYWORDS.some((kw) => lower.includes(kw));
  if (hasProduct) {
    return {
      intent: 'product',
      allowed: true,
      detectedLanguage: lang,
    };
  }

  // Check if message is very short greeting like "hi" or "alo"
  if (/^(alo|ê|ad ơi|shop ơi|chào|hello|hi|hey)$/i.test(lower)) {
    return {
      intent: 'greeting',
      allowed: true,
      detectedLanguage: lang,
    };
  }

  // If no match in allowed domains, reject politely (Rule Guard strict enforcement)
  return {
    intent: 'rejected',
    allowed: false,
    detectedLanguage: lang,
    refusalMessage:
      lang === 'vi'
        ? 'Tôi chỉ có thể hỗ trợ các thông tin về **sản phẩm (màn hình, chuột, phím, 3D)**, **tra cứu đơn hàng** và **hướng dẫn thanh toán**. Vui lòng đặt câu hỏi liên quan đến các dịch vụ này ạ.'
        : 'I can only assist with inquiries regarding **products (monitors, mice, keyboards, 3D models)**, **order tracking**, and **payment support**. Please ask about these topics.',
  };
}

export function getQuickReplies(lang: 'vi' | 'en') {
  if (lang === 'en') {
    return [
      { label: '🔍 Track Order', prompt: 'I want to check my order status' },
      { label: '💻 3D Monitors & Gear', prompt: 'Recommend featured gaming monitors for me' },
      { label: '💳 Payment Methods', prompt: 'What payment methods does the store support?' },
      { label: '🔄 Warranty & Return', prompt: 'What is the store return and warranty policy?' },
    ];
  }

  return [
    { label: '🔍 Tra cứu đơn hàng', prompt: 'Tôi muốn tra cứu tình trạng đơn hàng' },
    { label: '💻 Màn hình & Đồ 3D', prompt: 'Tư vấn cho tôi các dòng màn hình gaming nổi bật' },
    { label: '💳 Hướng dẫn thanh toán', prompt: 'Cửa hàng hỗ trợ những hình thức thanh toán nào?' },
    { label: '🔄 Bảo hành & Đổi trả', prompt: 'Chính sách bảo hành và đổi trả của shop như thế nào?' },
  ];
}
