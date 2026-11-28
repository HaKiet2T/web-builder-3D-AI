import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { upload3DModelAction } from '../src/app/admin/(dashboard)/rooms/actions.ts';
import { uploadModelMediaAction } from '../src/app/admin/(dashboard)/actions.ts';

const nextConfigContent = readFileSync('next.config.ts', 'utf8');
const roomActionsContent = readFileSync('src/app/admin/(dashboard)/rooms/actions.ts', 'utf8');
const dashboardActionsContent = readFileSync('src/app/admin/(dashboard)/actions.ts', 'utf8');
const adminRoomEditorContent = readFileSync('src/app/admin/(dashboard)/rooms/AdminRoomEditor.tsx', 'utf8');
const productModelManagerContent = readFileSync('src/app/admin/(dashboard)/products/ProductModelManager.tsx', 'utf8');

describe('GLB File Upload Size Limits & Error Handling', () => {
  describe('Next.js Server Actions Payload Configuration', () => {
    it('configures bodySizeLimit to 100mb in next.config.ts', () => {
      assert.match(nextConfigContent, /bodySizeLimit:\s*["']100mb["']/i);
    });
  });

  describe('Admin Room Editor 3D Model Upload Action', () => {
    it('sets MAX_3D_MODEL_SIZE to 100MB in rooms/actions.ts', () => {
      assert.match(roomActionsContent, /MAX_3D_MODEL_SIZE\s*=\s*100\s*\*\s*1024\s*\*\s*1024/);
      assert.match(roomActionsContent, /tối đa 100 MB/);
    });

    it('rejects file larger than 100MB gracefully', async () => {
      const fakeLargeFile = new File([], 'heavy-setup-model.glb', { type: 'model/gltf-binary' });
      Object.defineProperty(fakeLargeFile, 'size', { value: 105 * 1024 * 1024 });

      const formData = new FormData();
      formData.append('file', fakeLargeFile);
      formData.append('label', 'Heavy Model');

      const res = await upload3DModelAction(formData);
      assert.equal(res.success, false);
      assert.match(res.error || '', /tối đa 100 MB/);
    });

    it('rejects non-glb file format', async () => {
      const fakeTxtFile = new File(['hello world'], 'notes.txt', { type: 'text/plain' });
      const formData = new FormData();
      formData.append('file', fakeTxtFile);

      const res = await upload3DModelAction(formData);
      assert.equal(res.success, false);
      assert.match(res.error || '', /Chỉ chấp nhận tệp 3D chuẩn nhị phân \.glb/);
    });
  });

  describe('Product Catalog Model Media Upload Action', () => {
    it('sets MAX_3D_MODEL_SIZE to 100MB in dashboard/actions.ts', () => {
      assert.match(dashboardActionsContent, /MAX_3D_MODEL_SIZE\s*=\s*100\s*\*\s*1024\s*\*\s*1024/);
      assert.match(dashboardActionsContent, /tối đa 100 MB/);
    });

    it('rejects product 3D file exceeding 100MB', async () => {
      const fakeLargeFile = new File([], 'heavy-product.glb', { type: 'model/gltf-binary' });
      Object.defineProperty(fakeLargeFile, 'size', { value: 102 * 1024 * 1024 });

      const formData = new FormData();
      formData.append('productId', 'prod-test-123');
      formData.append('file', fakeLargeFile);

      await assert.rejects(
        async () => uploadModelMediaAction(formData),
        /Dung lượng file 3D vượt quá giới hạn tối đa 100 MB/,
      );
    });

    it('rejects file without glTF magic header', async () => {
      const invalidHeaderBytes = new Uint8Array([0x00, 0x01, 0x02, 0x03]);
      const fakeFile = new File([invalidHeaderBytes], 'corrupted.glb', { type: 'model/gltf-binary' });

      const formData = new FormData();
      formData.append('productId', 'prod-test-123');
      formData.append('file', fakeFile);

      await assert.rejects(
        async () => uploadModelMediaAction(formData),
        /Thiếu glTF magic header/,
      );
    });
  });

  describe('Client-Side File Validation & Friendly Error Handling', () => {
    it('validates file size on client before upload in AdminRoomEditor', () => {
      assert.match(adminRoomEditorContent, /MAX_3D_FILE_SIZE\s*=\s*100\s*\*\s*1024\s*\*\s*1024/);
      assert.match(adminRoomEditorContent, /tối đa 100 MB/);
    });

    it('catches stream truncation errors and provides friendly message in AdminRoomEditor', () => {
      assert.match(adminRoomEditorContent, /end of form/i);
      assert.match(adminRoomEditorContent, /giới hạn truyền tải của máy chủ/);
    });

    it('displays file size in MB or KB dynamically in AdminRoomEditor', () => {
      assert.match(adminRoomEditorContent, /selectedUpload3DFile\.size\s*>=\s*1024\s*\*\s*1024/);
    });

    it('validates 100MB limit and catches network errors in ProductModelManager', () => {
      assert.match(productModelManagerContent, /MAX_3D_FILE_SIZE\s*=\s*100\s*\*\s*1024\s*\*\s*1024/);
      assert.match(productModelManagerContent, /end of form/i);
      assert.match(productModelManagerContent, /tối đa 100 MB/);
    });
  });
});
