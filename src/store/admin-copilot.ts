'use client';

import { create } from 'zustand';

export interface CopilotChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  toolsUsed?: string[];
  turns?: number;
  createdAt: string;
}

export interface QuickActionPrompt {
  id: string;
  icon: string;
  label: string;
  prompt: string;
}

export const COPILOT_QUICK_ACTIONS: QuickActionPrompt[] = [
  {
    id: 'revenue-today',
    icon: '📊',
    label: 'Doanh thu hôm nay',
    prompt: 'Tình hình doanh thu hôm nay thế nào?',
  },
  {
    id: 'top-products',
    icon: '🏆',
    label: 'Top 5 bán chạy',
    prompt: 'Cho tôi xem top sản phẩm bán chạy nhất',
  },
  {
    id: 'inventory-alerts',
    icon: '⚠️',
    label: 'Cảnh báo tồn kho',
    prompt: 'Kiểm tra các cảnh báo tồn kho và hết hàng',
  },
  {
    id: 'unfulfilled-orders',
    icon: '📦',
    label: 'Đơn chờ đóng gói',
    prompt: 'Có những đơn hàng nào đang bị chậm đóng gói quá 24 giờ không?',
  },
];

export const INITIAL_COPILOT_MESSAGE: CopilotChatMessage = {
  id: 'copilot-welcome',
  role: 'assistant',
  content:
    'Xin chào! Tôi là **Admin BI Copilot**, trợ lý phân tích dữ liệu bán hàng thông minh. Tôi có thể hỗ trợ bạn đối soát doanh thu thực thu, kiểm tra cảnh báo tồn kho, rà soát đơn hàng nghẽn đóng gói và phân tích cơ cấu ngành hàng. Hãy chọn một gợi ý nhanh bên dưới hoặc đặt câu hỏi bất kỳ!',
  createdAt: new Date().toISOString(),
};

interface AdminCopilotState {
  isOpen: boolean;
  isLoading: boolean;
  input: string;
  messages: CopilotChatMessage[];
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
  setInput: (value: string) => void;
  clearHistory: () => void;
  sendMessage: (customText?: string) => Promise<void>;
}

export const useAdminCopilotStore = create<AdminCopilotState>((set, get) => ({
  isOpen: false,
  isLoading: false,
  input: '',
  messages: [INITIAL_COPILOT_MESSAGE],

  openDrawer: () => set({ isOpen: true }),
  closeDrawer: () => set({ isOpen: false }),
  toggleDrawer: () => set((state) => ({ isOpen: !state.isOpen })),
  setInput: (input) => set({ input }),

  clearHistory: () =>
    set({
      messages: [
        {
          ...INITIAL_COPILOT_MESSAGE,
          id: `copilot-welcome-${Date.now()}`,
          createdAt: new Date().toISOString(),
        },
      ],
      input: '',
    }),

  sendMessage: async (customText?: string) => {
    const textToSend = (customText !== undefined ? customText : get().input).trim();
    if (!textToSend || get().isLoading) return;

    const userMessage: CopilotChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: textToSend,
      createdAt: new Date().toISOString(),
    };

    const currentMessages = get().messages;
    const nextMessages = [...currentMessages, userMessage];

    set({
      messages: nextMessages,
      input: '',
      isLoading: true,
    });

    try {
      const historyPayload = nextMessages
        .filter((m) => m.id !== 'copilot-welcome' && !m.id.startsWith('copilot-welcome-'))
        .slice(-10)
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      const res = await fetch('/api/admin/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          history: historyPayload.slice(0, -1),
        }),
      });

      const data = await res.json();

      if (res.ok && data.ok) {
        const assistantMessage: CopilotChatMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: data.reply || 'Không có phản hồi từ máy chủ.',
          toolsUsed: data.toolsUsed,
          turns: data.turns,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          messages: [...state.messages, assistantMessage],
          isLoading: false,
        }));
      } else {
        const errorMessage: CopilotChatMessage = {
          id: `assistant-error-${Date.now()}`,
          role: 'assistant',
          content: `Lỗi: ${data.error || 'Không thể xử lý câu hỏi phân tích dữ liệu.'}`,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          messages: [...state.messages, errorMessage],
          isLoading: false,
        }));
      }
    } catch (err) {
      const errorMessage: CopilotChatMessage = {
        id: `assistant-network-error-${Date.now()}`,
        role: 'assistant',
        content: `Lỗi kết nối: ${err instanceof Error ? err.message : 'Không thể kết nối đến máy chủ API.'}`,
        createdAt: new Date().toISOString(),
      };
      set((state) => ({
        messages: [...state.messages, errorMessage],
        isLoading: false,
      }));
    }
  },
}));
