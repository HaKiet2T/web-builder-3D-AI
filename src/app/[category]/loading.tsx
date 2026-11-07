/**
 * Loading shell for the catalogue routes.
 *
 * Marked `aria-busy` and visually quiet so it reads as a pending state rather
 * than a flash of empty content.
 */
export default function Loading() {
  return (
    <div className="home-page">
      <main className="home-main" aria-busy="true">
        <section className="home-hero">
          <p className="cart-loading">Đang tải danh mục…</p>
        </section>
        <ul className="product-grid" aria-hidden="true">
          {[0, 1, 2, 3].map((key) => (
            <li key={key}>
              <div className="product-card" data-skeleton="true">
                <div className="product-card-media" />
                <div className="product-card-body">
                  <span className="product-card-name">&nbsp;</span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}