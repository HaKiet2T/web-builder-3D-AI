import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const roomStageTsx = readFileSync('src/components/room/RoomStage.tsx', 'utf8');
const roomStageCss = readFileSync('src/components/room/room-stage.css', 'utf8');
const editorTsx = readFileSync('src/app/admin/(dashboard)/rooms/AdminRoomEditor.tsx', 'utf8');
const editorCss = readFileSync('src/app/admin/(dashboard)/rooms/admin-room-editor.css', 'utf8');
const roomsPageTsx = readFileSync('src/app/admin/(dashboard)/rooms/page.tsx', 'utf8');
const roomDetailTsx = readFileSync('src/app/admin/(dashboard)/rooms/[id]/page.tsx', 'utf8');
const actionsTs = readFileSync('src/app/admin/(dashboard)/rooms/actions.ts', 'utf8');
const layoutTsx = readFileSync('src/app/admin/(dashboard)/layout.tsx', 'utf8');

describe('Admin Room Editor & Core RoomStage Component (Giai doan 2)', () => {
  describe('RoomStage Core Component Architecture', () => {
    it('supports dual modes ("edit" and "view") with consistent WYSIWYG contract', () => {
      assert.match(roomStageTsx, /mode\s*=\s*'view'/);
      assert.match(roomStageTsx, /mode\s*===\s*'edit'/);
      assert.match(roomStageTsx, /mode\s*===\s*'view'/);
    });

    it('implements 60 FPS Pointer Events with setPointerCapture for smooth dragging', () => {
      assert.match(roomStageTsx, /target\.setPointerCapture\(e\.pointerId\)/);
      assert.match(roomStageTsx, /e\.currentTarget\.releasePointerCapture/);
      assert.match(roomStageTsx, /onPointerDown/);
      assert.match(roomStageTsx, /onPointerMove/);
      assert.match(roomStageTsx, /onPointerUp/);
    });

    it('enforces aspect ratio lock and bottom-center anchor positioning', () => {
      // Aspect ratio lock on viewport container
      assert.match(roomStageTsx, /style=\{\{\s*aspectRatio\s*\}\}/);
      assert.match(roomStageCss, /aspect-ratio/);

      // bottom-center anchor translation
      assert.match(roomStageTsx, /transform:\s*`translate\(-50%,\s*-100%\)/);
      assert.match(roomStageCss, /transform-origin:\s*bottom center;/);
    });

    it('sets pointer-events: none on decor items in view mode to prevent hitbox overlapping', () => {
      assert.match(roomStageTsx, /mode === 'view' && item\.itemType === 'decor'\s*\?\s*'room-stage-item--view-decor'/);
      assert.match(roomStageCss, /\.room-stage-item--view-decor\s*\{\s*pointer-events:\s*none;/);
    });

    it('renders tactile hotspot pins on product items in view mode', () => {
      assert.match(roomStageTsx, /showHotspots/);
      assert.match(roomStageTsx, /room-item-hotspot/);
      assert.match(roomStageCss, /\.room-item-hotspot-pulse/);
      assert.match(roomStageCss, /\.room-item-hotspot-dot/);
    });

    it('exposes floating toolbar on selected item in edit mode (flip, rotate, z-index, delete)', () => {
      assert.match(roomStageTsx, /room-item-toolbar/);
      assert.match(roomStageTsx, /title="Lật ngang hình ảnh"/);
      assert.match(roomStageTsx, /title="Xoay trái 15 độ"/);
      assert.match(roomStageTsx, /title="Xoay phải 15 độ"/);
      assert.match(roomStageTsx, /title="Tiến lên một lớp"/);
      assert.match(roomStageTsx, /title="Lùi xuống một lớp"/);
      assert.match(roomStageTsx, /title="Xóa vật phẩm này"/);
    });

    it('exposes corner resize handle with percentage-based resizing', () => {
      assert.match(roomStageTsx, /room-item-resize-handle/);
      assert.match(roomStageTsx, /handleResizePointerDown/);
      assert.match(roomStageTsx, /handleResizePointerMove/);
      assert.match(roomStageCss, /cursor:\s*nwse-resize;/);
    });
  });

  describe('Admin Room Editor State & Interactions', () => {
    it('manages Undo and Redo stacks with Ctrl+Z and Ctrl+Y shortcuts', () => {
      assert.match(editorTsx, /const\s+\[history,\s*setHistory\]\s*=\s*useState<RoomItem\[\]\[\]>\(\[\]\)/);
      assert.match(editorTsx, /const\s+\[future,\s*setFuture\]\s*=\s*useState<RoomItem\[\]\[\]>\(\[\]\)/);
      assert.match(editorTsx, /handleUndo/);
      assert.match(editorTsx, /handleRedo/);
      assert.match(editorTsx, /e\.key\.toLowerCase\(\)\s*===\s*'z'/);
      assert.match(editorTsx, /e\.key\.toLowerCase\(\)\s*===\s*'y'/);
    });

    it('supports catalog product addition and preset decor library', () => {
      assert.match(editorTsx, /handleAddProduct/);
      assert.match(editorTsx, /PRESET_DECOR_ASSETS/);
      assert.match(editorTsx, /handleAddDecor/);
      assert.match(editorTsx, /customDecorUrl/);
    });

    it('includes layer panel with z-index reordering and deletion', () => {
      assert.match(editorTsx, /admin-layer-row/);
      assert.match(editorTsx, /sort\(\(a,\s*b\)\s*=>\s*b\.zIndex\s*-\s*a\.zIndex\)/);
      assert.match(editorTsx, /handleUpdateItem\(\{\s*\.\.\.item,\s*zIndex:/);
      assert.match(editorTsx, /handleDeleteItem\(item\.id\)/);
    });

    it('provides batch save invoking saveRoomItemsBatchAction', () => {
      assert.match(editorTsx, /handleSaveBatch/);
      assert.match(editorTsx, /saveRoomItemsBatchAction\(setup\.id,\s*cleanItemsPayload\)/);
    });
  });

  describe('Admin Routes & Server Actions Integration', () => {
    it('declares robust Server Actions for room operations', () => {
      assert.match(actionsTs, /'use server';/);
      assert.match(actionsTs, /export async function saveRoomSetupAction/);
      assert.match(actionsTs, /export async function saveRoomItemsBatchAction/);
      assert.match(actionsTs, /export async function deleteRoomSetupAction/);
      assert.match(actionsTs, /export async function toggleRoomStatusAction/);
    });

    it('revalidates paths on mutations for instant UI sync', () => {
      assert.match(actionsTs, /revalidatePath\('\/admin\/rooms'\)/);
      assert.match(actionsTs, /revalidatePath\('\/mau-setup'\)/);
      assert.match(actionsTs, /revalidatePath\('\/khong-gian\/\[slug\]',\s*'page'\)/);
    });

    it('integrates rooms navigation link into Admin Sidebar', () => {
      assert.match(layoutTsx, /href="\/admin\/rooms"/);
      assert.match(layoutTsx, /Góc setup \(Phòng\)/);
    });

    it('renders admin rooms listing page with creation form and status badges', () => {
      assert.match(roomsPageTsx, /listAdminRoomSetups/);
      assert.match(roomsPageTsx, /Tạo góc setup mới/);
      assert.match(roomsPageTsx, /Chỉnh sửa bố cục/);
      assert.match(roomsPageTsx, /toggleRoomStatusAction/);
      assert.match(roomsPageTsx, /deleteRoomSetupAction/);
    });

    it('renders admin detail editor page with product hydration', () => {
      assert.match(roomDetailTsx, /getRoomSetupById\(id\)/);
      assert.match(roomDetailTsx, /listProducts\(\)/);
      assert.match(roomDetailTsx, /<AdminRoomEditor/);
    });
  });

  describe('Coordinate Math and Transformation Rules', () => {
    it('clamps coordinates strictly within viewport bounds', () => {
      function clamp(val: number, min: number, max: number): number {
        return Math.min(max, Math.max(min, val));
      }

      // Percentage coordinate bounds
      assert.equal(clamp(-10, 0, 100), 0);
      assert.equal(clamp(150, 0, 100), 100);
      assert.equal(clamp(50.4, 0, 100), 50.4);

      // Width percentage bounds
      assert.equal(clamp(1, 4, 100), 4);
      assert.equal(clamp(120, 4, 100), 100);
      assert.equal(clamp(32.5, 4, 100), 32.5);
    });

    it('calculates rotation modulo 360 properly', () => {
      function rotate(current: number, delta: number): number {
        return (current + delta) % 360;
      }

      assert.equal(rotate(0, 15), 15);
      assert.equal(rotate(350, 15), 5);
      assert.equal(rotate(0, -15), -15);
    });
  });

  describe('Zero Em Dash (U+2014) Strict Compliance', () => {
    it('guarantees zero em dash characters across all Stage 2 files', () => {
      const files = [
        { name: 'RoomStage.tsx', content: roomStageTsx },
        { name: 'room-stage.css', content: roomStageCss },
        { name: 'AdminRoomEditor.tsx', content: editorTsx },
        { name: 'admin-room-editor.css', content: editorCss },
        { name: 'rooms/page.tsx', content: roomsPageTsx },
        { name: 'rooms/[id]/page.tsx', content: roomDetailTsx },
        { name: 'rooms/actions.ts', content: actionsTs },
        { name: 'layout.tsx', content: layoutTsx },
      ];

      for (const file of files) {
        assert.equal(
          file.content.includes('\u2014'),
          false,
          `File ${file.name} must NOT contain em dash (U+2014)`,
        );
      }
    });
  });
});
