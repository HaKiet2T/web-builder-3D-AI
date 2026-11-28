'use client';

import React, { useState, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import type { AdminProduct } from '@/lib/catalog/dal';
import type { ModelConfig, EnvironmentPreset } from '@/lib/schemas/model-config';
import {
  deleteMediaAction,
  updateModelConfigAction,
  uploadModelMediaAction,
} from '@/app/admin/(dashboard)/actions';

// Tải ProductViewer3D chỉ ở client (ssr: false)
const ProductViewer3D = dynamic(
  () => import('@/components/canvas/ProductViewer3D').then((m) => m.ProductViewer3D),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-64 w-full items-center justify-center rounded-xl bg-neutral-100 text-xs text-neutral-400 animate-pulse">
        Đang nạp bộ dựng 3D...
      </div>
    ),
  }
);

interface ProductModelManagerProps {
  product: AdminProduct;
  primaryImageUrl?: string | null;
}

export function ProductModelManager({ product, primaryImageUrl }: ProductModelManagerProps) {
  const router = useRouter();
  const modelMedia = product.media.find((m) => m.kind === 'model');

  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [configSuccessMsg, setConfigSuccessMsg] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  // Dam bao isUploading luon duoc reset khi product props cap nhat
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsUploading(false);
    }, 0);
    return () => clearTimeout(timer);
  }, [product.id, product.media]);

  // Cấu hình ban đầu từ database
  const initialConfig = (modelMedia?.modelConfig as ModelConfig | null) || null;

  const [scale, setScale] = useState<number>(initialConfig?.scale || 1);
  const [isCustomScale, setIsCustomScale] = useState<boolean>(Boolean(initialConfig?.scale));
  const [positionY, setPositionY] = useState<number>(initialConfig?.position?.[1] || 0);
  const [rotationY, setRotationY] = useState<number>(initialConfig?.rotation?.[1] || 0);
  const [environment, setEnvironment] = useState<EnvironmentPreset>(initialConfig?.environment || 'studio');
  const [autoRotate, setAutoRotate] = useState<boolean>(initialConfig?.autoRotate ?? false);
  const [autoRotateSpeed, setAutoRotateSpeed] = useState<number>(initialConfig?.autoRotateSpeed ?? 1.5);

  const currentPreviewConfig: ModelConfig = {
    scale: isCustomScale ? scale : undefined,
    position: [0, positionY, 0],
    rotation: [0, rotationY, 0],
    environment,
    exposure: initialConfig?.exposure ?? 1.15,
    autoRotate,
    autoRotateSpeed,
  };

  async function process3DFile(file: File) {
    setUploadError(null);

    const lowerName = file.name.toLowerCase();
    if (!lowerName.endsWith('.glb') && !lowerName.endsWith('.gltf')) {
      setUploadError('Chỉ hỗ trợ file 3D định dạng .glb hoặc .gltf.');
      return;
    }

    const MAX_3D_FILE_SIZE = 100 * 1024 * 1024; // 100 MB
    if (file.size > MAX_3D_FILE_SIZE) {
      setUploadError(`File ${(file.size / (1024 * 1024)).toFixed(1)} MB vượt quá giới hạn tối đa 100 MB.`);
      return;
    }

    // Kiểm tra header glTF đối với file .glb
    if (lowerName.endsWith('.glb')) {
      try {
        const buffer = await file.slice(0, 4).arrayBuffer();
        const magic = String.fromCharCode(...new Uint8Array(buffer));
        if (magic !== 'glTF') {
          setUploadError('File không hợp lệ: Thiếu glTF magic header.');
          return;
        }
      } catch (err) {
        setUploadError(`Không thể đọc cấu trúc file: ${String(err)}`);
        return;
      }
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.set('productId', product.id);
      formData.set('file', file);
      await uploadModelMediaAction(formData);
      router.refresh();
    } catch (err) {
      if (
        err &&
        typeof err === 'object' &&
        'digest' in err &&
        typeof (err as { digest?: string }).digest === 'string' &&
        (err as { digest: string }).digest.startsWith('NEXT_REDIRECT')
      ) {
        return;
      }
      const rawMsg = err instanceof Error ? err.message : 'Lỗi khi tải file 3D.';
      const friendlyMsg =
        rawMsg.toLowerCase().includes('end of form') || rawMsg.toLowerCase().includes('limit')
          ? 'File tải lên vượt quá giới hạn máy chủ hoặc bị ngắt truyền tải (tối đa 100 MB).'
          : rawMsg;
      setUploadError(friendlyMsg);
    } finally {
      setIsUploading(false);
    }
  }

  async function handleFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    await process3DFile(file);
  }

  function handleDragEnter(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
    if (!isDragging) {
      setIsDragging(true);
    }
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsDragging(false);
    }
  }

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragging(false);

    if (isUploading) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await process3DFile(files[0]);
    }
  }

  async function handleSaveConfig() {
    if (!modelMedia) return;
    setIsSavingConfig(true);
    setConfigSuccessMsg(null);
    try {
      const formData = new FormData();
      formData.set('mediaId', modelMedia.id);
      formData.set('modelConfig', JSON.stringify(currentPreviewConfig));
      await updateModelConfigAction(formData);
      setConfigSuccessMsg('Đã lưu cấu hình 3D thành công!');
    } catch (err) {
      if (
        err &&
        typeof err === 'object' &&
        'digest' in err &&
        typeof (err as { digest?: string }).digest === 'string' &&
        (err as { digest: string }).digest.startsWith('NEXT_REDIRECT')
      ) {
        throw err;
      }
      setUploadError(err instanceof Error ? err.message : 'Lỗi khi lưu cấu hình.');
    } finally {
      setIsSavingConfig(false);
    }
  }

  return (
    <div className="admin-media-upload-card" style={{ marginBottom: '24px', borderColor: modelMedia ? '#a7f3d0' : undefined }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'between', marginBottom: '12px' }}>
        <div>
          <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>Mô hình 3D (.glb / .gltf)</span>
            {modelMedia ? (
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: '12px',
                  backgroundColor: '#ecfdf5',
                  color: '#059669',
                  border: '1px solid #a7f3d0',
                }}
              >
                ✓ Đã có file 3D
              </span>
            ) : (
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 500,
                  padding: '2px 8px',
                  borderRadius: '12px',
                  backgroundColor: '#fef3c7',
                  color: '#b45309',
                  border: '1px solid #fde68a',
                }}
              >
                Chưa có file 3D
              </span>
            )}
          </h4>
          <p className="admin-help" style={{ margin: '4px 0 0' }}>
            Cho phép khách hàng xoay 360 độ và trải nghiệm trực tiếp trên trang setup.
          </p>
        </div>
      </div>

      {uploadError && (
        <div className="admin-upload-error-alert" role="alert" style={{ marginBottom: '12px' }}>
          {uploadError}
        </div>
      )}

      {/* Input file ẩn dùng chung cho cả khi chưa có model và khi thay file */}
      <input
        ref={fileInputRef}
        id="product-model-file-input"
        type="file"
        accept=".glb,.gltf"
        style={{ display: 'none' }}
        onChange={handleFileSelected}
        disabled={isUploading}
      />

      {/* Trường hợp 1: Đã có model 3D */}
      {modelMedia ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Card thông tin model - hỗ trợ kéo thả file mới trực tiếp để thay thế */}
          <div
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              borderRadius: '8px',
              backgroundColor: isDragging ? '#f0f9ff' : '#f8fafc',
              border: isDragging ? '2px dashed #0284c7' : '1px solid #e2e8f0',
              transition: 'all 0.15s ease-in-out',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '24px' }}>{isDragging ? '📥' : '🧊'}</span>
              <div>
                <a
                  href={modelMedia.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{ fontSize: '13px', fontWeight: 600, color: '#0284c7', textDecoration: 'none' }}
                >
                  {modelMedia.alt || 'File mô hình 3D (.glb)'} ↗
                </a>
                <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>
                  {isDragging ? 'Thả file mới vào đây để thay thế' : 'Lưu trữ tại bucket Storage: product-models'}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                className="admin-button"
                onClick={() => setShowConfig(!showConfig)}
                style={{ fontSize: '12px', padding: '6px 12px' }}
              >
                {showConfig ? 'Thu gọn xem trước' : 'Xem trước & Căn chỉnh'}
              </button>

              <button
                type="button"
                className="admin-button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                style={{ fontSize: '12px', padding: '6px 12px' }}
              >
                {isUploading ? 'Đang tải...' : 'Thay file khác'}
              </button>

              <form
                action={deleteMediaAction}
                onSubmit={(e) => {
                  if (!window.confirm('Bạn có chắc muốn xoá mô hình 3D này của sản phẩm?')) {
                    e.preventDefault();
                  }
                }}
              >
                <input type="hidden" name="mediaId" value={modelMedia.id} />
                <button
                  className="admin-button admin-button-danger"
                  type="submit"
                  style={{ fontSize: '12px', padding: '6px 12px' }}
                >
                  Xoá 3D
                </button>
              </form>
            </div>
          </div>

          {/* Hidden input để thay thế file */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".glb,.gltf"
            style={{ display: 'none' }}
            onChange={handleFileSelected}
            disabled={isUploading}
          />

          {/* Khung Live Preview & Calibration */}
          {showConfig && (
            <div
              style={{
                borderRadius: '12px',
                border: '1px solid #cbd5e1',
                padding: '16px',
                backgroundColor: '#ffffff',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '16px',
              }}
            >
              {/* Cột trái: Canvas 3D */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600 }}>Xem trước trực quan</span>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>
                    {isCustomScale ? 'Scale chỉnh tay' : 'Auto-fit Bounds'}
                  </span>
                </div>
                <div
                  style={{
                    position: 'relative',
                    height: '280px',
                    width: '100%',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    backgroundColor: '#e9e5de',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <ProductViewer3D
                    modelUrl={modelMedia.url}
                    config={currentPreviewConfig}
                    fallbackImageUrl={primaryImageUrl}
                    alt={product.name}
                  />
                </div>
                <p style={{ margin: '6px 0 0', fontSize: '11px', color: '#94a3b8' }}>
                  * Dùng chuột trái xoay, chuột giữa/cuộn để zoom.
                </p>
              </div>

              {/* Cột phải: Điều khiển thông số */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600 }}>Căn chỉnh thông số</span>

                {/* Scale */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                    <label>
                      <input
                        type="checkbox"
                        checked={isCustomScale}
                        onChange={(e) => setIsCustomScale(e.target.checked)}
                        style={{ marginRight: '6px' }}
                      />
                      Tỷ lệ phóng to (Scale)
                    </label>
                    <span style={{ fontWeight: 600 }}>{scale.toFixed(2)}x</span>
                  </div>
                  {isCustomScale && (
                    <input
                      type="range"
                      min="0.2"
                      max="3.0"
                      step="0.05"
                      value={scale}
                      onChange={(e) => setScale(parseFloat(e.target.value))}
                      style={{ width: '100%' }}
                    />
                  )}
                </div>

                {/* Độ cao Y */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                    <span>Độ cao vật thể (Trục Y)</span>
                    <span style={{ fontWeight: 600 }}>{positionY.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="-1.5"
                    max="2.0"
                    step="0.05"
                    value={positionY}
                    onChange={(e) => setPositionY(parseFloat(e.target.value))}
                    style={{ width: '100%' }}
                  />
                </div>

                {/* Góc quay Y */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                    <span>Góc quay ban đầu</span>
                    <span style={{ fontWeight: 600 }}>{((rotationY * 180) / Math.PI).toFixed(0)}°</span>
                  </div>
                  <input
                    type="range"
                    min={-Math.PI}
                    max={Math.PI}
                    step="0.05"
                    value={rotationY}
                    onChange={(e) => setRotationY(parseFloat(e.target.value))}
                    style={{ width: '100%' }}
                  />
                </div>

                {/* Môi trường */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>Ánh sáng môi trường</label>
                  <select
                    value={environment}
                    onChange={(e) => setEnvironment(e.target.value as EnvironmentPreset)}
                    style={{ width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  >
                    <option value="studio">Studio</option>
                    <option value="night">Night (Đêm)</option>
                    <option value="city">City (Tự nhiên)</option>
                    <option value="sunset">Sunset (Hoàng hôn)</option>
                    <option value="dawn">Dawn (Bình minh)</option>
                    <option value="apartment">Apartment</option>
                  </select>
                </div>

                {/* Tự xoay */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', marginBottom: autoRotate ? '4px' : '0' }}>
                    <span>Tự động xoay 360°</span>
                    <input
                      type="checkbox"
                      checked={autoRotate}
                      onChange={(e) => setAutoRotate(e.target.checked)}
                    />
                  </div>
                  {autoRotate && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="range"
                        min="0.5"
                        max="5.0"
                        step="0.5"
                        value={autoRotateSpeed}
                        onChange={(e) => setAutoRotateSpeed(parseFloat(e.target.value))}
                        style={{ width: '100%' }}
                      />
                      <span style={{ fontSize: '11px', fontWeight: 600, minWidth: '28px' }}>{autoRotateSpeed.toFixed(1)}x</span>
                    </div>
                  )}
                </div>

                {configSuccessMsg && (
                  <p style={{ margin: 0, fontSize: '12px', color: '#059669', fontWeight: 600 }}>
                    {configSuccessMsg}
                  </p>
                )}

                <button
                  type="button"
                  className="admin-button admin-button-primary"
                  onClick={handleSaveConfig}
                  disabled={isSavingConfig}
                  style={{ marginTop: 'auto', fontSize: '12px' }}
                >
                  {isSavingConfig ? 'Đang lưu cấu hình...' : 'Lưu cấu hình 3D'}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Trường hợp 2: Chưa có model 3D -> Khung tải lên (Click và Kéo thả) */
        <div
          role="button"
          tabIndex={0}
          aria-label="Chọn hoặc kéo thả file mô hình 3D"
          onClick={() => {
            if (!isUploading) {
              fileInputRef.current?.click();
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              if (!isUploading) {
                fileInputRef.current?.click();
              }
            }
          }}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          style={{
            border: isDragging ? '2px dashed #0284c7' : '2px dashed #94a3b8',
            borderRadius: '8px',
            padding: '28px 20px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
            cursor: isUploading ? 'not-allowed' : 'pointer',
            backgroundColor: isDragging ? '#f0f9ff' : '#f8fafc',
            transition: 'all 0.15s ease-in-out',
            outline: 'none',
            userSelect: 'none',
          }}
        >
          <span
            style={{
              fontSize: '32px',
              transform: isDragging ? 'scale(1.15)' : 'scale(1)',
              transition: 'transform 0.15s ease',
            }}
          >
            {isDragging ? '📥' : '🧊'}
          </span>
          <span style={{ fontSize: '13px', fontWeight: 600, color: isDragging ? '#0284c7' : '#0f172a' }}>
            {isUploading
              ? 'Đang kiểm tra và tải lên mô hình 3D...'
              : isDragging
              ? 'Thả file .glb / .gltf vào đây để tải lên'
              : 'Bấm để chọn file 3D (.glb / .gltf) hoặc kéo thả vào đây'}
          </span>
          <span style={{ fontSize: '11px', color: '#64748b' }}>
            Hỗ trợ file .glb nén Draco, tối đa 100 MB. Hệ thống tự động kiểm tra magic header glTF.
          </span>
        </div>
      )}
    </div>
  );
}
