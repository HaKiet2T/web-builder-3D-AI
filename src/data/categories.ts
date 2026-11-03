export interface StoreCategory {
  id: string;
  href: string;
  label: string;
  description: string;
}

export const CATEGORIES: StoreCategory[] = [
  {
    id: 'monitor',
    href: '/monitor',
    label: 'Màn hình',
    description: 'Sáu mẫu ROG Strix và Swift Pro, từ 310 Hz đến 540 Hz.',
  },
  {
    id: 'speaker',
    href: '/speaker',
    label: 'Loa',
    description: 'Loa để bàn cho góc máy làm việc và chơi game.',
  },
  {
    id: 'mouse',
    href: '/mouse',
    label: 'Chuột',
    description: 'Chuột gaming có dây và không dây cho từng kiểu cầm.',
  },
  {
    id: 'keyboard',
    href: '/keyboard',
    label: 'Bàn phím',
    description: 'Bàn phím cơ với nhiều kích cỡ và loại switch.',
  },
  {
    id: 'monitor-led',
    href: '/monitor-led',
    label: 'Đèn màn hình',
    description: 'Đèn nền treo sau màn hình, chỉnh màu theo phong cách.',
  },
];
