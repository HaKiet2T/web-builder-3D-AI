'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Category } from '@/lib/catalog/types';
import type { AdminProduct } from '@/lib/catalog/dal';
import { AdminProductForm } from '@/app/admin/(dashboard)/AdminProductForm';
import {
  deleteMediaAction,
  archiveProductAction,
  uploadMediaAction,
} from '@/app/admin/(dashboard)/actions';

interface PendingMediaFile {
  id: string;
  file: File;
  previewUrl: string;
  name: string;
  sizeFormatted: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface ProductEditDrawerProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  product?: AdminProduct;
  categories: Category[];
  defaultCategoryId?: string;
  defaultBrand?: string;
  activeTab: 'details' | 'media';
  onTabChange: (tab: 'details' | 'media') => void;
  onClose: () => void;
}

interface ProductMediaUploaderProps {
  product: AdminProduct;
}

function ProductMediaUploader({ product }: ProductMediaUploaderProps) {
  const [pendingFiles, setPendingFiles] = useState<PendingMediaFile[]>([]);
  const [altText, setAltText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      for (const item of pendingFiles) {
        URL.revokeObjectURL(item.previewUrl);
      }
    };
  }, [pendingFiles]);

  const clearAllPending = useCallback(() => {
    setPendingFiles((prev) => {
      for (const item of prev) {
        URL.revokeObjectURL(item.previewUrl);
      }
      return [];
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  function handleFilesSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const selectedList = event.target.files;
    if (!selectedList || selectedList.length === 0) return;

    setUploadError(null);
    const newItems: PendingMediaFile[] = [];

    for (let i = 0; i < selectedList.length; i++) {
      const file = selectedList[i];
      if (file.size > 15 * 1024 * 1024) {
        setUploadError(`File "${file.name}" vượt quá kích thước 15MB.`);
        continue;
      }
      newItems.push({
        id: `${file.name}-${file.lastModified}-${Math.random().toString(36).substring(2, 9)}`,
        file,
        previewUrl: URL.createObjectURL(file),
        name: file.name,
        sizeFormatted: formatFileSize(file.size),
      });
    }

    const currentTotalSize = pendingFiles.reduce((acc, item) => acc + item.file.size, 0);
    const addedTotalSize = newItems.reduce((acc, item) => acc + item.file.size, 0);
    if (currentTotalSize + addedTotalSize > 25 * 1024 * 1024) {
      setUploadError(
        `Tổng dung lượng các file ảnh (${formatFileSize(
          currentTotalSize + addedTotalSize,
        )}) vượt quá giới hạn 25MB cho mỗi lần tải. Vui lòng giảm bớt ảnh.`,
      );
      for (const item of newItems) {
        URL.revokeObjectURL(item.previewUrl);
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    setPendingFiles((prev) => [...prev, ...newItems]);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  function handleRemovePending(id: string) {
    setPendingFiles((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((item) => item.id !== id);
    });
  }

  async function handleUploadSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (pendingFiles.length === 0) {
      setUploadError('Vui lòng chọn ít nhất một file ảnh để tải lên.');
      return;
    }

    const totalBatchSize = pendingFiles.reduce((acc, item) => acc + item.file.size, 0);
    if (totalBatchSize > 25 * 1024 * 1024) {
      setUploadError(
        `Tổng dung lượng các file ảnh (${formatFileSize(totalBatchSize)}) vượt quá giới hạn 25MB cho mỗi lần tải. Vui lòng giảm bớt ảnh.`,
      );
      return;
    }

    setUploadError(null);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.set('productId', product.id);
      formData.set('productName', product.name);
      formData.set('alt', altText);

      for (const item of pendingFiles) {
        formData.append('files', item.file);
      }

      await uploadMediaAction(formData);
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
      console.error('Lỗi upload media:', err);
      const rawMessage = err instanceof Error ? err.message : '';
      if (rawMessage.includes('Body exceeded') || rawMessage.includes('413') || rawMessage.includes('exceeded limit')) {
        setUploadError(
          'Dung lượng request vượt quá giới hạn 30MB của máy chủ. Mỗi mẻ ảnh được phép tối đa 25MB; vui lòng giảm bớt kích thước hoặc số lượng ảnh.',
        );
      } else {
        setUploadError(rawMessage || 'Có lỗi xảy ra khi xử lý xóa phông AI rembg.');
      }
      setIsUploading(false);
    }
  }

  return (
    <div className="admin-media-upload-card">
      <h4>Tải ảnh mới lên sản phẩm</h4>

      {uploadError ? (
        <div className="admin-upload-error-alert" role="alert">
          {uploadError}
        </div>
      ) : null}

      <form className="admin-upload-form" onSubmit={handleUploadSubmit}>
        <input type="hidden" name="productId" value={product.id} />
        <input type="hidden" name="productName" value={product.name} />

        {/* File Dropzone / Picker */}
        <div className="admin-file-dropzone">
          <input
            ref={fileInputRef}
            id="product-media-files-input"
            name="files"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={handleFilesSelected}
            className="admin-file-native-input"
            disabled={isUploading}
          />
          <label htmlFor="product-media-files-input" className="admin-dropzone-label">
            <svg
              className="admin-dropzone-icon"
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <span className="admin-dropzone-primary-text">
              {pendingFiles.length > 0
                ? '+ Chọn thêm ảnh khác vào danh sách'
                : 'Nhấp để chọn file ảnh hoặc kéo thả vào đây'}
            </span>
            <span className="admin-dropzone-hint">
              Hỗ trợ tải nhiều ảnh đồng thời: JPEG, PNG, WebP (Tối đa 15MB/ảnh, tổng mẻ 25MB)
            </span>
          </label>
        </div>

        {/* Pending Preview Container (Khung hiển thị ảnh mới trước khi xóa phông) */}
        {pendingFiles.length > 0 ? (
          <div className="admin-pending-preview-section" role="region" aria-label="Khung xem trước ảnh mới">
            <div className="admin-pending-preview-header">
              <div className="admin-pending-title-group">
                <span className="admin-pending-badge">
                  <span className="admin-pulse-dot" />
                  Ảnh mới chọn ({pendingFiles.length})
                </span>
                <span className="admin-pending-subtitle">
                  Khung xem trước ảnh gốc (chưa render xóa phông AI). Bấm dấu [✕] để xóa nếu đổi ý.
                </span>
              </div>
              <button
                type="button"
                className="admin-pending-clear-all-btn"
                onClick={clearAllPending}
                disabled={isUploading}
                title="Xóa tất cả ảnh đã chọn"
              >
                Xóa tất cả ({pendingFiles.length})
              </button>
            </div>

            <div className="admin-pending-frames-grid">
              {pendingFiles.map((item, index) => (
                <div key={item.id} className="admin-pending-frame-card">
                  <div className="admin-pending-thumb-frame">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.previewUrl}
                      alt={item.name}
                      className="admin-pending-preview-img"
                    />

                    <span className="admin-pending-status-tag">
                      Chưa xóa phông
                    </span>

                    <button
                      type="button"
                      className="admin-pending-remove-btn"
                      onClick={() => handleRemovePending(item.id)}
                      disabled={isUploading}
                      aria-label={`Xóa ảnh ${item.name}`}
                      title="Xóa ảnh này (nếu đổi ý)"
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>

                    {isUploading ? (
                      <div className="admin-pending-processing-overlay">
                        <div className="admin-spinner" />
                        <span>Đang render xóa phông AI...</span>
                      </div>
                    ) : null}
                  </div>

                  <div className="admin-pending-meta">
                    <span className="admin-pending-filename" title={item.name}>
                      {item.name}
                    </span>
                    <span className="admin-pending-size">
                      {item.sizeFormatted} · Ảnh #{index + 1}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <label className="admin-upload-field-label">
          Mô tả ảnh / Tên ảnh (alt text - không bắt buộc)
          <input
            name="alt"
            value={altText}
            onChange={(e) => setAltText(e.target.value)}
            placeholder={`Để trống sẽ tự động đặt theo "${product.name}"...`}
            disabled={isUploading}
          />
        </label>

        <div className="admin-upload-badge-bar">
          <span className="admin-feature-tag">✦ Tự động xóa phông AI (rembg)</span>
          <span className="admin-feature-tag">✦ Chuẩn hóa khung vuông 1:1 đồng bộ</span>
          <span className="admin-feature-tag">✦ Căn giữa & đổ bóng mềm</span>
        </div>

        <button
          className="admin-button admin-button-primary admin-upload-submit-btn"
          type="submit"
          disabled={isUploading || pendingFiles.length === 0}
        >
          {isUploading ? (
            <>
              <span className="admin-btn-spinner" />
              <span>Đang xóa phông AI & chuẩn hóa 1:1…</span>
            </>
          ) : pendingFiles.length > 0 ? (
            `Tải lên & Xử lý xóa phông AI (${pendingFiles.length} ảnh)`
          ) : (
            'Chọn ảnh ở trên để bắt đầu tải lên'
          )}
        </button>
      </form>
    </div>
  );
}

export function ProductEditDrawer({
  isOpen,
  mode,
  product,
  categories,
  defaultCategoryId,
  defaultBrand,
  activeTab,
  onTabChange,
  onClose,
}: ProductEditDrawerProps) {
  // Listen for Escape key
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const categoryName = product
    ? categories.find((c) => c.id === product.categoryId)?.name ?? product.categoryId
    : null;

  return (
    <>
      {/* Backdrop overlay */}
      <div className="admin-drawer-overlay" onClick={onClose} aria-hidden="true" />

      {/* Drawer slide-over container */}
      <aside
        className="admin-drawer-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
      >
        {/* Header */}
        <header className="admin-drawer-header">
          <div className="admin-drawer-title-group">
            <p className="admin-eyebrow" style={{ margin: '0 0 4px' }}>
              {mode === 'create' ? 'TẠO MỚI SẢN PHẨM' : 'CHỈNH SỬA SẢN PHẨM'}
            </p>
            <h2 id="drawer-title">
              {mode === 'create' ? 'Thêm sản phẩm mới vào kho' : product?.name}
            </h2>
            {mode === 'edit' && product ? (
              <p>
                Danh mục: <strong>{categoryName}</strong> · Hãng: <strong>{product.brand}</strong>
              </p>
            ) : (
              <p>Điền thông tin sản phẩm, chọn danh mục, thương hiệu và cấu hình biến thể SKU.</p>
            )}
          </div>

          <button
            type="button"
            className="admin-drawer-close-btn"
            onClick={onClose}
            aria-label="Đóng cửa sổ"
          >
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </header>

        {/* Tab navigation for Edit mode */}
        {mode === 'edit' && product ? (
          <nav className="admin-drawer-tabs" aria-label="Các mục quản lý sản phẩm">
            <button
              type="button"
              className={`admin-drawer-tab-btn ${activeTab === 'details' ? 'active' : ''}`}
              onClick={() => onTabChange('details')}
            >
              Thông tin & Biến thể
            </button>
            <button
              type="button"
              className={`admin-drawer-tab-btn ${activeTab === 'media' ? 'active' : ''}`}
              onClick={() => onTabChange('media')}
            >
              Hình ảnh & Media ({product.media.length})
            </button>
          </nav>
        ) : null}

        {/* Body content */}
        <div className="admin-drawer-body">
          {mode === 'create' ? (
            <AdminProductForm
              categories={categories}
              defaultCategoryId={defaultCategoryId}
              defaultBrand={defaultBrand}
            />
          ) : product && activeTab === 'details' ? (
            <AdminProductForm categories={categories} product={product} />
          ) : product && activeTab === 'media' ? (
            <div className="admin-drawer-media-wrap">
              <section className="admin-media-section" style={{ borderTop: 'none', margin: 0, padding: 0 }}>
                <div className="admin-section-header-row">
                  <h3>Thư viện media ({product.media.length})</h3>
                  <span className="admin-help">Ảnh lưu trữ trực tiếp trên Supabase Storage</span>
                </div>

                {product.media.length > 0 ? (
                  <ul className="admin-media-grid-list">
                    {product.media.map((media) => (
                      <li key={media.id} className="admin-media-card-item">
                        <div className="admin-media-thumb-wrap">
                          {media.url ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={media.url}
                              alt={media.alt}
                              className="admin-media-full-thumb"
                            />
                          ) : (
                            <div className="admin-media-placeholder">Không có ảnh</div>
                          )}
                        </div>
                        <div className="admin-media-meta-wrap">
                          <a
                            href={media.url}
                            target="_blank"
                            rel="noreferrer"
                            className="admin-media-link"
                          >
                            {media.alt || 'Ảnh không tiêu đề'} ↗
                          </a>
                          <form
                            action={deleteMediaAction}
                            onSubmit={(e) => {
                              if (!window.confirm('Bạn có chắc muốn xoá hình ảnh này khỏi kho media?')) {
                                e.preventDefault();
                              }
                            }}
                          >
                            <input type="hidden" name="mediaId" value={media.id} />
                            <button className="admin-button admin-button-danger" type="submit">
                              Xoá media
                            </button>
                          </form>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="admin-help" style={{ padding: '16px 0' }}>Chưa có hình ảnh nào cho sản phẩm này.</p>
                )}

                <ProductMediaUploader product={product} />
              </section>

              {product.status !== 'archived' ? (
                <section className="admin-archive-danger-zone">
                  <h3>Lưu trữ sản phẩm</h3>
                  <p className="admin-help">
                    Sản phẩm sẽ bị ẩn khỏi danh sách cửa hàng chính nhưng vẫn lưu giữ trong cơ sở dữ
                    liệu để tra cứu đơn hàng cũ.
                  </p>
                  <form
                    action={archiveProductAction}
                    onSubmit={(e) => {
                      if (!window.confirm(`Bạn có chắc muốn lưu trữ sản phẩm "${product.name}"?`)) {
                        e.preventDefault();
                      }
                    }}
                  >
                    <input type="hidden" name="productId" value={product.id} />
                    <button className="admin-button admin-button-danger" type="submit">
                      Lưu trữ sản phẩm này
                    </button>
                  </form>
                </section>
              ) : null}
            </div>
          ) : null}
        </div>
      </aside>
    </>
  );
}
