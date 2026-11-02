'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';

const PARTICLE_COUNT = 500;
const CELEBRATION_DURATION_SEC = 3.5;

// Hàm sinh số ngẫu nhiên tất định (Deterministic Pseudo-Random) tránh lệch SSR/CSR
const seeded = (index: number, salt: number) => {
  const value = Math.sin(index * 127.1 + salt * 311.7) * 43_758.5453;
  return value - Math.floor(value);
};

export function SuccessParticles() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const celebration = useWorkspaceStore((state) => state.successCelebration);

  // Tạo geometry và material duy nhất cho toàn bộ 500 hạt
  const geometry = useMemo(() => new THREE.IcosahedronGeometry(0.025, 0), []);
  const material = useMemo(
    () => new THREE.MeshBasicMaterial({ color: '#f5b942', transparent: true }),
    [],
  );

  // Khởi tạo thông số ban đầu cho 500 hạt
  const particles = useMemo(
    () =>
      Array.from({ length: PARTICLE_COUNT }, (_, index) => ({
        x: (seeded(index, 0) - 0.5) * 4,
        y: seeded(index, 1) * 3,
        z: (seeded(index, 2) - 0.5) * 2,
        speed: 0.35 + seeded(index, 3) * 0.8,
        scale: 0.5 + seeded(index, 4) * 1.5,
      })),
    [],
  );

  const active = useRef(false);
  const startedAt = useRef(-1);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const lastCelebration = useRef(celebration);

  // Lắng nghe tín hiệu kích hoạt hiệu ứng từ Store
  useEffect(() => {
    if (celebration !== lastCelebration.current) {
      lastCelebration.current = celebration;
      active.current = true;
      startedAt.current = -1;
    }
  }, [celebration]);

  useFrame(({ clock }) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const elapsed = clock.elapsedTime;
    if (active.current && startedAt.current < 0) startedAt.current = elapsed;

    // Tự động ẩn khi hết thời gian hiệu ứng
    if (active.current && elapsed - startedAt.current > CELEBRATION_DURATION_SEC) {
      active.current = false;
    }

    mesh.visible = active.current;
    if (!active.current) return;

    for (let i = 0; i < PARTICLE_COUNT; i += 1) {
      const p = particles[i];
      dummy.position.set(
        p.x + Math.sin(elapsed * p.speed + i) * 0.14,
        ((p.y + (elapsed - startedAt.current) * p.speed) % 3.5) - 0.2,
        p.z,
      );
      dummy.rotation.set(elapsed * p.speed, elapsed * 0.4, 0);
      dummy.scale.setScalar(p.scale);
      dummy.updateMatrix();

      // Gán ma trận 4x4 vào buffer của instance tương ứng
      mesh.setMatrixAt(i, dummy.matrix);
    }

    // Đánh dấu cờ đồng bộ GPU buffer
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, PARTICLE_COUNT]}
      visible={false}
    />
  );
}
