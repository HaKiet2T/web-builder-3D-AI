import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { PRESET_3D_MODELS } from '../src/lib/room/sample-data.ts';
import {
  create3DModelAsset,
  delete3DModelAsset,
  list3DModelAssets,
  update3DModelAsset,
  upload3DModelAsset,
} from '../src/lib/room/dal.ts';
import {
  deleteUserSavedRoom,
  getUserSavedRoomById,
  listUserSavedRooms,
  saveUserRoom,
} from '../src/lib/room/user-rooms-dal.ts';

const adminRoomsPageContent = readFileSync('src/app/admin/(dashboard)/rooms/page.tsx', 'utf8');
const adminRoomDetailPageContent = readFileSync('src/app/admin/(dashboard)/rooms/[id]/page.tsx', 'utf8');
const roomStage3DContent = readFileSync('src/components/room/RoomStage3D.tsx', 'utf8');
const roomStage3DCss = readFileSync('src/components/room/room-stage-3d.css', 'utf8');
const adminEditorContent = readFileSync('src/app/admin/(dashboard)/rooms/AdminRoomEditor.tsx', 'utf8');
const actionsContent = readFileSync('src/app/admin/(dashboard)/rooms/actions.ts', 'utf8');
const typesContent = readFileSync('src/lib/room/types.ts', 'utf8');
const roomViewerContent = readFileSync('src/components/room/RoomViewer.tsx', 'utf8');
const userRoomActionsContent = readFileSync('src/lib/room/user-room-actions.ts', 'utf8');
const accountPageContent = readFileSync('src/app/account/page.tsx', 'utf8');

describe('Admin 3D Square Room & GLB Upload Architecture', () => {
  describe('Prerender Crash Fix (Next.js 16 Partial Prerendering)', () => {
    it('forces dynamic execution via connection() in admin rooms list page', () => {
      assert.match(adminRoomsPageContent, /import \{ connection \} from 'next\/server'/);
      assert.match(adminRoomsPageContent, /await connection\(\)/);
    });

    it('forces dynamic execution via connection() in admin room detail page', () => {
      assert.match(adminRoomDetailPageContent, /import \{ connection \} from 'next\/server'/);
      assert.match(adminRoomDetailPageContent, /await connection\(\)/);
    });
  });

  describe('3D GLB Models & Preset Assets', () => {
    it('declares Model3DAsset interface in types', () => {
      assert.match(typesContent, /export interface Model3DAsset\s*\{/);
      assert.match(typesContent, /modelUrl:\s*string/);
      assert.match(typesContent, /storagePath\?:\s*string\s*\|\s*null/);
    });

    it('exports rich PRESET_3D_MODELS with smart desk, monitor, gaming pc, chair, plant, speakers', () => {
      assert.ok(Array.isArray(PRESET_3D_MODELS));
      assert.ok(PRESET_3D_MODELS.length >= 6);

      const urls = PRESET_3D_MODELS.map((m) => m.modelUrl);
      assert.ok(urls.some((u) => u.includes('smart-desk.glb')));
      assert.ok(urls.some((u) => u.includes('ultrawide-monitor.glb')));
      assert.ok(urls.some((u) => u.includes('gaming-pc.glb')));
      assert.ok(urls.some((u) => u.includes('ergonomic-chair.glb')));
      assert.ok(urls.some((u) => u.includes('desk-plant.glb')));
      assert.ok(urls.some((u) => u.includes('studio-speakers.glb')));
    });

    it('validates that generated GLB preset files exist on disk with valid glTF binary magic header', () => {
      for (const preset of PRESET_3D_MODELS) {
        const localPath = `public${preset.modelUrl}`;
        assert.ok(existsSync(localPath), `File ${localPath} must exist on disk`);

        const buf = readFileSync(localPath);
        assert.ok(buf.length >= 12, `${localPath} must have at least 12 bytes for GLB header`);
        // glTF binary magic bytes: 0x67, 0x6c, 0x54, 0x46 ('glTF')
        assert.equal(buf[0], 0x67, 'Magic byte 0 must be 0x67 (g)');
        assert.equal(buf[1], 0x6c, 'Magic byte 1 must be 0x6C (l)');
        assert.equal(buf[2], 0x54, 'Magic byte 2 must be 0x54 (T)');
        assert.equal(buf[3], 0x46, 'Magic byte 3 must be 0x46 (F)');
      }
    });

    it('lists 3D models via list3DModelAssets combining presets and disk files', async () => {
      const models = await list3DModelAssets();
      assert.ok(Array.isArray(models));
      assert.ok(models.length >= 6);
      const labels = models.map((m) => m.label);
      assert.ok(labels.some((l) => l.includes('Bàn')));
      assert.ok(labels.some((l) => l.includes('Màn hình')));
    });

    it('uploads a test 3D model asset without writing files to disk', async () => {
      // Create minimal mock GLB buffer with magic header
      const mockGlb = Buffer.from([0x67, 0x6c, 0x54, 0x46, 0x02, 0x00, 0x00, 0x00, 0x14, 0x00, 0x00, 0x00]);
      const res = await upload3DModelAsset({
        fileName: 'sample-keyboard.glb',
        content: mockGlb,
        label: 'Bàn phím cơ Test',
        category: 'tech',
        skipDiskWrite: true,
      });

      assert.ok(res.id);
      assert.equal(res.label, 'Bàn phím cơ Test');
      assert.ok(res.modelUrl.startsWith('/models3d/'));
      assert.ok(res.modelUrl.endsWith('.glb'));

      await delete3DModelAsset(res.id);
    });
  });

  describe('Admin 3D Objects Full CRUD (Thêm, Sửa, Xóa)', () => {
    it('creates, updates, and deletes 3D model assets dynamically', async () => {
      const created = await create3DModelAsset({
        label: 'Ghế Gaming Cao Cấp Test',
        category: 'furniture',
        modelUrl: '/models3d/custom-chair-test.glb',
      });

      assert.ok(created.id);
      assert.equal(created.label, 'Ghế Gaming Cao Cấp Test');
      assert.equal(created.category, 'furniture');

      const updated = await update3DModelAsset(created.id, {
        label: 'Ghế Công Thái Học Test Đã Sửa',
        category: 'furniture',
      });

      assert.equal(updated.label, 'Ghế Công Thái Học Test Đã Sửa');

      const deleted = await delete3DModelAsset(created.id);
      assert.equal(deleted, true);

      const listAfter = await list3DModelAssets();
      assert.equal(listAfter.some((m) => m.id === created.id), false);
    });

    it('declares create3DModelAction, update3DModelAction, and delete3DModelAction in actions.ts', () => {
      assert.match(actionsContent, /export async function create3DModelAction/);
      assert.match(actionsContent, /export async function update3DModelAction/);
      assert.match(actionsContent, /export async function delete3DModelAction/);
    });

    it('integrates full 3D object CRUD UI in AdminRoomEditor.tsx', () => {
      assert.match(adminEditorContent, /handleCreateManual3D/);
      assert.match(adminEditorContent, /handleStartEditModel/);
      assert.match(adminEditorContent, /handleUpdate3DModel/);
      assert.match(adminEditorContent, /handleDelete3DModel/);
      assert.match(adminEditorContent, /Đăng ký vật thể 3D mới vào thư viện/);
      assert.match(adminEditorContent, /Chỉnh sửa vật thể 3D:/);
    });
  });

  describe('3D Square Room Diorama Architecture (RoomStage3D.tsx)', () => {
    it('implements square room architecture with OrbitControls and GLTFLoader', () => {
      assert.match(roomStage3DContent, /SquareRoomArchitecture/);
      assert.match(roomStage3DContent, /OrbitControls/);
      assert.match(roomStage3DContent, /GLTFLoader/);
    });

    it('ensures clean minimalist room: pure white walls and floor retaining original wood color', () => {
      // White walls: color: 0xffffff
      assert.match(roomStage3DContent, /color:\s*0xffffff/);
      // Floor retaining color: 0xd4a373
      assert.match(roomStage3DContent, /color:\s*0xd4a373/);
      // Grid helper on floor
      assert.match(roomStage3DContent, /GridHelper/);
      // No hardcoded centerpiece desk or clutter inside the 3D scene geometry
      assert.doesNotMatch(roomStage3DContent, /MainWorkspaceDesk/);
      assert.doesNotMatch(roomStage3DContent, /acoustic slats/i);
    });

    it('provides camera presets for diorama, front, top-down, and eye level', () => {
      assert.match(roomStage3DContent, /applyCameraPreset/);
      assert.match(roomStage3DContent, /'diorama'/);
      assert.match(roomStage3DContent, /'front'/);
      assert.match(roomStage3DContent, /'top'/);
      assert.match(roomStage3DContent, /'eye'/);
    });

    it('supports 3D item interaction: dragging on floor, rotation, elevation, and scaling', () => {
      assert.match(roomStage3DContent, /handlePointerDown/);
      assert.match(roomStage3DContent, /handlePointerMove/);
      assert.match(roomStage3DContent, /handlePointerUp/);
      assert.match(roomStage3DContent, /handleRotateSelected/);
      assert.match(roomStage3DContent, /handleScaleSelected/);
    });

    it('includes responsive styling and HUD overlay in room-stage-3d.css', () => {
      assert.match(roomStage3DCss, /\.room-stage-3d-wrapper/);
      assert.match(roomStage3DCss, /\.room-stage-3d-topbar/);
      assert.match(roomStage3DCss, /\.room-stage-3d-selected-hud/);
      assert.match(roomStage3DCss, /\.room-stage-3d-camera-presets/);
    });
  });

  describe('Customer Multi-Room Persistence & 3D Experience', () => {
    it('supports multi-room saving, retrieval, and deletion per user account in user-rooms-dal', async () => {
      const testUserId = `test-user-${Date.now()}`;
      const saved1 = await saveUserRoom(
        {
          name: 'Góc làm việc Gaming Streamer',
          description: 'Phòng setup cá nhân 1',
          items: [],
        },
        testUserId
      );

      assert.ok(saved1.id);
      assert.equal(saved1.name, 'Góc làm việc Gaming Streamer');

      const saved2 = await saveUserRoom(
        {
          name: 'Studio Thu Âm Podcast',
          description: 'Phòng setup cá nhân 2',
          items: [],
        },
        testUserId
      );

      const userRooms = await listUserSavedRooms(testUserId);
      assert.equal(userRooms.length, 2);

      const retrieved = await getUserSavedRoomById(saved1.id, testUserId);
      assert.equal(retrieved?.id, saved1.id);

      const deleted = await deleteUserSavedRoom(saved1.id, testUserId);
      assert.equal(deleted, true);

      const userRoomsAfter = await listUserSavedRooms(testUserId);
      assert.equal(userRoomsAfter.length, 1);
      assert.equal(userRoomsAfter[0].id, saved2.id);
    });

    it('exports server actions for customer rooms in user-room-actions.ts', () => {
      assert.match(userRoomActionsContent, /export async function saveCustomerRoomAction/);
      assert.match(userRoomActionsContent, /export async function deleteCustomerRoomAction/);
      assert.match(userRoomActionsContent, /export async function listCustomerRoomsAction/);
      assert.match(userRoomActionsContent, /export async function getCustomerRoomAction/);
    });

    it('integrates 3D default view, room actions, and modals in RoomViewer.tsx', () => {
      assert.match(roomViewerContent, /const\s+\[viewDimension,\s*setViewDimension\]\s*=\s*useState<'3d'\s*\|\s*'2d'>\('3d'\)/);
      assert.match(roomViewerContent, /RoomStage3D/);
      assert.match(roomViewerContent, /\+ Thêm vật phẩm vào 3D/);
      assert.match(roomViewerContent, /\+ Phòng trống mới/);
      assert.match(roomViewerContent, /💾 Lưu vào tài khoản/);
      assert.match(roomViewerContent, /handleCreateBlankRoom/);
      assert.match(roomViewerContent, /handleSaveRoom/);
      assert.match(roomViewerContent, /handleSelectRoom/);
      assert.match(roomViewerContent, /handleAddObjectToRoom/);
    });

    it('displays saved 3D rooms section and metrics in Account page', () => {
      assert.match(accountPageContent, /Không gian 3D đã lưu/);
      assert.match(accountPageContent, /listUserSavedRooms/);
      assert.match(accountPageContent, /deleteCustomerRoomAction/);
      assert.match(accountPageContent, /Studio 3D/);
    });
  });

  describe('Zero Em Dash Compliance', () => {
    it('ensures zero em dash (U+2014) in all touched files', () => {
      const filesToCheck = [
        adminRoomsPageContent,
        adminRoomDetailPageContent,
        roomStage3DContent,
        roomStage3DCss,
        adminEditorContent,
        actionsContent,
        typesContent,
        roomViewerContent,
        userRoomActionsContent,
        accountPageContent,
      ];

      for (const content of filesToCheck) {
        assert.ok(!content.includes('\u2014'), 'File must not contain em dash U+2014');
      }
    });
  });
});
