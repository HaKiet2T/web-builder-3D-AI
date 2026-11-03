import type { Metadata } from 'next';
import { MonitorStorefront } from '@/components/ui/MonitorStorefront';
import { monitors } from '@/data/monitors';

export const metadata: Metadata = {
  title: 'Màn hình ROG | ASUS Republic of Gamers',
  description: 'Khám phá bộ sưu tập màn hình gaming ASUS ROG với vòng sản phẩm có thể tương tác.',
};

export default function MonitorPage() {
  return <MonitorStorefront products={monitors} />;
}
