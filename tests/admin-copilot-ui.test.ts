import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import {
  useAdminCopilotStore,
  COPILOT_QUICK_ACTIONS,
  INITIAL_COPILOT_MESSAGE,
} from '../src/store/admin-copilot.ts';
import {
  tokenizeInlineMarkdown,
  parseMarkdownTable,
  sanitizeEmDash,
} from '../src/lib/admin/copilot-markdown.ts';

const adminLayoutCode = readFileSync('src/app/admin/(dashboard)/layout.tsx', 'utf8');
const triggerCode = readFileSync('src/components/admin/copilot/AdminCopilotTrigger.tsx', 'utf8');
const drawerCode = readFileSync('src/components/admin/copilot/AdminCopilotDrawer.tsx', 'utf8');
const markdownCode = readFileSync('src/components/admin/copilot/TactileMarkdown.tsx', 'utf8');
const markdownLibCode = readFileSync('src/lib/admin/copilot-markdown.ts', 'utf8');
const storeCode = readFileSync('src/store/admin-copilot.ts', 'utf8');
const globalCssCode = readFileSync('src/app/globals.css', 'utf8');

describe('Admin BI Copilot Drawer & Slide-over UI Architecture (Giai đoạn 4)', () => {
  describe('AdminLayout Shell Integration', () => {
    it('maintains async Server Component signature for AdminLayout with redirect protection', () => {
      assert.match(adminLayoutCode, /export default async function AdminLayout/);
      assert.doesNotMatch(adminLayoutCode, /export default function AdminLayout[\s\S]*<Suspense/);
      assert.match(adminLayoutCode, /redirect\('\/admin\/login'\)/);
    });

    it('embeds AdminCopilotTrigger in sidebar nav and AdminCopilotDrawer in root admin shell', () => {
      assert.match(adminLayoutCode, /import \{ AdminCopilotTrigger, AdminCopilotDrawer \} from '@/);
      assert.match(adminLayoutCode, /<AdminCopilotTrigger \/>/);
      assert.match(adminLayoutCode, /<AdminCopilotDrawer \/>/);
    });
  });

  describe('AdminCopilotTrigger & Keyboard Shortcuts', () => {
    it('handles global Ctrl+K / Cmd+K and Escape keyboard navigation', () => {
      assert.match(triggerCode, /event\.ctrlKey \|\| event\.metaKey/);
      assert.match(triggerCode, /event\.key === 'k' \|\| event\.key === 'K'/);
      assert.match(triggerCode, /event\.key === 'Escape'/);
      assert.match(triggerCode, /window\.addEventListener\('keydown', handleKeyDown\)/);
      assert.match(triggerCode, /window\.removeEventListener\('keydown', handleKeyDown\)/);
    });

    it('renders tactile button with label, kbd hint, and accessibility attributes', () => {
      assert.match(triggerCode, /className=\{`admin-copilot-trigger \$\{isOpen \? 'is-active' : ''\}`\}/);
      assert.match(triggerCode, /<kbd className="admin-copilot-kbd">Ctrl K<\/kbd>/);
      assert.match(triggerCode, /aria-label="Mở trợ lý phân tích Admin BI Copilot \(Ctrl \+ K\)"/);
      assert.match(triggerCode, /aria-expanded=\{isOpen\}/);
      assert.match(triggerCode, /aria-haspopup="dialog"/);
    });
  });

  describe('AdminCopilotDrawer Structure & Tactile UX', () => {
    it('conditionally hides when closed and renders modal drawer when opened', () => {
      assert.match(drawerCode, /if \(!isOpen\) return null;/);
      assert.match(drawerCode, /className="admin-copilot-overlay"/);
      assert.match(drawerCode, /className="admin-copilot-panel"/);
      assert.match(drawerCode, /role="dialog"/);
      assert.match(drawerCode, /aria-modal="true"/);
    });

    it('renders glowing status indicator and header action buttons', () => {
      assert.match(drawerCode, /admin-copilot-status-dot/);
      assert.match(drawerCode, /admin-copilot-status-pulse/);
      assert.match(drawerCode, /Admin BI Copilot/);
      assert.match(drawerCode, /clearHistory/);
      assert.match(drawerCode, /closeDrawer/);
    });

    it('provides all 4 core Quick Action Chips', () => {
      assert.equal(COPILOT_QUICK_ACTIONS.length, 4);
      const actionIds = COPILOT_QUICK_ACTIONS.map((a) => a.id);
      assert.deepEqual(actionIds, [
        'revenue-today',
        'top-products',
        'inventory-alerts',
        'unfulfilled-orders',
      ]);

      assert.match(drawerCode, /COPILOT_QUICK_ACTIONS\.map/);
      assert.match(drawerCode, /admin-copilot-chip/);
    });

    it('renders tool execution badges and uses TactileMarkdown for assistant replies', () => {
      assert.match(drawerCode, /admin-copilot-tools-used/);
      assert.match(drawerCode, /admin-copilot-tool-tag/);
      assert.match(drawerCode, /<TactileMarkdown content=\{msg\.content\} \/>/);
    });

    it('supports Enter key submission and Shift+Enter multi-line input', () => {
      assert.match(drawerCode, /e\.key === 'Enter' && !e\.shiftKey/);
      assert.match(drawerCode, /textareaRef\.current\?\.focus\(\)/);
      assert.match(drawerCode, /admin-copilot-hints/);
    });
  });

  describe('TactileMarkdown Parser and Zero-dependency Engine', () => {
    it('tokenizes inline bold, inline code, and plain text safely', () => {
      const tokens = tokenizeInlineMarkdown('Tổng doanh thu: **18.900.000 ₫** cho mã `ORD-001`');
      assert.equal(tokens.length, 4);
      assert.deepEqual(tokens[0], { type: 'text', value: 'Tổng doanh thu: ' });
      assert.deepEqual(tokens[1], { type: 'bold', value: '18.900.000 ₫' });
      assert.deepEqual(tokens[2], { type: 'text', value: ' cho mã ' });
      assert.deepEqual(tokens[3], { type: 'code', value: 'ORD-001' });
    });

    it('strictly replaces any em dash with hyphen in sanitizeEmDash', () => {
      const emDashInput = 'Doanh thu \u2014 Tăng trưởng \u2014 Kết quả';
      const sanitized = sanitizeEmDash(emDashInput);
      assert.equal(sanitized, 'Doanh thu - Tăng trưởng - Kết quả');
      assert.doesNotMatch(sanitized, /\u2014/);
    });

    it('parses markdown table syntax into structured headers and rows', () => {
      const lines = [
        '| Tên sản phẩm | SKU | Tồn kho | Trạng thái |',
        '|---|---|---|---|',
        '| Màn hình ASUS ROG | `ROG-XG27` | 0 | Hết hàng |',
        '| Bàn phím cơ HyperWork | `KB-HW-01` | 4 | Sắp hết |',
      ];
      const table = parseMarkdownTable(lines);
      assert.notEqual(table, null);
      assert.deepEqual(table?.headers, ['Tên sản phẩm', 'SKU', 'Tồn kho', 'Trạng thái']);
      assert.equal(table?.rows.length, 2);
      assert.deepEqual(table?.rows[0], ['Màn hình ASUS ROG', '`ROG-XG27`', '0', 'Hết hàng']);
      assert.deepEqual(table?.rows[1], ['Bàn phím cơ HyperWork', '`KB-HW-01`', '4', 'Sắp hết']);
    });

    it('returns null for invalid or non-table lines', () => {
      const nonTable = ['Chỉ là một dòng văn bản bình thường', '| không có thanh phân cách |'];
      assert.equal(parseMarkdownTable(nonTable), null);
    });

    it('structures headings and bullet lists in TactileMarkdown component', () => {
      assert.match(markdownCode, /admin-copilot-h3/);
      assert.match(markdownCode, /admin-copilot-list/);
      assert.match(markdownCode, /admin-copilot-list-item/);
      assert.match(markdownCode, /admin-copilot-table-wrap/);
    });
  });

  describe('Zustand Copilot Store State Machine', () => {
    it('manages drawer open/close and toggle states', () => {
      const store = useAdminCopilotStore.getState();
      assert.equal(store.isOpen, false);

      store.openDrawer();
      assert.equal(useAdminCopilotStore.getState().isOpen, true);

      store.closeDrawer();
      assert.equal(useAdminCopilotStore.getState().isOpen, false);

      store.toggleDrawer();
      assert.equal(useAdminCopilotStore.getState().isOpen, true);

      store.closeDrawer();
    });

    it('initializes with a polite and informative welcome message', () => {
      const store = useAdminCopilotStore.getState();
      assert.equal(store.messages.length >= 1, true);
      assert.equal(store.messages[0].role, 'assistant');
      assert.equal(store.messages[0].content, INITIAL_COPILOT_MESSAGE.content);
      assert.match(store.messages[0].content, /Admin BI Copilot/);
    });

    it('clears chat history back to welcome state', () => {
      const store = useAdminCopilotStore.getState();
      store.setInput('Test message');
      store.clearHistory();
      assert.equal(useAdminCopilotStore.getState().input, '');
      assert.equal(useAdminCopilotStore.getState().messages.length, 1);
    });
  });

  describe('CSS System Integration & Em Dash Compliance', () => {
    it('defines tactile styles for trigger, drawer, badges, tables, and quick action chips', () => {
      assert.match(globalCssCode, /\.admin-copilot-trigger/);
      assert.match(globalCssCode, /\.admin-copilot-kbd/);
      assert.match(globalCssCode, /\.admin-copilot-panel/);
      assert.match(globalCssCode, /\.admin-copilot-chips-bar/);
      assert.match(globalCssCode, /\.admin-copilot-chip/);
      assert.match(globalCssCode, /\.admin-copilot-table/);
    });

    it('strictly forbids any em dash character (U+2014) across all Giai đoạn 4 files', () => {
      assert.doesNotMatch(triggerCode, /\u2014/);
      assert.doesNotMatch(drawerCode, /\u2014/);
      assert.doesNotMatch(markdownCode, /\u2014/);
      assert.doesNotMatch(markdownLibCode, /\u2014/);
      assert.doesNotMatch(storeCode, /\u2014/);
      assert.doesNotMatch(adminLayoutCode, /\u2014/);
    });
  });
});
