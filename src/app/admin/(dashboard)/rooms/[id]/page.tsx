import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { listProducts } from '@/lib/catalog/dal';
import { getRoomSetupById, listDecorAssets } from '@/lib/room/dal';
import { AdminRoomEditor } from '../AdminRoomEditor';

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

export default async function AdminRoomDetailPage({ params }: AdminRoomDetailPageProps) {
  const { id } = await params;
  const [setup, products, decorAssets] = await Promise.all([
    getRoomSetupById(id),
    listProducts(),
    listDecorAssets(),
  ]);

  if (!setup) {
    notFound();
  }

  return (
    <AdminRoomEditor
      initialSetup={setup}
      initialItems={setup.items}
      catalogProducts={products}
      initialDecorAssets={decorAssets}
    />
  );
}
