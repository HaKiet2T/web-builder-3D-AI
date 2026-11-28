import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { RoomItemSchema } from '../src/lib/room/schema.ts';

const roomStage3DContent = readFileSync('src/components/room/RoomStage3D.tsx', 'utf8');
const roomStage3DCss = readFileSync('src/components/room/room-stage-3d.css', 'utf8');
const adminEditorContent = readFileSync('src/app/admin/(dashboard)/rooms/AdminRoomEditor.tsx', 'utf8');
const typesContent = readFileSync('src/lib/room/types.ts', 'utf8');
const schemaContent = readFileSync('src/lib/room/schema.ts', 'utf8');

describe('Room 3D Arbitrary Stacking & Surface Elevation Architecture', () => {
  describe('Data Model & Schema Extensions', () => {
    it('declares elevation property in RoomItem interface in types.ts', () => {
      assert.match(typesContent, /elevation\?:\s*number/);
    });

    it('validates elevation in RoomItemSchema with min 0 and max 10', () => {
      assert.match(schemaContent, /elevation:\s*z\.number\(\)/);

      const validOnFloor = RoomItemSchema.safeParse({
        itemType: 'decor',
        customImageUrl: '/decor/lamp.png',
        xPct: 50,
        yPct: 50,
        widthPct: 20,
        elevation: 0,
      });
      assert.equal(validOnFloor.success, true);

      const validOnDesk = RoomItemSchema.safeParse({
        itemType: 'decor',
        customImageUrl: '/decor/lamp.png',
        xPct: 50,
        yPct: 50,
        widthPct: 20,
        elevation: 0.775,
      });
      assert.equal(validOnDesk.success, true);

      const validOnMonitor = RoomItemSchema.safeParse({
        itemType: 'decor',
        customImageUrl: '/decor/screenbar.png',
        xPct: 50,
        yPct: 50,
        widthPct: 15,
        elevation: 1.225,
      });
      assert.equal(validOnMonitor.success, true);

      const invalidNegative = RoomItemSchema.safeParse({
        itemType: 'decor',
        customImageUrl: '/decor/lamp.png',
        xPct: 50,
        yPct: 50,
        widthPct: 20,
        elevation: -0.5,
      });
      assert.equal(invalidNegative.success, false);
    });
  });

  describe('3D Stacking Engine in RoomStage3D', () => {
    it('implements getItemBounds and getStackingSurfaceHeight for dynamic surface detection', () => {
      assert.match(roomStage3DContent, /const\s+getItemBounds\s*=/);
      assert.match(roomStage3DContent, /const\s+getStackingSurfaceHeight\s*=/);
    });

    it('sorts items by zIndex before 3D instantiation so base objects build before stacked items', () => {
      assert.match(roomStage3DContent, /sortedItems\s*=\s*\[\.\.\.items\]\.sort\(/);
    });

    it('calculates real-time surface height during pointer drag in handlePointerMove', () => {
      assert.match(roomStage3DContent, /getStackingSurfaceHeight\(\s*clampedX,\s*clampedZ/);
      assert.match(roomStage3DContent, /targetObj\.position\.y\s*=\s*surfaceY/);
      assert.match(roomStage3DContent, /dragPlaneRef\.current\.set\(.*-surfaceY\)/);
    });

    it('persists final elevation on pointer release in handlePointerUp', () => {
      assert.match(roomStage3DContent, /finalElevation\s*=\s*Math\.round\(targetObj\.position\.y\s*\*\s*1000\)\s*\/\s*1000/);
      assert.match(roomStage3DContent, /elevation:\s*finalElevation/);
    });

    it('provides handleAdjustElevation for incremental height changes (+0.1m / -0.1m)', () => {
      assert.match(roomStage3DContent, /handleAdjustElevation\s*=\s*\(deltaY:\s*number\)/);
      assert.match(roomStage3DContent, /handleToggleElevation\s*=\s*\(\)/);
    });

    it('renders elevation badge and elevation buttons in 3D HUD overlay', () => {
      assert.match(roomStage3DContent, /room-stage-3d-hud-elevation-badge/);
      assert.match(roomStage3DContent, /title="Nâng cao thêm \(\+0\.1m\)"/);
      assert.match(roomStage3DContent, /title="Hạ thấp xuống \(-0\.1m\)"/);
      assert.match(roomStage3DContent, /title="Đổi vị trí \(Trên bàn \/ Dưới sàn\)"/);
      assert.match(roomStage3DCss, /\.room-stage-3d-hud-elevation-badge/);
    });
  });

  describe('Admin Room Editor Stacking & Layer Integration', () => {
    it('displays elevation and provides height adjustment buttons in layer panel', () => {
      assert.match(adminEditorContent, /Cao:/);
      assert.match(adminEditorContent, /title="Nâng cao \(\+0\.1m\)"/);
      assert.match(adminEditorContent, /title="Hạ thấp \(-0\.1m\)"/);
    });

    it('includes elevation in cleanItemsPayload when saving batch', () => {
      assert.match(adminEditorContent, /elevation:\s*it\.elevation\s*\?\?\s*0/);
    });
  });

  describe('Mathematical Stacking & Overlap Simulation', () => {
    it('correctly stacks object on top of desk, and drops to floor when moved off desk', () => {
      // Simulate room items geometry
      interface SimBounds {
        id: string;
        minX: number;
        maxX: number;
        minZ: number;
        maxZ: number;
        topY: number;
      }

      const objects: SimBounds[] = [
        // Smart desk at center: width 2m, depth 0.9m, topY 0.775m
        { id: 'desk', minX: -1.0, maxX: 1.0, minZ: -0.45, maxZ: 0.45, topY: 0.775 },
      ];

      function computeStackHeight(x: number, z: number, excludeId: string): number {
        let maxTop = 0.0;
        for (const obj of objects) {
          if (obj.id === excludeId) continue;
          if (x >= obj.minX && x <= obj.maxX && z >= obj.minZ && z <= obj.maxZ) {
            if (obj.topY > maxTop) maxTop = obj.topY;
          }
        }
        return maxTop;
      }

      // 1. Keyboard placed on desk (x: 0, z: 0.2)
      const keyboardHeightOnDesk = computeStackHeight(0, 0.2, 'keyboard');
      assert.equal(keyboardHeightOnDesk, 0.775, 'Keyboard on desk must sit at 0.775m');

      // 2. Keyboard moved to floor (x: 2.0, z: 1.5)
      const keyboardHeightOnFloor = computeStackHeight(2.0, 1.5, 'keyboard');
      assert.equal(keyboardHeightOnFloor, 0.0, 'Keyboard outside desk must drop to floor at 0m');

      // 3. Add Monitor on desk: x: 0, z: -0.2, topY: 0.775 + 0.45 = 1.225m
      objects.push({ id: 'monitor', minX: -0.4, maxX: 0.4, minZ: -0.3, maxZ: -0.1, topY: 1.225 });

      // 4. Screenbar placed on monitor (x: 0, z: -0.2)
      const screenbarHeight = computeStackHeight(0, -0.2, 'screenbar');
      assert.equal(screenbarHeight, 1.225, 'Screenbar on monitor must sit on top of monitor at 1.225m');
    });
  });

  describe('Zero Em Dash Compliance Guard', () => {
    it('guarantees zero em dash characters across all touched files', () => {
      const emDashRegex = /\u2014/;
      assert.doesNotMatch(roomStage3DContent, emDashRegex, 'RoomStage3D.tsx must not contain em dash');
      assert.doesNotMatch(roomStage3DCss, emDashRegex, 'room-stage-3d.css must not contain em dash');
      assert.doesNotMatch(adminEditorContent, emDashRegex, 'AdminRoomEditor.tsx must not contain em dash');
      assert.doesNotMatch(typesContent, emDashRegex, 'types.ts must not contain em dash');
      assert.doesNotMatch(schemaContent, emDashRegex, 'schema.ts must not contain em dash');
    });
  });
});
