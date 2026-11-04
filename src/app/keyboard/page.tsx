import type { Metadata } from 'next';
import { CategoryPlaceholder } from '@/components/layout/CategoryPlaceholder';

export const metadata: Metadata = {
  title: 'Bàn phím',
  description: 'Bàn phím cơ với nhiều kích cỡ và loại switch.',
};

export default function KeyboardPage() {
  return (
    <CategoryPlaceholder
      title="Bàn phím"
      description="Bàn phím cơ với nhiều kích cỡ và loại switch. Danh mục này đang được chuẩn bị."
    />
  );
}
