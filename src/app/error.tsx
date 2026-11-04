'use client';

import { useEffect } from 'react';

/**
 * Route-level error boundary.
 *
 * The message is deliberately generic: an unexpected catalogue failure should
 * not leak server internals to the shopper.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface the digest so a server log can be correlated with the report.
    console.error('[storefront error]', error.digest ?? error.message);
  }, [error]);

  return (
    <div className="home-page">
      <main className="home-main">
        <section className="home-hero" aria-labelledby="error-title">
          <h1 id="error-title">Đã xảy ra lỗi</h1>
          <p className="home-intro">
            Không tải được nội dung này. Thử lại, hoặc quay về trang chủ nếu lỗi vẫn còn.
          </p>
        </section>

        <p className="page-empty">
          <button className="page-inline-link" type="button" onClick={reset}>
            Thử lại
          </button>
        </p>
      </main>
    </div>
  );
}