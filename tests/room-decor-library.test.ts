import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import {
  deleteDecorAsset,
  listDecorAssets,
  uploadDecorAsset,
} from '../src/lib/room/dal.ts';
import { PRESET_DECOR_ASSETS } from '../src/lib/room/sample-data.ts';

const typesContent = readFileSync('src/lib/room/types.ts', 'utf8');
const dalContent = readFileSync('src/lib/room/dal.ts', 'utf8');
const sampleDataContent = readFileSync('src/lib/room/sample-data.ts', 'utf8');
const actionsContent = readFileSync('src/app/admin/(dashboard)/rooms/actions.ts', 'utf8');
const editorContent = readFileSync('src/app/admin/(dashboard)/rooms/AdminRoomEditor.tsx', 'utf8');
const editorCssContent = readFileSync('src/app/admin/(dashboard)/rooms/admin-room-editor.css', 'utf8');
const detailPageContent = readFileSync('src/app/admin/(dashboard)/rooms/[id]/page.tsx', 'utf8');

describe('Room Decor Library & Supabase Storage Integration (Giai doan 4)', () => {
  describe('Decor Domain Types & Presets', () => {
    it('declares DecorAsset and DecorCategory interfaces strictly', () => {
      assert.match(typesContent, /export type DecorCategory =/);
      assert.match(typesContent, /'all'\s*\|\s*'plant'\s*\|\s*'tech'\s*\|\s*'light'\s*\|\s*'lifestyle'\s*\|\s*'custom'/);
      assert.match(typesContent, /export interface DecorAsset\s*\{/);
      assert.match(typesContent, /storagePath\?:\s*string\s*\|\s*null/);
      assert.match(typesContent, /category\?:\s*DecorCategory\s*\|\s*string/);
    });

    it('exports rich PRESET_DECOR_ASSETS in sample-data with distinct categories', () => {
      assert.ok(Array.isArray(PRESET_DECOR_ASSETS));
      assert.ok(PRESET_DECOR_ASSETS.length >= 6);

      const categories = new Set(PRESET_DECOR_ASSETS.map((a) => a.category));
      assert.ok(categories.has('plant'), 'Must include plant category');
      assert.ok(categories.has('tech'), 'Must include tech category');
      assert.ok(categories.has('lifestyle'), 'Must include lifestyle category');
      assert.ok(categories.has('light'), 'Must include light category');

      for (const asset of PRESET_DECOR_ASSETS) {
        assert.ok(asset.id, 'Asset must have id');
        assert.ok(asset.label, 'Asset must have label');
        assert.ok(asset.customImageUrl.startsWith('/decor/'), 'Preset must point to /decor/');
      }
    });
  });

  describe('Decor DAL Functions', () => {
    it('lists decor assets falling back to presets when Supabase is offline', async () => {
      const assets = await listDecorAssets();
      assert.ok(Array.isArray(assets));
      assert.ok(assets.length >= PRESET_DECOR_ASSETS.length);
      assert.ok(assets.some((a) => a.id === 'decor-preset-plant-succulent'));
    });

    it('creates uploaded decor asset object with clean storage path under decor/ prefix', async () => {
      const mockBuffer = Buffer.from('mock png content');
      const uploaded = await uploadDecorAsset({
        fileName: 'Chau Cay De Ban.png',
        contentType: 'image/png',
        content: mockBuffer,
        label: 'Chau cay xinh',
        category: 'plant',
      });

      assert.ok(uploaded.id);
      assert.equal(uploaded.label, 'Chau cay xinh');
      assert.equal(uploaded.category, 'plant');
      assert.ok(uploaded.storagePath?.startsWith('decor/upload-'));
      assert.match(uploaded.storagePath || '', /chau-cay-de-ban\.png$/);
    });

    it('validates storagePath in deleteDecorAsset and prevents deleting non-decor paths', async () => {
      await assert.rejects(
        async () => {
          await deleteDecorAsset('backgrounds/malicious.png');
        },
        /hợp lệ/i,
      );

      await assert.rejects(
        async () => {
          await deleteDecorAsset('');
        },
        /hợp lệ/i,
      );
    });
  });

  describe('Server Actions & Security Safeguards', () => {
    it('defines uploadDecorAssetAction with 10MB limit and magic byte image detection', () => {
      assert.match(actionsContent, /export async function uploadDecorAssetAction/);
      assert.match(actionsContent, /10\s*\*\s*1024\s*\*\s*1024/);
      assert.match(actionsContent, /detectDecorImageType/);
      assert.match(actionsContent, /0x89[\s\S]*0x50[\s\S]*0x4e[\s\S]*0x47/, 'Must detect PNG magic bytes');
      assert.match(actionsContent, /0xff[\s\S]*0xd8[\s\S]*0xff/, 'Must detect JPEG magic bytes');
      assert.match(actionsContent, /RIFF[\s\S]*WEBP/, 'Must detect WebP magic bytes');
    });

    it('defines deleteDecorAssetAction and listDecorAssetsAction', () => {
      assert.match(actionsContent, /export async function deleteDecorAssetAction/);
      assert.match(actionsContent, /export async function listDecorAssetsAction/);
      assert.match(actionsContent, /revalidatePath\('\/admin\/rooms'\)/);
    });
  });

  describe('Admin Room Editor & UI Integration', () => {
    it('accepts initialDecorAssets prop and manages decor library state', () => {
      assert.match(editorContent, /initialDecorAssets\?:\s*DecorAsset\[\]/);
      assert.match(editorContent, /const\s+\[decorAssets,\s*setDecorAssets\]\s*=\s*useState<DecorAsset\[\]>/);
      assert.match(editorContent, /PRESET_DECOR_ASSETS/);
    });

    it('provides multi-category filtering with custom storage badge counter', () => {
      assert.match(editorContent, /decorCategory === 'all'/);
      assert.match(editorContent, /decorCategory === 'custom'/);
      assert.match(editorContent, /Kho Storage/);
    });

    it('provides drag-drop upload card with file preview, category selector and auto-add toggle', () => {
      assert.match(editorContent, /admin-decor-upload-card/);
      assert.match(editorContent, /accept="image\/png,image\/webp,image\/jpeg"/);
      assert.match(editorContent, /uploadFilePreview/);
      assert.match(editorContent, /autoAddOnUpload/);
      assert.match(editorContent, /uploadDecorAssetAction/);
    });

    it('renders checkerboard transparency thumbnail and deletion button for storage assets', () => {
      assert.match(editorContent, /admin-decor-thumb-checkerboard/);
      assert.match(editorContent, /Kho Supabase/);
      assert.match(editorContent, /handleDeleteDecorAsset/);
      assert.match(editorContent, /deleteDecorAssetAction/);
    });

    it('preserves backwards-compatible custom URL input for external assets', () => {
      assert.match(editorContent, /customDecorUrl/);
      assert.match(editorContent, /customDecorLabel/);
      assert.match(editorContent, /handleAddDecor\(customDecorUrl/);
    });

    it('defines tactile CSS classes for decor upload dropzone and checkerboard preview', () => {
      assert.match(editorCssContent, /\.admin-decor-upload-card/);
      assert.match(editorCssContent, /\.admin-decor-upload-dropzone/);
      assert.match(editorCssContent, /\.admin-decor-preview-wrap/);
      assert.match(editorCssContent, /\.admin-decor-thumb-checkerboard/);
      assert.match(editorCssContent, /\.admin-decor-source-badge/);
    });
  });

  describe('Admin Room Detail Page Integration', () => {
    it('loads listDecorAssets in parallel with setup and catalog products', () => {
      assert.match(detailPageContent, /import.*listDecorAssets.*from '@/);
      assert.match(detailPageContent, /Promise\.all\(\[\s*getRoomSetupById\(id\),\s*listProducts\(\),\s*listDecorAssets\(\),?\s*\]\)/);
      assert.match(detailPageContent, /initialDecorAssets=\{decorAssets\}/);
    });
  });

  describe('Zero Em Dash Policy Guard', () => {
    it('guarantees no em dash character (U+2014) exists across all Giai doan 4 files', () => {
      const emDashRegex = /\u2014/;
      assert.doesNotMatch(typesContent, emDashRegex, 'types.ts must not contain em dash');
      assert.doesNotMatch(dalContent, emDashRegex, 'dal.ts must not contain em dash');
      assert.doesNotMatch(sampleDataContent, emDashRegex, 'sample-data.ts must not contain em dash');
      assert.doesNotMatch(actionsContent, emDashRegex, 'actions.ts must not contain em dash');
      assert.doesNotMatch(editorContent, emDashRegex, 'AdminRoomEditor.tsx must not contain em dash');
      assert.doesNotMatch(editorCssContent, emDashRegex, 'admin-room-editor.css must not contain em dash');
      assert.doesNotMatch(detailPageContent, emDashRegex, 'page.tsx must not contain em dash');
    });
  });
});
