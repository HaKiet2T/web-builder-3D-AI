'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';
import { SITE } from '@/lib/site';
import { useTheme } from '@/components/theme/ThemeProvider';
import type { Theme } from '@/components/theme/ThemeProvider';
import type { Category } from '@/lib/catalog/types';
import { getBrowserSupabaseClient } from '@/lib/supabase/client';
import { cartCount, useCartHydrated, useCartStore } from '@/store/cart';

interface SiteHeaderProps {
  /**
   * `solid` sits in the page flow and sticks to the top (Home, category pages).
   * `overlay` keeps a transparent background so a full-screen route such as
   * /monitor can paint its own surface underneath.
   */
  variant?: 'solid' | 'overlay';
  /** Optional short context shown next to the brand, e.g. the collection name. */
  context?: string;
  /**
   * Navigation entries, resolved by the server layout. This component is a
   * client component, so importing the DAL here would ship the whole catalogue
   * to the browser.
   */
  categories: Category[];
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

function UserIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="site-icon">
      <path
        d="M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M20 21a8 8 0 1 0-16 0"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
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

export function SiteHeader({ variant, context, categories }: SiteHeaderProps) {
  const pathname = usePathname();
  const routeContext = pathname ? FULL_SCREEN_ROUTES[pathname] : undefined;
  const resolvedVariant = variant ?? (routeContext ? 'overlay' : 'solid');
  const resolvedContext = context ?? routeContext;
  const { theme, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState<{ email?: string; id?: string } | null>(null);
  const menuId = useId();
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const toggleCart = useCartStore((state) => state.toggleCart);
  const isCartOpen = useCartStore((state) => state.isOpen);
  const cartItems = useCartStore((state) => state.items);
  const totalCartCount = cartCount(cartItems);
  const hydrated = useCartHydrated();

  // Close the mobile menu whenever the route changes.
  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setMenuOpen(false);
  }

  useEffect(() => {
    const supabase = getBrowserSupabaseClient();
    if (!supabase) return;

    supabase.auth.getUser().then(({ data: { user: currentUser } }) => {
      if (currentUser) {
        setUser({ email: currentUser.email, id: currentUser.id });
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({ email: session.user.email, id: session.user.id });
      } else {
        setUser(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

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
  if (pathname?.startsWith('/admin')) return null;

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
          {categories.map((category) => {
            const href = `/${category.slug}`;
            const isCurrent = pathname === href;
            return (
              <li key={category.id}>
                <Link
                  className="site-nav-link"
                  href={href}
                  aria-current={isCurrent ? 'page' : undefined}
                >
                  {category.name}
                </Link>
              </li>
            );
          })}
          <li className="pt-2 mt-2 border-t border-neutral-200/50 dark:border-neutral-800 md:hidden">
            <Link
              className="site-nav-link flex items-center justify-between"
              href={user ? '/account' : '/account/login'}
            >
              <span>{user ? 'Tài khoản của tôi' : 'Đăng nhập / Đăng ký'}</span>
              {user && (
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-semibold">
                  Đã xác thực
                </span>
              )}
            </Link>
          </li>
          <li className="md:hidden">
            <button
              type="button"
              className="site-nav-link flex items-center justify-between w-full text-left"
              onClick={() => {
                setMenuOpen(false);
                toggleCart();
              }}
            >
              <span>Giỏ hàng</span>
              {hydrated && totalCartCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 text-[10px] font-bold">
                  {totalCartCount}
                </span>
              )}
            </button>
          </li>
        </ul>
      </nav>

      <div className="site-actions">
        <Link
          className="site-icon-button relative"
          href={user ? '/account' : '/account/login'}
          aria-label={user ? 'Tài khoản của tôi' : 'Đăng nhập'}
          title={user ? `Tài khoản (${user.email})` : 'Đăng nhập'}
        >
          <UserIcon />
          {user && (
            <span
              className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-neutral-900"
              aria-hidden="true"
            />
          )}
        </Link>
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
        <button
          className="site-icon-button site-cart-link relative"
          type="button"
          onClick={toggleCart}
          aria-expanded={isCartOpen}
          aria-label={`Giỏ hàng${hydrated && totalCartCount > 0 ? ` (${totalCartCount} sản phẩm)` : ''}`}
          title={isCartOpen ? 'Đóng giỏ hàng' : 'Giỏ hàng'}
        >
          <CartIcon />
          {hydrated && totalCartCount > 0 && (
            <span
              className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 text-[10px] font-bold flex items-center justify-center leading-none shadow-sm"
              aria-hidden="true"
            >
              {totalCartCount}
            </span>
          )}
          <span className="site-cart-label">Giỏ hàng</span>
        </button>
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
