'use client';

import { useEffect, useRef, useState } from 'react';
import type { QuickReply } from '@/lib/chat/schema';
import { useCartStore } from '@/store/cart';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  intent?: string;
  createdAt?: string;
}

const STORAGE_SESSION_KEY = 'ecommerce_3d_chat_session_id';
const STORAGE_DOCK_KEY = 'ecommerce_3d_chat_dock_pos';

type DockPosition = 'bottom-right' | 'bottom-left';

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
  const isCartOpen = useCartStore((state) => state.isOpen);
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [dockPosition, setDockPosition] = useState<DockPosition>(() => {
    if (typeof window === 'undefined') return 'bottom-right';
    try {
      const savedDock = localStorage.getItem(STORAGE_DOCK_KEY);
      if (savedDock === 'bottom-right' || savedDock === 'bottom-left') {
        return savedDock;
      }
    } catch {
      // Ignore localStorage errors
    }
    return 'bottom-right';
  });
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [lang, setLang] = useState<'vi' | 'en'>('vi');
  const [messages, setMessages] = useState<Message[]>(() => [createWelcomeMessage('vi')]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>(DEFAULT_VI_QUICK_REPLIES);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragStartRef = useRef<{ startX: number; startY: number; initX: number; initY: number } | null>(null);
  const hasMovedRef = useRef(false);

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
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      inputRef.current?.focus();
    }
  }, [isOpen, isMinimized, messages, isLoading]);

  const handleToggleLang = () => {
    const nextLang = lang === 'vi' ? 'en' : 'vi';
    setLang(nextLang);
    setQuickReplies(nextLang === 'vi' ? DEFAULT_VI_QUICK_REPLIES : DEFAULT_EN_QUICK_REPLIES);
  };

  const handleToggleDock = () => {
    setDragOffset(null);
    const nextDock: DockPosition = dockPosition === 'bottom-right' ? 'bottom-left' : 'bottom-right';
    setDockPosition(nextDock);
    try {
      localStorage.setItem(STORAGE_DOCK_KEY, nextDock);
    } catch {
      // Ignore
    }
  };

  const handleToggleMinimize = () => {
    setIsMinimized((prev) => !prev);
  };

  const handleResetPosition = () => {
    setDragOffset(null);
  };

  // Drag and drop handlers with screen clamping
  const handlePointerDown = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button, input, textarea, a, form')) return;

    e.preventDefault();
    setIsDragging(true);
    hasMovedRef.current = false;

    const currentX = dragOffset?.x ?? 0;
    const currentY = dragOffset?.y ?? 0;

    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initX: currentX,
      initY: currentY,
    };

    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (!dragStartRef.current) return;
      const deltaX = moveEvent.clientX - dragStartRef.current.startX;
      const deltaY = moveEvent.clientY - dragStartRef.current.startY;

      if (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4) {
        hasMovedRef.current = true;
      }

      const nextX = dragStartRef.current.initX + deltaX;
      const nextY = dragStartRef.current.initY + deltaY;

      setDragOffset({ x: nextX, y: nextY });
    };

    const handlePointerUp = () => {
      setIsDragging(false);
      dragStartRef.current = null;
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
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

  // Determine effective dock placement:
  // When Cart Drawer is open, automatically switch to bottom-left if no manual drag offset exists,
  // preventing any overlap with the cart drawer and its checkout button.
  const effectiveDock: DockPosition = isCartOpen && !dragOffset ? 'bottom-left' : dockPosition;

  // On mobile screens (< sm), if the Cart Drawer is open (taking 100vw),
  // hide the launcher to guarantee completely unobstructed checkout tap target.
  const mobileVisibilityClass = isCartOpen ? 'hidden sm:block' : 'block';

  // Base positioning styling depending on effective dock
  const dockPositionClasses =
    effectiveDock === 'bottom-left'
      ? 'left-4 sm:left-6 bottom-4 sm:bottom-6'
      : 'right-4 sm:right-6 bottom-4 sm:bottom-6';

  const transformStyle = dragOffset
    ? { transform: `translate3d(${dragOffset.x}px, ${dragOffset.y}px, 0px)` }
    : undefined;

  const draggingClass = isDragging ? 'opacity-90 ring-2 ring-[var(--accent)] shadow-2xl' : '';

  return (
    <div
      style={transformStyle}
      className={`fixed ${dockPositionClasses} z-40 font-sans print:hidden select-none transition-all duration-300 ease-out ${mobileVisibilityClass} ${draggingClass}`}
    >
      {/* Floating Launcher Button */}
      {!isOpen && (
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              if (!hasMovedRef.current) {
                setIsOpen(true);
                setIsMinimized(false);
              }
            }}
            onPointerDown={handlePointerDown}
            className={`group relative flex items-center gap-2.5 px-4 py-3 rounded-full bg-[var(--page)] text-[var(--ink)] border border-[var(--line)] shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200 ${
              isDragging ? 'cursor-grabbing' : 'cursor-grab'
            }`}
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

          {/* Quick Dock Switch Button on Launcher */}
          <button
            type="button"
            onClick={handleToggleDock}
            title={
              effectiveDock === 'bottom-right'
                ? lang === 'vi'
                  ? 'Chuyển sang góc trái'
                  : 'Dock to left'
                : lang === 'vi'
                  ? 'Chuyển sang góc phải'
                  : 'Dock to right'
            }
            aria-label="Đổi vị trí dock (trái / phải)"
            className="p-2.5 rounded-full bg-[var(--page)] text-[var(--muted)] hover:text-[var(--ink)] border border-[var(--line)] shadow-md hover:shadow-lg transition-all active:scale-95"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </button>
        </div>
      )}

      {/* Chat Popover Window (Minimized State) */}
      {isOpen && isMinimized && (
        <div
          role="dialog"
          aria-label="Khung chat hỗ trợ (thu nhỏ)"
          className={`flex items-center justify-between w-[300px] sm:w-[340px] px-3.5 py-2.5 rounded-2xl bg-[var(--page)] text-[var(--ink)] border border-[var(--line)] shadow-2xl animate-in fade-in duration-200 ${
            isDragging ? 'cursor-grabbing' : 'cursor-grab'
          }`}
          onPointerDown={handlePointerDown}
        >
          <div className="flex items-center gap-2 cursor-pointer" onClick={handleToggleMinimize}>
            <div className="relative w-6 h-6 rounded-full bg-[var(--accent)] text-white flex items-center justify-center font-bold text-[10px]">
              AI
              <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 ring-1 ring-[var(--page)]" />
            </div>
            <span className="font-semibold text-xs truncate">E-commerce 3D Bot</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleToggleDock}
              title={lang === 'vi' ? 'Đổi vị trí trái / phải' : 'Toggle dock'}
              aria-label="Đổi vị trí dock (trái / phải)"
              className="p-1 text-[var(--muted)] hover:text-[var(--ink)] rounded hover:bg-[var(--line)] transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </button>
            <button
              type="button"
              onClick={handleToggleMinimize}
              title={lang === 'vi' ? 'Mở rộng khung chat' : 'Expand chat'}
              aria-label="Mở rộng khung chat"
              className="p-1 text-[var(--muted)] hover:text-[var(--ink)] rounded hover:bg-[var(--line)] transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              title={lang === 'vi' ? 'Đóng chat' : 'Close chat'}
              aria-label="Đóng chat"
              className="p-1 text-[var(--muted)] hover:text-[var(--ink)] rounded hover:bg-[var(--line)] transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Chat Popover Window (Expanded State) */}
      {isOpen && !isMinimized && (
        <div
          role="dialog"
          aria-label="Khung chat hỗ trợ"
          className="flex flex-col w-[360px] sm:w-[420px] h-[560px] max-h-[82vh] rounded-2xl bg-[var(--page)] text-[var(--ink)] border border-[var(--line)] shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200"
        >
          {/* Header (with drag handle) */}
          <div
            onPointerDown={handlePointerDown}
            className={`flex items-center justify-between px-4 py-3 border-b border-[var(--line)] bg-[var(--track)] select-none ${
              isDragging ? 'cursor-grabbing' : 'cursor-grab'
            }`}
          >
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
              {dragOffset && (
                <button
                  type="button"
                  onClick={handleResetPosition}
                  title={lang === 'vi' ? 'Đặt lại vị trí mặc định' : 'Reset position'}
                  aria-label="Đặt lại vị trí"
                  className="p-1.5 text-[var(--muted)] hover:text-[var(--ink)] rounded hover:bg-[var(--line)] transition-colors text-xs"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 15v-1a4 4 0 00-4-4H4m0 0l3-3m-3 3l3 3m5 4v1a4 4 0 004 4h8m0 0l-3-3m3 3l-3 3" />
                  </svg>
                </button>
              )}

              <button
                type="button"
                onClick={handleToggleDock}
                title={
                  effectiveDock === 'bottom-right'
                    ? lang === 'vi'
                      ? 'Chuyển sang góc trái'
                      : 'Dock left'
                    : lang === 'vi'
                      ? 'Chuyển sang góc phải'
                      : 'Dock right'
                }
                aria-label="Đổi vị trí dock (trái / phải)"
                className="p-1.5 text-[var(--muted)] hover:text-[var(--ink)] rounded hover:bg-[var(--line)] transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </button>

              <button
                type="button"
                onClick={handleToggleLang}
                title="Đổi ngôn ngữ (VI / EN)"
                className="px-1.5 py-0.5 text-xs font-mono font-medium rounded border border-[var(--line)] hover:bg-[var(--line)] transition-colors"
              >
                {lang.toUpperCase()}
              </button>

              <button
                type="button"
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
                type="button"
                onClick={handleToggleMinimize}
                title={lang === 'vi' ? 'Thu nhỏ khung chat' : 'Minimize chat'}
                aria-label="Thu nhỏ khung chat"
                className="p-1.5 text-[var(--muted)] hover:text-[var(--ink)] rounded hover:bg-[var(--line)] transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
                </svg>
              </button>

              <button
                type="button"
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
