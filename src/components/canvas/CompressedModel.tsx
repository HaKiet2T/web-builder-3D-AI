'use client';

import { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { DRACOLoader } from 'three-stdlib';
import type { GLTFLoader } from 'three-stdlib';
import type { ThreeElements } from '@react-three/fiber';

const dracoLoader = new DRACOLoader();
dracoLoader
  .setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/')
  .setDecoderConfig({ type: 'wasm' })
  .setWorkerLimit(2);

const attachDracoWorker = (loader: GLTFLoader) => loader.setDRACOLoader(dracoLoader);

/** Reusable GLB renderer with Draco WASM decoding delegated to Web Workers. */
export function CompressedModel({ src, ...props }: ThreeElements['group'] & { src: string }) {
  const { scene } = useGLTF(src, false, false, attachDracoWorker);
  const instance = useMemo(() => scene.clone(true), [scene]);

  return <primitive object={instance} {...props} />;
}
