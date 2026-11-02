'use client';

import { useWorkspaceStore } from '@/store/useWorkspaceStore';

export function BentoGrid() {
  const isNight = useWorkspaceStore((state) => state.isNight);

  return (
    <section className="relative z-10 mx-auto max-w-7xl px-6 py-16 sm:px-12 sm:py-24">
      {/* Section Header */}
      <div className="mb-12 text-center sm:text-left">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-current/60">
          Kỹ nghệ Âm học & Chế tác
        </p>
        <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-5xl">
          Thông số Vượt chuẩn. Thành hình Tinh tế.
        </h2>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-current/75">
          Mỗi chi tiết của Studio One đều được tính toán chuẩn xác từ buồng âm khí động học đến bộ giải mã tín hiệu số phân giải cao.
        </p>
      </div>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Coaxial Acoustic Engine (Spans 2 cols on desktop) */}
        <div
          className={`group relative overflow-hidden rounded-3xl border p-7 sm:p-9 transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl md:col-span-2 ${
            isNight
              ? 'border-white/10 bg-white/[0.04] shadow-black/40 hover:border-white/20'
              : 'border-black/10 bg-white/60 shadow-black/5 hover:border-black/20'
          } backdrop-blur-2xl`}
        >
          <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-gradient-to-br from-amber-400/20 to-orange-500/0 blur-3xl transition-opacity duration-700 group-hover:opacity-100" />
          
          <div className="relative z-10 flex h-full flex-col justify-between">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-current/20 bg-current/[0.06] px-3 py-1 text-xs font-medium tracking-wide">
                <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                Kiến trúc Âm học Coaxial
              </span>
              <h3 className="mt-5 text-2xl font-bold tracking-tight sm:text-3xl">
                Củ loa Đồng trục & Dual Passive Radiators
              </h3>
              <p className="mt-3 max-w-lg text-sm leading-relaxed text-current/75">
                Sự kết hợp giữa củ loa trung trầm màng Carbon Fiber 4.5 inch và loa dải cao vòm lụa 1 inch đặt đồng trục giúp triệt tiêu hiện tượng lệch pha, tái tạo âm trường 360 độ chân thực và trường âm mở rộng.
              </p>
            </div>

            {/* Dynamic Sound Wave & Specs Indicator */}
            <div className="mt-8 rounded-2xl border border-current/10 bg-current/[0.03] p-5 backdrop-blur-md">
              <div className="flex items-center justify-between text-xs font-semibold tracking-wider text-current/70">
                <span>ĐÁP ỨNG TẦN SỐ</span>
                <span className="font-mono text-sm font-bold text-current">42Hz - 22.000Hz</span>
              </div>
              <div className="mt-4 flex items-end gap-1.5 h-10">
                {[40, 65, 30, 85, 95, 45, 70, 100, 60, 80, 50, 90, 75, 40, 85, 60, 95, 70, 50, 30].map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-full bg-current/30 transition-all duration-300 group-hover:bg-amber-500/80"
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
              <div className="mt-3 flex justify-between text-[11px] text-current/60">
                <span>Âm trầm sâu 42Hz</span>
                <span>Áp suất âm cực đại 102dB SPL</span>
                <span>Dải cao mượt mà 22kHz</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Lossless Wireless Streaming */}
        <div
          className={`group relative overflow-hidden rounded-3xl border p-7 sm:p-8 transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl ${
            isNight
              ? 'border-white/10 bg-white/[0.04] shadow-black/40 hover:border-white/20'
              : 'border-black/10 bg-white/60 shadow-black/5 hover:border-black/20'
          } backdrop-blur-2xl`}
        >
          <div className="absolute -left-12 -bottom-12 h-44 w-44 rounded-full bg-cyan-400/15 blur-2xl transition-opacity duration-700" />
          
          <div className="relative z-10 flex h-full flex-col justify-between">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-current/20 bg-current/[0.06] px-3 py-1 text-xs font-medium tracking-wide">
                Lossless Streaming
              </span>
              <h3 className="mt-5 text-xl font-bold tracking-tight">
                Kết nối Đa chuẩn Không nén
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-current/75">
                Hỗ trợ Wi-Fi 6 tốc độ cao cùng Bluetooth 5.4 kép, truyền tải nguyên vẹn định dạng âm thanh 24-bit/96kHz.
              </p>
            </div>

            <ul className="mt-6 space-y-2.5 text-xs font-medium text-current/80 border-t border-current/10 pt-4">
              <li className="flex items-center justify-between">
                <span>Apple AirPlay 2</span>
                <span className="font-mono text-emerald-500 font-semibold">Lossless</span>
              </li>
              <li className="flex items-center justify-between">
                <span>Spotify Connect & Tidal</span>
                <span className="font-mono text-emerald-500 font-semibold">Direct</span>
              </li>
              <li className="flex items-center justify-between">
                <span>LDAC & aptX Lossless</span>
                <span className="font-mono text-emerald-500 font-semibold">990 kbps</span>
              </li>
              <li className="flex items-center justify-between">
                <span>Độ trễ truyền tải</span>
                <span className="font-mono text-current font-semibold">&lt; 15ms</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Card 3: Aerospace Enclosure & Materials */}
        <div
          className={`group relative overflow-hidden rounded-3xl border p-7 sm:p-8 transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl ${
            isNight
              ? 'border-white/10 bg-white/[0.04] shadow-black/40 hover:border-white/20'
              : 'border-black/10 bg-white/60 shadow-black/5 hover:border-black/20'
          } backdrop-blur-2xl`}
        >
          <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-purple-500/15 blur-2xl transition-opacity duration-700" />

          <div className="relative z-10 flex h-full flex-col justify-between">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-current/20 bg-current/[0.06] px-3 py-1 text-xs font-medium tracking-wide">
                Chế tác Hàng không
              </span>
              <h3 className="mt-5 text-xl font-bold tracking-tight">
                Hợp kim Nhôm & Kính Acoustic
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-current/75">
                Khung vỏ nhôm Anodized 6000-series phay CNC kết hợp kính cường lực Acoustic Glass hạn chế rung chấn bề mặt tuyệt đối.
              </p>
            </div>

            <div className="mt-6 rounded-2xl border border-current/10 bg-current/[0.03] p-4 text-xs">
              <div className="flex items-center justify-between font-medium">
                <span>Chuẩn chống bụi ẩm:</span>
                <span className="font-bold text-current">IP54</span>
              </div>
              <div className="mt-2 flex items-center justify-between font-medium">
                <span>Gia công chính xác:</span>
                <span className="font-bold text-current">±0.02 mm</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 4: Real-time DSP & DAC (Spans 2 cols on desktop) */}
        <div
          className={`group relative overflow-hidden rounded-3xl border p-7 sm:p-9 transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl md:col-span-2 ${
            isNight
              ? 'border-white/10 bg-white/[0.04] shadow-black/40 hover:border-white/20'
              : 'border-black/10 bg-white/60 shadow-black/5 hover:border-black/20'
          } backdrop-blur-2xl`}
        >
          <div className="absolute -left-16 -top-16 h-60 w-60 rounded-full bg-emerald-400/15 blur-3xl" />

          <div className="relative z-10 flex h-full flex-col justify-between">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-current/20 bg-current/[0.06] px-3 py-1 text-xs font-medium tracking-wide">
                Xử lý Tín hiệu Số
              </span>
              <h3 className="mt-5 text-2xl font-bold tracking-tight sm:text-3xl">
                Bộ xử lý DSP RoomSense 2.0 & DAC Kép
              </h3>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-current/75">
                Tích hợp microphone phân tích âm học không gian phòng nghe trong thời gian thực. Hệ thống tự động bù trừ tần số dội tường, chống ù dải bass và căn chỉnh âm sắc tương thích theo từng góc kê đặt.
              </p>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-current/10 bg-current/[0.03] p-4 text-center">
                <p className="text-xs text-current/60">Bộ giải mã DAC</p>
                <p className="mt-1 text-lg font-bold">32-bit / 384kHz</p>
                <p className="text-[11px] text-current/50">Burr-Brown Dual</p>
              </div>
              <div className="rounded-2xl border border-current/10 bg-current/[0.03] p-4 text-center">
                <p className="text-xs text-current/60">Mạch khuếch đại</p>
                <p className="mt-1 text-lg font-bold">Class-D 120W</p>
                <p className="text-[11px] text-current/50">Hiệu suất 94%</p>
              </div>
              <div className="rounded-2xl border border-current/10 bg-current/[0.03] p-4 text-center">
                <p className="text-xs text-current/60">Hiệu chuẩn phòng</p>
                <p className="mt-1 text-lg font-bold">Auto-Tune</p>
                <p className="text-[11px] text-current/50">Microphone MEMS</p>
              </div>
            </div>
          </div>
        </div>

        {/* Card 5: Physical Specifications Summary (Spans 2 cols on desktop) */}
        <div
          className={`group relative overflow-hidden rounded-3xl border p-7 sm:p-9 transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl md:col-span-2 ${
            isNight
              ? 'border-white/10 bg-white/[0.04] shadow-black/40 hover:border-white/20'
              : 'border-black/10 bg-white/60 shadow-black/5 hover:border-black/20'
          } backdrop-blur-2xl`}
        >
          <div className="relative z-10 flex h-full flex-col justify-between">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-current/20 bg-current/[0.06] px-3 py-1 text-xs font-medium tracking-wide">
                Bảng thông số Vật lý
              </span>
              <h3 className="mt-5 text-2xl font-bold tracking-tight">
                Chi tiết Kỹ thuật Toàn diện
              </h3>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4 text-xs sm:grid-cols-4">
              <div className="rounded-2xl border border-current/10 bg-current/[0.03] p-4">
                <p className="text-current/60">Kích thước</p>
                <p className="mt-1 text-sm font-semibold">210 × 140 × 140 mm</p>
              </div>
              <div className="rounded-2xl border border-current/10 bg-current/[0.03] p-4">
                <p className="text-current/60">Trọng lượng</p>
                <p className="mt-1 text-sm font-semibold">3.85 kg</p>
              </div>
              <div className="rounded-2xl border border-current/10 bg-current/[0.03] p-4">
                <p className="text-current/60">Nguồn cấp</p>
                <p className="mt-1 text-sm font-semibold">AC 100-240V / PD 100W</p>
              </div>
              <div className="rounded-2xl border border-current/10 bg-current/[0.03] p-4">
                <p className="text-current/60">Bảo hành</p>
                <p className="mt-1 text-sm font-semibold">24 tháng 1-đổi-1</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
