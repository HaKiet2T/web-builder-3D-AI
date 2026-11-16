'use client';

import { useEffect, useRef, useState } from 'react';
import type { QuickReply } from '@/lib/chat/schema';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  intent?: string;
  createdAt?: string;
}

const STORAGE_SESSION_KEY = 'ecommerce_3d_chat_session_id';

const DEFAULT_VI_QUICK_REPLIES: QuickReply[] = [
  { label: '🔍 Tra cứu đơn hàng', prompt: 'Tôi muốn tra cứu tình trạng đơn hàng' },
  { label: '💻 Màn hình & Đồ 3D', prompt: 'Tư vấn cho tôi các dòng màn hình gaming nổi bật' },
  { label: '💳 Hướng dẫn thanh toán', prompt: 'Cửa hàng hỗ trợ những hình thức thanh toán nào?' },
  { label: '🔄 Bảo hành & Đổi trả', prompt: 'Chính sách bảo hành và đổi trả của shop như thế nào?' },
];

const DEFAULT_EN_QUICK_REPLIES: QuickReply[] = [
  { label: '🔍 Track Order', prompt: 'I want to check my order status' },
  { label: '💻 3D Monitors & Gear', prompt: 'Recommend featured gaming monitors for me' },
  { label: '💳 Payment Methods', prompt: 'What payment methods does the store support?' },
  { label: '🔄 Warranty & Return', prompt: 'What is the store return and warranty policy?' },
];

function createWelcomeMessage(lang: 'vi' | 'en'): Message {
  return {
    id: 'welcome-1',
    sender: 'assistant',
    content:
      lang === 'vi'
        ? 'Xin chào! Tôi là trợ lý AI của E-commerce 3D. Tôi có thể hỗ trợ bạn tìm kiếm và tư vấn thông số **sản phẩm 3D**, **tra cứu đơn hàng** hoặc **hướng dẫn thanh toán**. Bạn cần hỗ trợ gì hôm nay?'
        : 'Hello! I am the AI assistant of E-commerce 3D. I can assist you with **3D product specifications**, **order tracking**, or **payment support**. How can I help you today?',
    intent: 'greeting',
  };
}

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [lang, setLang] = useState<'vi' | 'en'>('vi');
  const [messages, setMessages] = useState<Message[]>(() => [createWelcomeMessage('vi')]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>(DEFAULT_VI_QUICK_REPLIES);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Restore session asynchronously on mount
  useEffect(() => {
    let isMounted = true;
    try {
      const storedSession = localStorage.getItem(STORAGE_SESSION_KEY);
      if (storedSession) {
        fetch(`/api/chat?sessionId=${storedSession}`)
          .then((res) => res.json())
          .then((data) => {
            if (isMounted) {
              setSessionId(storedSession);
              if (data.ok && Array.isArray(data.messages) && data.messages.length > 0) {
                setMessages(data.messages);
              }
            }
          })
          .catch(() => {
            // Keep default message
          });
      }
    } catch {
      // Ignore localStorage errors
    }

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      inputRef.current?.focus();
    }
  }, [isOpen, messages, isLoading]);

  const handleToggleLang = () => {
    const nextLang = lang === 'vi' ? 'en' : 'vi';
    setLang(nextLang);
    setQuickReplies(nextLang === 'vi' ? DEFAULT_VI_QUICK_REPLIES : DEFAULT_EN_QUICK_REPLIES);
  };

  const handleSend = async (messageText?: string) => {
    const textToSend = (messageText || input).trim();
    if (!textToSend || isLoading) return;

    setInput('');

    const userMsgId = crypto.randomUUID();
    const newUserMsg: Message = {
      id: userMsgId,
      sender: 'user',
      content: textToSend,
    };

    setMessages((prev) => [...prev, newUserMsg]);
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          sessionId: sessionId || undefined,
          language: lang,
        }),
      });

      const data = await res.json();
      if (data.ok) {
        if (data.sessionId && data.sessionId !== sessionId) {
          setSessionId(data.sessionId);
          try {
            localStorage.setItem(STORAGE_SESSION_KEY, data.sessionId);
          } catch {
            // Ignore
          }
        }

        const assistantMsg: Message = {
          id: crypto.randomUUID(),
          sender: 'assistant',
          content: data.reply,
          intent: data.intent,
        };

        setMessages((prev) => [...prev, assistantMsg]);
        if (Array.isArray(data.quickReplies) && data.quickReplies.length > 0) {
          setQuickReplies(data.quickReplies);
        }
      } else {
        const errorMsg: Message = {
          id: crypto.randomUUID(),
          sender: 'assistant',
          content:
            lang === 'vi'
              ? 'Có lỗi xảy ra khi xử lý tin nhắn. Vui lòng thử lại sau.'
              : 'An error occurred while processing your message. Please try again.',
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
    } catch {
      const errorMsg: Message = {
        id: crypto.randomUUID(),
        sender: 'assistant',
        content:
          lang === 'vi'
            ? 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại kết nối mạng.'
            : 'Could not connect to the server. Please check your network connection.',
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    try {
      localStorage.removeItem(STORAGE_SESSION_KEY);
    } catch {
      // Ignore
    }
    setSessionId(null);
    setMessages([createWelcomeMessage(lang)]);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans print:hidden">
      {/* Floating Launcher Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center gap-2.5 px-4 py-3 rounded-full bg-[var(--page)] text-[var(--ink)] border border-[var(--line)] shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200"
          aria-label="Mở khung chat hỗ trợ"
        >
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
          </span>
          <span className="font-medium text-sm tracking-tight">Trợ lý AI 3D</span>
          <svg
            className="w-4 h-4 text-[var(--muted)] group-hover:text-[var(--accent)] transition-colors"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
        </button>
      )}

      {/* Chat Popover Window */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Khung chat hỗ trợ"
          className="flex flex-col w-[380px] sm:w-[420px] h-[580px] max-h-[85vh] rounded-2xl bg-[var(--page)] text-[var(--ink)] border border-[var(--line)] shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-[var(--line)] bg-[var(--track)]">
            <div className="flex items-center gap-2.5">
              <div className="relative w-8 h-8 rounded-full bg-[var(--accent)] text-white flex items-center justify-center font-bold text-xs shadow-sm">
                AI
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-[var(--page)]" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-semibold text-sm leading-none">E-commerce 3D Bot</h3>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--line)] text-[var(--muted)] font-mono">
                    Gemini 2.0
                  </span>
                </div>
                <p className="text-[11px] text-[var(--muted)] mt-0.5">
                  {lang === 'vi' ? 'Hỗ trợ: Sản phẩm • Đơn hàng • Thanh toán' : 'Support: Products • Orders • Payments'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleToggleLang}
                title="Đổi ngôn ngữ (VI / EN)"
                className="px-2 py-1 text-xs font-mono font-medium rounded border border-[var(--line)] hover:bg-[var(--line)] transition-colors"
              >
                {lang.toUpperCase()}
              </button>

              <button
                onClick={handleClearHistory}
                title="Làm mới cuộc trò chuyện"
                className="p-1.5 text-[var(--muted)] hover:text-[var(--ink)] rounded hover:bg-[var(--line)] transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </button>

              <button
                onClick={() => setIsOpen(false)}
                title="Đóng chat"
                className="p-1.5 text-[var(--muted)] hover:text-[var(--ink)] rounded hover:bg-[var(--line)] transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Message List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-sm">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-[var(--ink)] text-[var(--page)] rounded-br-xs'
                      : 'bg-[var(--track)] text-[var(--ink)] border border-[var(--line)] rounded-bl-xs'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex items-center gap-1.5 text-[var(--muted)] text-xs px-2 py-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-bounce" />
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-bounce [animation-delay:0.2s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-bounce [animation-delay:0.4s]" />
                <span className="ml-1">Đang suy nghĩ...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Replies Bar */}
          <div className="px-3 py-2 border-t border-[var(--line)] bg-[var(--page)] flex gap-1.5 overflow-x-auto no-scrollbar">
            {quickReplies.map((qr, index) => (
              <button
                key={index}
                onClick={() => handleSend(qr.prompt)}
                disabled={isLoading}
                className="whitespace-nowrap text-xs px-2.5 py-1 rounded-full border border-[var(--line)] hover:border-[var(--accent)] hover:text-[var(--accent)] text-[var(--soft)] transition-colors disabled:opacity-50"
              >
                {qr.label}
              </button>
            ))}
          </div>

          {/* Input Footer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-3 border-t border-[var(--line)] bg-[var(--track)] flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                lang === 'vi'
                  ? 'Hỏi về sản phẩm 3D, mã đơn hàng, thanh toán...'
                  : 'Ask about 3D products, order ID, payment...'
              }
              className="flex-1 bg-[var(--page)] text-[var(--ink)] text-sm px-3.5 py-2 rounded-xl border border-[var(--line)] focus:outline-none focus:border-[var(--accent)] transition-colors"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="p-2 rounded-xl bg-[var(--accent)] text-white hover:opacity-90 active:scale-95 disabled:opacity-40 transition-all"
              aria-label="Gửi tin nhắn"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
