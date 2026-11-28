'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Bounds, Center, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { CompressedModel } from '@/components/canvas/CompressedModel';
import { SceneWrapper } from '@/components/canvas/SceneWrapper';
import { disposeThreeObjectResources } from '@/lib/dispose-three-object';
import {
  hasCustomCameraConfig,
  hasCustomScaleConfig,
  type ModelConfig,
} from '@/lib/schemas/model-config';

interface ProductViewer3DProps {
  modelUrl: string;
  config?: ModelConfig | null;
  fallbackImageUrl?: string | null;
  alt?: string;
  isNight?: boolean;
}

/**
 * Nội dung model 3D bên trong Canvas:
 * Áp dụng auto-normalize với <Bounds> & <Center> KHI VÀ CHỈ KHI admin chưa chỉnh tay.
 * Nếu admin đã cấu hình scale/cameraPosition thì ưu tiên giữ nguyên cấu hình chỉnh tay.
 */
function ModelContent({
  modelUrl,
  config,
  onLoaded,
}: {
  modelUrl: string;
  config?: ModelConfig | null;
  onLoaded: () => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const isCustomScale = hasCustomScaleConfig(config);

  useEffect(() => {
    onLoaded();
  }, [onLoaded]);

  // Dọn dẹp tài nguyên Three.js khi unmount
  useEffect(() => {
    const node = groupRef.current;
    return () => {
      if (node) {
        disposeThreeObjectResources(node);
      }
      try {
        useGLTF.clear(modelUrl);
      } catch {
        // bỏ qua nếu loader chưa cache
      }
    };
  }, [modelUrl]);

  const scale = config?.scale || 1;
  const position: [number, number, number] = config?.position
    ? [config.position[0], config.position[1], config.position[2]]
    : [0, 0, 0];
  const rotation: [number, number, number] = config?.rotation
    ? [config.rotation[0], config.rotation[1], config.rotation[2]]
    : [0, 0, 0];

  // Nếu đã chỉnh tay scale hoặc vị trí -> không dùng Bounds để tránh ghi đè
  if (isCustomScale) {
    return (
      <group
        ref={groupRef}
        scale={[scale, scale, scale]}
        position={position}
        rotation={rotation}
      >
        <CompressedModel src={modelUrl} />
      </group>
    );
  }

  // Mặc định: Dùng Bounds + Center tự động cân đối kích thước và tâm xoay
  return (
    <Bounds fit clip observe margin={1.2}>
      <Center>
        <group ref={groupRef} position={position} rotation={rotation}>
          <CompressedModel src={modelUrl} />
        </group>
      </Center>
    </Bounds>
  );
}

/**
 * ProductViewer3D: Component hiển thị mô hình 3D hoàn chỉnh cho sản phẩm
 * - Có poster ảnh 2D trượt mờ khi model đang tải
 * - ErrorBoundary bắt lỗi không làm sập trang
 * - Tự động dọn dẹp bộ nhớ GPU
 */
export function ProductViewer3D({
  modelUrl,
  config,
  fallbackImageUrl,
  alt = 'Mô hình sản phẩm 3D',
  isNight = false,
}: ProductViewer3DProps) {
  const [isReady, setIsReady] = useState(false);
  const isCustomCamera = hasCustomCameraConfig(config);

  const cameraPosition: [number, number, number] =
    isCustomCamera && config?.cameraPosition
      ? [config.cameraPosition[0], config.cameraPosition[1], config.cameraPosition[2]]
      : [0, 1.8, 5.2];

  const cameraTarget: [number, number, number] =
    isCustomCamera && config?.target
      ? [config.target[0], config.target[1], config.target[2]]
      : [0, 0.5, 0];

  const autoRotate = config?.autoRotate ?? false;
  const autoRotateSpeed = config?.autoRotateSpeed ?? 1.5;

  const fallbackUI = fallbackImageUrl ? (
    <div className="absolute inset-0 flex items-center justify-center p-8 bg-neutral-100">
      <div className="relative w-full max-w-md h-80">
        <Image
          src={fallbackImageUrl}
          alt={alt}
          fill
          className="object-contain drop-shadow-xl"
          sizes="(max-width: 768px) 100vw, 50vw"
        />
      </div>
    </div>
  ) : (
    <div className="absolute inset-0 flex items-center justify-center text-sm text-neutral-500 bg-neutral-100">
      Không thể hiển thị 3D cho sản phẩm này.
    </div>
  );

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Canvas 3D */}
      <SceneWrapper
        isNight={isNight}
        environmentPreset={config?.environment || (isNight ? 'night' : 'studio')}
        cameraPosition={cameraPosition}
        cameraTarget={cameraTarget}
        autoRotate={autoRotate}
        autoRotateSpeed={autoRotateSpeed}
        fallback={fallbackUI}
      >
        <ModelContent
          modelUrl={modelUrl}
          config={config}
          onLoaded={() => setIsReady(true)}
        />
      </SceneWrapper>

      {/* Lớp phủ Poster 2D khi GLB đang tải về */}
      {fallbackImageUrl && !isReady && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#e9e5de]/90 backdrop-blur-sm transition-opacity duration-700 pointer-events-none">
          <div className="relative w-64 h-64 animate-pulse">
            <Image
              src={fallbackImageUrl}
              alt={alt}
              fill
              className="object-contain"
              priority
            />
          </div>
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-4 py-2 text-xs text-white backdrop-blur-md">
            Đang nạp mô hình 3D...
          </div>
        </div>
      )}
    </div>
  );
}

export default ProductViewer3D;
