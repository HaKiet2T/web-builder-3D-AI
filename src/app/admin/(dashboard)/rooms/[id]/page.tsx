import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { listProducts } from '@/lib/catalog/dal';
import { getRoomSetupById, list3DModelAssets, listDecorAssets } from '@/lib/room/dal';
import { AdminRoomEditor } from '../AdminRoomEditor';

export const instant = false;

interface AdminRoomDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: AdminRoomDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const setup = await getRoomSetupById(id);
  return {
    title: setup ? `Bố cục: ${setup.title} | Admin HGK` : 'Chỉnh sửa góc setup',
  };
}

export default function AdminRoomDetailPage({ params }: AdminRoomDetailPageProps) {
  return (
    <Suspense fallback={<RoomDetailLoading />}>
      <AdminRoomDetailContent params={params} />
    </Suspense>
  );
}

function RoomDetailLoading() {
  return (
    <div className="admin-room-editor" aria-busy="true">
      <header className="admin-room-header">
        <div>
          <h1 className="admin-room-title">Đang tải bố cục góc setup...</h1>
        </div>
      </header>
      <div
        style={{
          width: '100%',
          height: '520px',
          background: '#f1f5f9',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#64748b',
          fontSize: '14px',
        }}
      >
        Đang khởi tạo không gian 3D...
      </div>
    </div>
  );
}

async function AdminRoomDetailContent({ params }: AdminRoomDetailPageProps) {
  await connection();
  const { id } = await params;
  const [setup, products, decorAssets] = await Promise.all([
    getRoomSetupById(id),
    listProducts(),
    listDecorAssets(),
  ]);
  const models3d = await list3DModelAssets();

  if (!setup) {
    notFound();
  }

  return (
    <AdminRoomEditor
      initialSetup={setup}
      initialItems={setup.items}
      catalogProducts={products}
      initialDecorAssets={decorAssets}
      initial3DModels={models3d}
    />
  );
}

