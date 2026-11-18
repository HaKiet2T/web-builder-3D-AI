'use client';

import { useEffect, useRef } from 'react';
import {
  useAdminCopilotStore,
  COPILOT_QUICK_ACTIONS,
  type CopilotChatMessage,
} from '@/store/admin-copilot';
import { TactileMarkdown } from './TactileMarkdown';

export function AdminCopilotDrawer() {
  const isOpen = useAdminCopilotStore((s) => s.isOpen);
  const isLoading = useAdminCopilotStore((s) => s.isLoading);
  const input = useAdminCopilotStore((s) => s.input);
  const messages = useAdminCopilotStore((s) => s.messages);
  const setInput = useAdminCopilotStore((s) => s.setInput);
  const sendMessage = useAdminCopilotStore((s) => s.sendMessage);
  const closeDrawer = useAdminCopilotStore((s) => s.closeDrawer);
  const clearHistory = useAdminCopilotStore((s) => s.clearHistory);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus textarea when drawer opens
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        textareaRef.current?.focus();
      }, 80);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Auto-scroll to latest message
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    sendMessage();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Background Overlay */}
      <div
        className="admin-copilot-overlay"
        onClick={closeDrawer}
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.45)',
          backdropFilter: 'blur(4px)',
          zIndex: 1000,
        }}
      />

      {/* Slide-over Drawer Panel */}
      <aside
        className="admin-copilot-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="copilot-drawer-title"
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: 'min(520px, 100vw)',
          background: 'var(--page, #ffffff)',
          zIndex: 1001,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-12px 0 36px rgba(0, 0, 0, 0.15)',
          borderLeft: '1px solid var(--line, rgba(0, 0, 0, 0.15))',
        }}
      >
        {/* Drawer Header */}
        <header className="admin-copilot-header">
          <div className="admin-copilot-header-info">
            <div className="admin-copilot-status-indicator">
              <span className="admin-copilot-status-dot" aria-hidden="true" />
              <span className="admin-copilot-status-pulse" aria-hidden="true" />
            </div>
            <div>
              <h2 id="copilot-drawer-title" className="admin-copilot-title">
                Admin BI Copilot
              </h2>
              <p className="admin-copilot-subtitle">
                Gemini 2.0 Flash • Supabase DAL • Zero SQL Injection
              </p>
            </div>
          </div>

          <div className="admin-copilot-header-actions">
            <button
              type="button"
              onClick={clearHistory}
              title="Làm mới cuộc trò chuyện"
              aria-label="Làm mới cuộc trò chuyện"
              className="admin-copilot-icon-btn"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-4 h-4"
                aria-hidden="true"
                style={{ width: 16, height: 16 }}
              >
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
            </button>

            <button
              type="button"
              onClick={closeDrawer}
              title="Đóng bảng phân tích (Esc)"
              aria-label="Đóng bảng phân tích"
              className="admin-copilot-close-btn"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-4 h-4"
                aria-hidden="true"
                style={{ width: 18, height: 18 }}
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </header>

        {/* Quick Action Chips Bar */}
        <div className="admin-copilot-chips-bar" aria-label="Gợi ý truy vấn nhanh">
          <div className="admin-copilot-chips-scroll">
            {COPILOT_QUICK_ACTIONS.map((action) => (
              <button
                key={action.id}
                type="button"
                disabled={isLoading}
                onClick={() => sendMessage(action.prompt)}
                className="admin-copilot-chip"
              >
                <span className="admin-copilot-chip-icon" aria-hidden="true">
                  {action.icon}
                </span>
                <span>{action.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Messages Stream */}
        <div className="admin-copilot-messages-container" tabIndex={0}>
          {messages.map((msg: CopilotChatMessage) => (
            <div
              key={msg.id}
              className={`admin-copilot-message-row ${
                msg.role === 'user' ? 'is-user' : 'is-assistant'
              }`}
            >
              <div className="admin-copilot-bubble">
                {msg.role === 'assistant' && msg.toolsUsed && msg.toolsUsed.length > 0 && (
                  <div className="admin-copilot-tools-used">
                    <span className="admin-copilot-tools-label">Công cụ:</span>
                    {msg.toolsUsed.map((tool) => (
                      <span key={tool} className="admin-copilot-tool-tag">
                        {tool}
                      </span>
                    ))}
                  </div>
                )}

                <TactileMarkdown content={msg.content} />
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="admin-copilot-message-row is-assistant">
              <div className="admin-copilot-bubble is-loading">
                <div className="admin-copilot-loading-dots">
                  <span className="dot" />
                  <span className="dot" />
                  <span className="dot" />
                </div>
                <span className="admin-copilot-loading-text">
                  Đang phân tích số liệu và gọi công cụ DAL...
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Footer Input Form */}
        <footer className="admin-copilot-footer">
          <form onSubmit={handleSubmit} className="admin-copilot-form">
            <div className="admin-copilot-input-wrapper">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Hỏi về doanh thu, tồn kho, đơn chậm giao... (Enter để gửi)"
                rows={2}
                disabled={isLoading}
                className="admin-copilot-textarea"
                aria-label="Nhập câu hỏi phân tích dữ liệu cho AI"
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="admin-copilot-send-btn"
                aria-label="Gửi câu hỏi"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-4 h-4"
                  aria-hidden="true"
                  style={{ width: 16, height: 16 }}
                >
                  <path d="M22 2L11 13" />
                  <path d="M22 2L15 22L11 13L2 9L22 2Z" />
                </svg>
              </button>
            </div>
            <div className="admin-copilot-hints">
              <span>Enter để gửi</span>
              <span className="separator">•</span>
              <span>Shift + Enter xuống dòng</span>
              <span className="separator">•</span>
              <span>Esc để đóng</span>
            </div>
          </form>
        </footer>
      </aside>
    </>
  );
}
