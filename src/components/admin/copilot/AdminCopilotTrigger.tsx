'use client';

import { useEffect } from 'react';
import { useAdminCopilotStore } from '@/store/admin-copilot';

export function AdminCopilotTrigger() {
  const isOpen = useAdminCopilotStore((s) => s.isOpen);
  const toggleDrawer = useAdminCopilotStore((s) => s.toggleDrawer);
  const closeDrawer = useAdminCopilotStore((s) => s.closeDrawer);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for Ctrl+K or Cmd+K
      if ((event.ctrlKey || event.metaKey) && (event.key === 'k' || event.key === 'K')) {
        event.preventDefault();
        toggleDrawer();
      } else if (event.key === 'Escape' && isOpen) {
        event.preventDefault();
        closeDrawer();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, toggleDrawer, closeDrawer]);

  return (
    <button
      type="button"
      onClick={toggleDrawer}
      className={`admin-copilot-trigger ${isOpen ? 'is-active' : ''}`}
      style={{ width: '100%', minHeight: 42, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
      aria-label="Mở trợ lý phân tích Admin BI Copilot (Ctrl + K)"
      aria-expanded={isOpen}
      aria-haspopup="dialog"
      title="Mở trợ lý phân tích Admin BI Copilot (Ctrl + K)"
    >
      <span className="admin-copilot-trigger-label" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        <svg
          className="admin-copilot-trigger-icon"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          style={{ width: 16, height: 16, flexShrink: 0 }}
        >
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
        </svg>
        <span>AI Copilot</span>
      </span>
      <kbd className="admin-copilot-kbd">Ctrl K</kbd>
    </button>
  );
}
