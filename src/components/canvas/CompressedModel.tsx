'use client';

import { useEffect, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { DRACOLoader } from 'three-stdlib';
import type { GLTFLoader } from 'three-stdlib';
import type { ThreeElements } from '@react-three/fiber';
import * as THREE from 'three';

// Khởi tạo Singleton DRACOLoader dùng chung cho toàn bộ phiên
const dracoLoader = new DRACOLoader();

// Cấu hình đường dẫn WebAssembly decoder từ CDN chính thức của Google Draco
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
dracoLoader.setDecoderConfig({ type: 'wasm' });

// Tự động phân bổ số lượng Web Worker tối đa theo phần cứng trình duyệt (2 đến 4 workers)
const workerLimit = typeof navigator !== 'undefined'
  ? Math.min(4, Math.max(2, (navigator.hardwareConcurrency || 2) - 1))
  : 2;
dracoLoader.setWorkerLimit(workerLimit);

// Hàm liên kết DRACO Web Worker vào GLTFLoader của Three.js
export const attachDracoWorker = (loader: GLTFLoader) => {
  loader.setDRACOLoader(dracoLoader);
};

export type CompressedModelProps = ThreeElements['group'] & {
  src: string;
};

/**
 * Component tải và render mô hình GLB nén Draco
 * Quá trình giải nén hình học thực thi hoàn toàn trong Web Worker ngoài Main Thread.
 */
export function CompressedModel({ src, ...props }: CompressedModelProps) {
  // Nạp mô hình thông qua hook useGLTF kết hợp DRACO Worker
  const { scene } = useGLTF(src, false, false, attachDracoWorker);

  // Clone scene để các instance độc lập không chia sẻ ma trận biến đổi
  const instance = useMemo(() => scene.clone(true), [scene]);

  // Giải phóng tài nguyên GPU khi component unmount
  useEffect(() => {
    return () => {
      instance.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry?.dispose();
          if (Array.isArray(object.material)) {
            object.material.forEach((mat) => mat.dispose());
          } else {
            object.material?.dispose();
          }
        }
      });
    };
  }, [instance]);

  return <primitive object={instance} {...props} />;
}

// Hỗ trợ Preload mô hình cùng bộ giải nén Draco
CompressedModel.preload = (url: string) => {
  useGLTF.preload(url, false, false, attachDracoWorker);
};
