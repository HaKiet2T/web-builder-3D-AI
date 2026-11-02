'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';

const PARTICLE_COUNT = 500;
const CELEBRATION_MS = 3_500;
const seeded = (index: number, salt: number) => {
  const value = Math.sin(index * 127.1 + salt * 311.7) * 43_758.5453;
  return value - Math.floor(value);
};

export function SuccessParticles() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const celebration = useWorkspaceStore((state) => state.successCelebration);
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
    if (active.current && elapsed - startedAt.current > CELEBRATION_MS / 1000) active.current = false;
    mesh.visible = active.current;
    if (!active.current) return;

    for (let index = 0; index < PARTICLE_COUNT; index += 1) {
      const particle = particles[index];
      dummy.position.set(
        particle.x + Math.sin(elapsed * particle.speed + index) * 0.14,
        ((particle.y + (elapsed - startedAt.current) * particle.speed) % 3.5) - 0.2,
        particle.z,
      );
      dummy.rotation.set(elapsed * particle.speed, elapsed * 0.4, 0);
      dummy.scale.setScalar(particle.scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, PARTICLE_COUNT]} visible={false}>
      <icosahedronGeometry args={[0.025, 0]} />
      <meshBasicMaterial color="#f5b942" transparent />
    </instancedMesh>
  );
}
