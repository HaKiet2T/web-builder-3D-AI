'use client';

import dynamic from 'next/dynamic';
import { useWorkspaceStore, type SpeakerColor } from '@/store/useWorkspaceStore';

const SceneCanvas = dynamic(() => import('@/components/canvas/SceneCanvas'), {
  ssr: false,
  loading: () => <div className="absolute inset-0 animate-pulse bg-[#e9e5de]" aria-label="Đang tải mô hình 3D" />,
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

  return (
    <main className={`relative isolate min-h-screen overflow-hidden transition-colors duration-500 ${isNight ? 'bg-[#10151d] text-white' : 'bg-[#e9e5de] text-[#202326]'}`}>
      <div className="absolute inset-0">
        <SceneCanvas />
      </div>

      <header className="relative z-10 flex items-center justify-between px-6 py-6 sm:px-12">
        <a href="#home" className="text-sm font-semibold tracking-[0.24em]">FORMA / AUDIO</a>
        <button
          type="button"
          onClick={toggleNight}
          className="rounded-full border border-current/25 bg-white/35 px-4 py-2 text-sm backdrop-blur-md transition hover:bg-white/55"
          aria-pressed={isNight}
        >
          {isNight ? 'Chế độ ngày' : 'Chế độ đêm'}
        </button>
      </header>

      <section className="relative z-10 flex min-h-[calc(100vh-88px)] items-end px-6 pb-10 sm:px-12 sm:pb-14" aria-label="Tùy chỉnh loa Studio One">
        <div className="max-w-md rounded-3xl border border-white/35 bg-white/65 p-6 shadow-xl shadow-black/10 backdrop-blur-xl sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-current/55">Âm thanh, thành hình</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">Studio One</h1>
          <p className="mt-3 max-w-sm text-sm leading-6 text-current/70">Loa không dây tối giản, hoàn thiện thủ công và sẵn sàng lấp đầy căn phòng bằng âm thanh.</p>

          <div className="mt-7">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-current/55">Chọn màu</p>
            <div className="mt-3 flex gap-3">
              {colorOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setVariant(option.id)}
                  aria-label={`Chọn màu ${option.label}`}
                  aria-pressed={variant === option.id}
                  className={`flex h-11 w-11 items-center justify-center rounded-full border-2 transition ${variant === option.id ? 'border-current' : 'border-transparent'}`}
                >
                  <span className="h-8 w-8 rounded-full border border-black/10" style={{ backgroundColor: option.swatch }} />
                </button>
              ))}
            </div>
            <p className="mt-2 text-sm text-current/65">{colorOptions.find((option) => option.id === variant)?.label}</p>
          </div>

          <div className="mt-7 flex items-end justify-between gap-6 border-t border-current/15 pt-5">
            <div>
              <p className="text-xs text-current/55">Giá tùy chọn</p>
              <p className="mt-1 text-xl font-semibold">{formatPrice(totalPrice)}</p>
            </div>
            <button type="button" className="rounded-full bg-[#202326] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#3b4146]">
              Thêm vào giỏ
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
