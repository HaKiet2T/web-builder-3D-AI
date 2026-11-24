import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { listAdminRoomSetups } from '@/lib/room/dal';
import { deleteRoomSetupAction, saveRoomSetupAction, toggleRoomStatusAction } from './actions';
import './admin-room-editor.css';

export const metadata: Metadata = {
  title: 'Quản lý Góc Setup & Phòng 3D | Admin HGK',
};

export default async function AdminRoomsPage() {
  const setups = await listAdminRoomSetups();

  return (
    <div className="admin-room-editor">
      <header className="admin-room-header">
        <div>
          <h1 className="admin-room-title">Quản lý Góc Setup & Không Gian</h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
            Thiết kế phòng setup tương tác, kéo thả sản phẩm và vật phẩm trang trí decor.
          </p>
        </div>
      </header>

      {/* Grid of Existing Setups */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '16px',
        }}
      >
        {setups.map((setup) => (
          <div
            key={setup.id}
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
            }}
          >
            <div style={{ position: 'relative', aspectRatio: '1.6', background: '#f1f5f9' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={setup.bgImageUrl}
                alt={setup.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <span
                className={`admin-room-status-badge admin-room-status-badge--${setup.status}`}
                style={{ position: 'absolute', top: '10px', right: '10px' }}
              >
                {setup.status === 'published' ? 'Đã xuất bản' : 'Bản nháp'}
              </span>
            </div>

            <div style={{ padding: '14px', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#0f172a' }}>
                  {setup.title}
                </h3>
                <span style={{ fontSize: '12px', color: '#be123c', fontWeight: 600 }}>
                  Giảm {setup.comboDiscountPct}%
                </span>
              </div>

              <p
                style={{
                  margin: 0,
                  fontSize: '12px',
                  color: '#64748b',
                  lineHeight: '1.5',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {setup.description || 'Chưa có mô tả chi tiết.'}
              </p>

              <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                Slug: <code>/khong-gian/{setup.slug}</code> · Tỷ lệ: {setup.aspectRatio}
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginTop: 'auto',
                  paddingTop: '10px',
                  borderTop: '1px solid #f1f5f9',
                }}
              >
                <Link
                  href={`/admin/rooms/${setup.id}`}
                  className="admin-room-btn admin-room-btn--primary"
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  Chỉnh sửa bố cục →
                </Link>

                <form action={toggleRoomStatusAction}>
                  <input type="hidden" name="id" value={setup.id} />
                  <input type="hidden" name="slug" value={setup.slug} />
                  <input type="hidden" name="title" value={setup.title} />
                  <input type="hidden" name="bgImageUrl" value={setup.bgImageUrl} />
                  <input type="hidden" name="aspectRatio" value={setup.aspectRatio} />
                  <input type="hidden" name="status" value={setup.status} />
                  <button type="submit" className="admin-room-btn" title="Chuyển trạng thái nháp/xuất bản">
                    {setup.status === 'published' ? 'Hạ nháp' : 'Xuất bản'}
                  </button>
                </form>

                <form action={deleteRoomSetupAction}>
                  <input type="hidden" name="id" value={setup.id} />
                  <button
                    type="submit"
                    className="admin-room-btn"
                    style={{ color: '#be123c' }}
                    title="Xóa góc setup này"
                  >
                    Xóa
                  </button>
                </form>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add New Room Setup Form */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '16px',
          marginTop: '12px',
        }}
      >
        <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: 600 }}>
          + Tạo góc setup mới
        </h3>

        <form
          action={async (formData) => {
            'use server';
            await saveRoomSetupAction({ success: false }, formData);
          }}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}
        >
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
              Tiêu đề góc setup:
            </label>
            <input
              type="text"
              name="title"
              placeholder="Ví dụ: Góc gaming cyberpunk"
              required
              style={{ width: '100%', padding: '7px 10px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
              Slug đường dẫn (URL):
            </label>
            <input
              type="text"
              name="slug"
              placeholder="ví-dụ: goc-gaming-cyberpunk"
              required
              style={{ width: '100%', padding: '7px 10px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
              Đường dẫn ảnh nền:
            </label>
            <input
              type="text"
              name="bgImageUrl"
              defaultValue="/home/setup-goc-lam-viec-toi-gian.png"
              required
              style={{ width: '100%', padding: '7px 10px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
              Chiết khấu combo (%):
            </label>
            <input
              type="number"
              name="comboDiscountPct"
              defaultValue={10}
              min={0}
              max={100}
              style={{ width: '100%', padding: '7px 10px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
            />
          </div>

          <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
            <button type="submit" className="admin-room-btn admin-room-btn--primary">
              Khởi tạo phòng & Mở Editor kéo thả
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
