'use client';

import dynamic from 'next/dynamic';
import { useWorkspaceStore, type SpeakerColor } from '@/store/useWorkspaceStore';
import { BentoGrid } from '@/components/ui/BentoGrid';
import { SlideOutCart } from '@/components/ui/SlideOutCart';

const SceneCanvas = dynamic(() => import('@/components/canvas/SceneCanvas'), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 animate-pulse bg-[#e9e5de] dark:bg-[#10151d]" aria-label="Đang tải mô hình 3D" />
  ),
});

const colorOptions: { id: SpeakerColor; label: string; swatch: string }[] = [
  { id: 'graphite', label: 'Than chì', swatch: '#34383d' },
  { id: 'sand', label: 'Cát', swatch: '#c6a77b' },
  { id: 'ocean', label: 'Đại dương', swatch: '#257b91' },
];

const formatPrice = (price: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(price);

export default function Home() {
  const variant = useWorkspaceStore((state) => state.currentSetup.variant);
  const totalPrice = useWorkspaceStore((state) => state.getTotalPrice());
  const isNight = useWorkspaceStore((state) => state.isNight);
  const setVariant = useWorkspaceStore((state) => state.setVariant);
  const toggleNight = useWorkspaceStore((state) => state.toggleNight);
  const addToCart = useWorkspaceStore((state) => state.addToCart);
  const setIsCartOpen = useWorkspaceStore((state) => state.setIsCartOpen);
  const cartItems = useWorkspaceStore((state) => state.cartItems);

  const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  const handleAddToCart = () => {
    addToCart();
  };

  return (
    <main
      className={`relative isolate min-h-screen transition-colors duration-500 ${
        isNight ? 'dark bg-[#10151d] text-white' : 'bg-[#e9e5de] text-[#202326]'
      }`}
    >
      {/* Navigation Header */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-5 sm:px-12 backdrop-blur-md bg-transparent">
        <a href="#home" className="text-sm font-semibold tracking-[0.24em]">
          FORMA / AUDIO
        </a>
        <div className="flex items-center gap-3">
          {/* Day / Night Toggle */}
          <button
            type="button"
            onClick={toggleNight}
            className="rounded-full border border-current/25 bg-white/35 dark:bg-black/35 px-4 py-2 text-sm backdrop-blur-md transition hover:bg-white/55 dark:hover:bg-black/55"
            aria-pressed={isNight}
          >
            {isNight ? 'Chế độ ngày' : 'Chế độ đêm'}
          </button>

          {/* Cart Trigger */}
          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="relative flex items-center gap-2 rounded-full border border-current/25 bg-white/35 dark:bg-black/35 px-4 py-2 text-sm backdrop-blur-md transition hover:bg-white/55 dark:hover:bg-black/55"
            aria-label="Xem giỏ hàng"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
              />
            </svg>
            <span className="hidden sm:inline">Giỏ hàng</span>
            {cartCount > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-black">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Hero Section with 3D Canvas Viewport */}
      <section
        id="home"
        className="relative min-h-[calc(100vh-80px)] flex items-end px-6 pb-12 sm:px-12 sm:pb-16 overflow-hidden pointer-events-none"
        aria-label="Tùy chỉnh loa Studio One"
      >
        {/* 3D Canvas Background inside Hero */}
        <div className="absolute inset-0 pointer-events-auto z-0">
          <SceneCanvas />
        </div>

        {/* 3D Customizer Card */}
        <div
          className={`relative z-10 max-w-md rounded-3xl border p-6 sm:p-8 shadow-2xl backdrop-blur-2xl transition-all duration-500 pointer-events-auto ${
            isNight
              ? 'border-white/15 bg-black/40 text-white shadow-black/40'
              : 'border-white/40 bg-white/70 text-[#202326] shadow-black/10'
          }`}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-current/55">
            Âm thanh, thành hình
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">Studio One</h1>
          <p className="mt-3 max-w-sm text-sm leading-6 text-current/75">
            Loa không dây tối giản, hoàn thiện thủ công và sẵn sàng lấp đầy căn phòng bằng âm thanh chân thực 360 độ. Kéo thả để xoay mô hình 3D.
          </p>

          <div className="mt-7">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-current/55">Chọn màu hoàn thiện</p>
            <div className="mt-3 flex gap-3">
              {colorOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setVariant(option.id)}
                  aria-label={`Chọn màu ${option.label}`}
                  aria-pressed={variant === option.id}
                  className={`flex h-11 w-11 items-center justify-center rounded-full border-2 transition ${
                    variant === option.id ? 'border-current scale-105' : 'border-transparent opacity-75 hover:opacity-100'
                  }`}
                >
                  <span
                    className="h-8 w-8 rounded-full border border-black/15 shadow-sm"
                    style={{ backgroundColor: option.swatch }}
                  />
                </button>
              ))}
            </div>
            <p className="mt-2 text-sm font-medium text-current/80">
              {colorOptions.find((option) => option.id === variant)?.label}
            </p>
          </div>

          <div className="mt-7 flex items-end justify-between gap-6 border-t border-current/15 pt-5">
            <div>
              <p className="text-xs text-current/55">Giá tùy chọn</p>
              <p className="mt-1 text-2xl font-bold font-mono tracking-tight">{formatPrice(totalPrice)}</p>
            </div>
            <button
              type="button"
              onClick={handleAddToCart}
              className="rounded-full bg-[#202326] dark:bg-white dark:text-black px-6 py-3 text-sm font-bold text-white shadow-lg hover:opacity-90 active:scale-95 transition"
            >
              Thêm vào giỏ
            </button>
          </div>
        </div>
      </section>

      {/* Bento Grid Section - Technical Specifications */}
      <BentoGrid />

      {/* Slide-out Cart Drawer with Split Shipment */}
      <SlideOutCart />

      {/* Simple Brand Footer */}
      <footer className="relative z-10 border-t border-current/10 py-10 text-center text-xs text-current/50">
        <p>© 2026 FORMA Audio Inc. Thiết kế & Kỹ nghệ âm học cao cấp.</p>
      </footer>
    </main>
  );
}
