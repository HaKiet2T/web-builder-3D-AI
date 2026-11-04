import type { Metadata } from 'next';
import { CategoryPlaceholder } from '@/components/layout/CategoryPlaceholder';

export const metadata: Metadata = {
  title: 'Chuột',
  description: 'Chuột gaming có dây và không dây cho từng kiểu cầm.',
};

export default function MousePage() {
  return (
    <CategoryPlaceholder
      title="Chuột"
      description="Chuột gaming có dây và không dây cho từng kiểu cầm. Danh mục này đang được chuẩn bị."
    />
  );
}
