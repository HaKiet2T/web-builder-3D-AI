import type { Metadata } from 'next';
import { CategoryPlaceholder } from '@/components/layout/CategoryPlaceholder';

export const metadata: Metadata = {
  title: 'Loa',
  description: 'Loa để bàn cho góc máy làm việc và chơi game.',
};

export default function SpeakerPage() {
  return (
    <CategoryPlaceholder
      title="Loa"
      description="Loa để bàn cho góc máy làm việc và chơi game. Danh mục này đang được chuẩn bị."
    />
  );
}
