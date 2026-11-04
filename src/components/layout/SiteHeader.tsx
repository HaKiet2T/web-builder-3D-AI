'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';
import { CATEGORIES } from '@/data/categories';
import { SITE } from '@/lib/site';
import { useTheme } from '@/components/theme/ThemeProvider';
import type { Theme } from '@/components/theme/ThemeProvider';

interface SiteHeaderProps {
  /**
   * `solid` sits in the page flow and sticks to the top (Home, category pages).
   * `overlay` keeps a transparent background so a full-screen route such as
   * /monitor can paint its own surface underneath.
   */
  variant?: 'solid' | 'overlay';
  /** Optional short context shown next to the brand, e.g. the collection name. */
  context?: string;
}

/**
 * Routes that own the whole viewport. They inherit the shared header but drop
 * its background so their own stage shows through.
 */
const FULL_SCREEN_ROUTES: Record<string, string> = {
  '/monitor': 'Bộ sưu tập màn hình',
};

function ThemeIcon({ theme }: { theme: Theme }) {
  if (theme === 'light') {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="site-icon">
        <circle cx="12" cy="12" r="3.7" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M12 2.5v2m0 15v2m9.5-9.5h-2m-15 0h-2m16.22-6.72-1.42 1.42M6.7 17.3l-1.42 1.42m13.44 0-1.42-1.42M6.7 6.7 5.28 5.28"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="site-icon">
      <path
        d="M19.8 15.2A8.1 8.1 0 0 1 8.8 4.2 8.2 8.2 0 1 0 19.8 15.2Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="site-icon">
      <path
        d="M4 5h2l1.6 9.2a1.5 1.5 0 0 0 1.5 1.3h7.7a1.5 1.5 0 0 0 1.5-1.2L19.5 8H7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="19.5" r="1.2" fill="currentColor" />
      <circle cx="17" cy="19.5" r="1.2" fill="currentColor" />
    </svg>
  );
}

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="site-icon">
      <path
        d={open ? 'M6 6l12 12M18 6 6 18' : 'M4 8h16M4 16h16'}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function SiteHeader({ variant, context }: SiteHeaderProps) {
  const pathname = usePathname();
  const routeContext = pathname ? FULL_SCREEN_ROUTES[pathname] : undefined;
  const resolvedVariant = variant ?? (routeContext ? 'overlay' : 'solid');
  const resolvedContext = context ?? routeContext;
  const { theme, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  // Close the mobile menu whenever the route changes.
  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setMenuOpen(false);
  }

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setMenuOpen(false);
      menuButtonRef.current?.focus();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  const themeLabel = theme === 'light' ? 'Chuyển sang chế độ tối' : 'Chuyển sang chế độ sáng';
  const isCart = pathname === '/cart';

  return (
    <header className="site-header" data-variant={resolvedVariant} data-menu-open={menuOpen}>
      <div className="site-header-start">
        <Link className="site-brand" href="/" aria-label={`${SITE.name}, về trang chủ`}>
          {SITE.name}
        </Link>
        {resolvedContext ? (
          <>
            <span className="site-brand-rule" aria-hidden="true" />
            <span className="site-context">{resolvedContext}</span>
          </>
        ) : null}
      </div>

      <nav className="site-nav" aria-label="Danh mục sản phẩm">
        <ul id={menuId} className="site-nav-list">
          {CATEGORIES.map((category) => {
            const isCurrent = pathname === category.href;
            return (
              <li key={category.id}>
                <Link
                  className="site-nav-link"
                  href={category.href}
                  aria-current={isCurrent ? 'page' : undefined}
                >
                  {category.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="site-actions">
        <button
          className="site-icon-button"
          type="button"
          onClick={toggleTheme}
          aria-label={themeLabel}
          aria-pressed={theme === 'dark'}
          title={themeLabel}
        >
          <ThemeIcon theme={theme} />
        </button>
        <Link
          className="site-icon-button site-cart-link"
          href="/cart"
          aria-current={isCart ? 'page' : undefined}
        >
          <CartIcon />
          <span className="site-cart-label">Giỏ hàng</span>
        </Link>
        <button
          ref={menuButtonRef}
          className="site-icon-button site-menu-button"
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-controls={menuId}
          aria-label={menuOpen ? 'Đóng danh mục' : 'Mở danh mục'}
        >
          <MenuIcon open={menuOpen} />
        </button>
      </div>
    </header>
  );
}
