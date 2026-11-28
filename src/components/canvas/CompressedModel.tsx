'use client';

import { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { DRACOLoader } from 'three-stdlib';
import type { GLTFLoader } from 'three-stdlib';
import type { ThreeElements } from '@react-three/fiber';

// Tải bộ giải nén Draco nội bộ từ /public/draco/ để khớp phiên bản và không phụ thuộc CDN ngoài
const dracoLoader = new DRACOLoader();
dracoLoader
  .setDecoderPath('/draco/')
  .setDecoderConfig({ type: 'wasm' })
  .setWorkerLimit(2);

const attachDracoWorker = (loader: GLTFLoader) => loader.setDRACOLoader(dracoLoader);

/**
 * Component tải và hiển thị mô hình GLB nén Draco với WASM Web Worker
 */
export function CompressedModel({ src, ...props }: ThreeElements['group'] & { src: string }) {
  const { scene } = useGLTF(src, false, false, attachDracoWorker);
  const instance = useMemo(() => scene.clone(true), [scene]);

  return <primitive object={instance} {...props} />;
}
