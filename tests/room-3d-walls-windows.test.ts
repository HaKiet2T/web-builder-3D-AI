import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { RoomSetupInputSchema, WindowConfigSchema } from '../src/lib/room/schema.ts';
import { SAMPLE_ROOM_SETUPS } from '../src/lib/room/sample-data.ts';

const roomStage3DContent = readFileSync('src/components/room/RoomStage3D.tsx', 'utf8');
const roomStage3DCss = readFileSync('src/components/room/room-stage-3d.css', 'utf8');
const adminEditorContent = readFileSync('src/app/admin/(dashboard)/rooms/AdminRoomEditor.tsx', 'utf8');
const roomViewerContent = readFileSync('src/components/room/RoomViewer.tsx', 'utf8');
const typesContent = readFileSync('src/lib/room/types.ts', 'utf8');
const schemaContent = readFileSync('src/lib/room/schema.ts', 'utf8');
const actionsContent = readFileSync('src/app/admin/(dashboard)/rooms/actions.ts', 'utf8');

describe('Room 3D Space: Flush Wall Placement, Wall Count & Draggable Windows', () => {
  describe('Flush-to-Wall and Corner Placement', () => {
    it('sets ROOM_SPAN to 7.7 and FLUSH_BOUNDARY to 3.85 for flush wall placement', () => {
      assert.match(roomStage3DContent, /FLUSH_BOUNDARY\s*=\s*3\.85/);
      assert.match(roomStage3DContent, /ROOM_SPAN\s*=\s*7\.7/);
    });

    it('allows full 0% to 100% coordinate clamping in xToPct and zToPct', () => {
      assert.match(roomStage3DContent, /clamp\(pct,\s*0,\s*100\)/);
    });

    it('implements magnetic snapping for flush wall and corner positioning', () => {
      assert.match(roomStage3DContent, /SNAP_THRESHOLD\s*=\s*0\.22/);
      assert.match(roomStage3DContent, /clampedZ\s*=\s*-FLUSH_BOUNDARY/);
      assert.match(roomStage3DContent, /clampedX\s*=\s*-FLUSH_BOUNDARY/);
      assert.match(roomStage3DContent, /clampedX\s*=\s*FLUSH_BOUNDARY/);
    });

    it('provides visual status toasts when items snap to walls or corners', () => {
      assert.match(roomStage3DContent, /Đã kê sát góc phòng/);
      assert.match(roomStage3DContent, /Đã kê sát tường sau/);
      assert.match(roomStage3DContent, /Đã kê sát tường trái/);
      assert.match(roomStage3DContent, /room-stage-3d-snap-toast/);
    });
  });

  describe('Configurable Wall Count (1 to 3 Walls)', () => {
    it('declares wallCount in types and schema allowing 1 to 3 walls', () => {
      assert.match(typesContent, /wallCount\?:\s*number/);
      assert.match(schemaContent, /wallCount:\s*z\.number\(\)\.int\(\)\.min\(1/);
    });

    it('validates wallCount strictly with Zod schema', () => {
      const validSetup = {
        slug: 'test-walls-room',
        title: 'Phòng thử nghiệm tường',
        bgImageUrl: '/home/test.png',
        wallCount: 3,
        windows: [],
      };
      const parsed = RoomSetupInputSchema.safeParse(validSetup);
      assert.ok(parsed.success);
      assert.equal(parsed.data?.wallCount, 3);

      const invalidSetup = {
        ...validSetup,
        wallCount: 4,
      };
      const invalidParsed = RoomSetupInputSchema.safeParse(invalidSetup);
      assert.equal(invalidParsed.success, false);
    });

    it('declares 3 wall meshes in RoomStage3D: back, left, and right', () => {
      assert.match(roomStage3DContent, /backWallRef/);
      assert.match(roomStage3DContent, /leftWallRef/);
      assert.match(roomStage3DContent, /rightWallRef/);
    });

    it('dynamically toggles left and right wall visibility based on wallCount', () => {
      assert.match(roomStage3DContent, /leftWallRef\.current\.visible\s*=\s*wallCount\s*>=\s*2/);
      assert.match(roomStage3DContent, /rightWallRef\.current\.visible\s*=\s*wallCount\s*===\s*3/);
    });

    it('provides wall count selector in topbar HUD and admin editor', () => {
      assert.match(roomStage3DContent, /1 tường/);
      assert.match(roomStage3DContent, /2 tường \(Góc\)/);
      assert.match(roomStage3DContent, /3 tường \(Kín 3 bên\)/);
      assert.match(adminEditorContent, /Số mặt tường không gian 3D/);
      assert.match(roomStage3DCss, /\.room-stage-3d-wall-selector/);
    });
  });

  describe('Draggable Windows on Walls with Customizable Count', () => {
    it('declares WindowConfig in types and WindowConfigSchema in schema', () => {
      assert.match(typesContent, /export interface WindowConfig/);
      assert.match(typesContent, /wall:\s*['"]back['"]\s*\|\s*['"]left['"]\s*\|\s*['"]right['"]/);
      assert.match(typesContent, /positionPct:\s*number/);
      assert.match(schemaContent, /export const WindowConfigSchema\s*=/);
    });

    it('validates WindowConfigSchema correctly', () => {
      const validWin = {
        id: 'win-1',
        wall: 'back',
        positionPct: 45,
        width: 2.0,
        height: 1.6,
        elevationY: 2.1,
      };
      const parsed = WindowConfigSchema.safeParse(validWin);
      assert.ok(parsed.success);
      assert.equal(parsed.data?.positionPct, 45);

      const invalidWin = {
        id: 'win-bad',
        wall: 'ceiling', // invalid wall
        positionPct: 50,
      };
      const badParsed = WindowConfigSchema.safeParse(invalidWin);
      assert.equal(badParsed.success, false);
    });

    it('constructs realistic 3D window meshes with frame, glass, mullions, and sill', () => {
      assert.match(roomStage3DContent, /name\s*=\s*`Window_\$\{win\.id\}`/);
      assert.match(roomStage3DContent, /userData\s*=\s*\{\s*isWindow:\s*true/);
      assert.match(roomStage3DContent, /glassMat/);
      assert.match(roomStage3DContent, /sillGeo/);
      assert.match(roomStage3DContent, /hBar/);
      assert.match(roomStage3DContent, /vBar/);
    });

    it('enables direct interactive dragging of windows in 3D scene', () => {
      assert.match(roomStage3DContent, /isDraggingWindowRef/);
      assert.match(roomStage3DContent, /draggingWindowIdRef/);
      assert.match(roomStage3DContent, /windowDragPlaneRef/);
      assert.match(roomStage3DContent, /newPct\s*=\s*clamp/);
    });

    it('provides sliding position adjustment controls in window drawer and HUD', () => {
      assert.match(roomStage3DContent, /room-stage-3d-space-drawer/);
      assert.match(roomStage3DContent, /room-stage-3d-slider/);
      assert.match(roomStage3DContent, /\+ Thêm cửa sổ mới/);
      assert.match(roomStage3DCss, /\.room-stage-3d-space-drawer/);
      assert.match(roomStage3DCss, /\.room-stage-3d-slider/);
    });

    it('propagates onUpdateSetup callback between RoomStage3D, AdminRoomEditor, and RoomViewer', () => {
      assert.match(roomStage3DContent, /onUpdateSetup\?:\s*\(updatedSetup:/);
      assert.match(adminEditorContent, /onUpdateSetup=\{\(updated\)\s*=>\s*setSetup/);
      assert.match(roomViewerContent, /onUpdateSetup=\{\(updated\)\s*=>\s*(?:setSetup|setCurrentSetup)/);
      assert.match(actionsContent, /wallCount:\s*Number/);
      assert.match(actionsContent, /windows:\s*\(\(\)\s*=>/);
    });

    it('provides sample rooms with pre-configured wallCount and windows', () => {
      for (const sample of SAMPLE_ROOM_SETUPS) {
        assert.ok(sample.wallCount !== undefined, 'Sample room must define wallCount');
        assert.ok(Array.isArray(sample.windows), 'Sample room must define windows array');
      }
    });
  });

  describe('Zero Em Dash Compliance', () => {
    it('ensures zero em dash (U+2014) in all modified files', () => {
      const files = [
        roomStage3DContent,
        roomStage3DCss,
        adminEditorContent,
        roomViewerContent,
        typesContent,
        schemaContent,
        actionsContent,
      ];
      for (const content of files) {
        assert.ok(!content.includes('\u2014'), 'File must not contain em dash (U+2014)');
      }
    });
  });
});
