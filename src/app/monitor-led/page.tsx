import type { Metadata } from 'next';
import { CategoryPlaceholder } from '@/components/layout/CategoryPlaceholder';

export const metadata: Metadata = {
  title: 'Đèn màn hình',
  description: 'Đèn nền treo sau màn hình, chỉnh màu theo phong cách.',
};

export default function MonitorLedPage() {
  return (
    <CategoryPlaceholder
      title="Đèn màn hình"
      description="Đèn nền treo sau màn hình, chỉnh màu theo phong cách. Danh mục này đang được chuẩn bị."
    />
  );
}
