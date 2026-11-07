'use client';

import { useEffect } from 'react';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[admin error]', error.digest ?? error.message);
  }, [error]);

  return (
    <section className="admin-error" role="alert">
      <h1>Không tải được dữ liệu quản trị</h1>
      <p>Kiểm tra kết nối Supabase và quyền truy cập, sau đó thử lại.</p>
      <button className="admin-button" type="button" onClick={reset}>Thử lại</button>
    </section>
  );
}
