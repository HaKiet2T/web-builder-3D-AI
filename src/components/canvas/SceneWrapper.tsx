'use client';

import React, { Component, ReactNode, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { ContactShadows, Environment, OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import type { EnvironmentPreset } from '@/lib/schemas/model-config';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage?: string;
}

/**
 * ErrorBoundary bọc Canvas 3D để bắt các lỗi WebGL hoặc tệp model hỏng
 */
export class CanvasErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, errorMessage: error.message };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[CanvasErrorBoundary] Lỗi render 3D:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-sm text-neutral-500 bg-neutral-100">
            <p className="font-semibold text-neutral-700">Không thể tải khung nhìn 3D</p>
            <p className="mt-1 text-xs">Vui lòng thử tải lại trang hoặc kiểm tra kết nối WebGL của trình duyệt.</p>
          </div>
        )
      );
    }
    return this.props.children;
  }
}

interface SceneWrapperProps {
  children: ReactNode;
  isNight?: boolean;
  environmentPreset?: EnvironmentPreset;
  cameraPosition?: [number, number, number];
  cameraDistance?: number;
  cameraTarget?: [number, number, number];
  autoRotate?: boolean;
  autoRotateSpeed?: number;
  className?: string;
  fallback?: ReactNode;
}

/**
 * SceneWrapper: Khung dùng chung tách biệt cho mọi Three.js Canvas trong dự án.
 * Đảm bảo đồng bộ ánh sáng, camera, bóng đổ và bọc ErrorBoundary an toàn.
 */
export function SceneWrapper({
  children,
  isNight = false,
  environmentPreset,
  cameraPosition = [0, 1.8, 5.2],
  cameraTarget = [0, 0.5, 0],
  autoRotate = false,
  autoRotateSpeed = 1.5,
  className = '!absolute inset-0',
  fallback,
}: SceneWrapperProps) {
  const env: EnvironmentPreset = environmentPreset || (isNight ? 'night' : 'studio');

  return (
    <CanvasErrorBoundary fallback={fallback}>
      <Canvas
        shadows
        dpr={[1, 2]}
        gl={{
          antialias: true,
          alpha: true,
          toneMapping: THREE.AgXToneMapping,
          toneMappingExposure: 1.15,
        }}
        className={className}
      >
        <PerspectiveCamera makeDefault position={cameraPosition} fov={38} />
        <OrbitControls
          enablePan={false}
          minDistance={2}
          maxDistance={8}
          maxPolarAngle={Math.PI / 1.8}
          target={cameraTarget}
          autoRotate={autoRotate}
          autoRotateSpeed={autoRotateSpeed}
        />
        <color attach="background" args={[isNight ? '#10151d' : '#e9e5de']} />
        <ambientLight intensity={isNight ? 0.22 : 0.55} />
        <directionalLight
          position={[4, 7, 5]}
          intensity={isNight ? 1.4 : 2.2}
          castShadow
          shadow-mapSize={[1024, 1024]}
        />
        <Environment preset={env} />

        <Suspense fallback={null}>{children}</Suspense>

        <ContactShadows
          position={[0, 0.02, 0]}
          opacity={isNight ? 0.34 : 0.24}
          scale={7}
          blur={2.8}
          far={3}
        />
      </Canvas>
    </CanvasErrorBoundary>
  );
}
