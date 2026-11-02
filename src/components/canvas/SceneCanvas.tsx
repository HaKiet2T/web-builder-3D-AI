'use client';

import { ContactShadows, Environment, OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { useLayoutEffect, useRef } from 'react';
import * as THREE from 'three';
import { useWorkspaceStore, type SpeakerColor } from '@/store/useWorkspaceStore';
import { SuccessParticles } from './SuccessParticles';

const COLOR_HEX: Record<SpeakerColor, string> = {
  graphite: '#34383d',
  sand: '#c6a77b',
  ocean: '#257b91',
};

function InteractiveSpeaker() {
  const variant = useWorkspaceStore((state) => state.currentSetup.variant);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const groupRef = useRef<THREE.Group>(null);

  useLayoutEffect(() => {
    if (materialRef.current) {
      materialRef.current.color.set(COLOR_HEX[variant]);
      materialRef.current.needsUpdate = true;
    }
  }, [variant]);

  return (
    <group ref={groupRef} position={[0, 0.95, 0]} rotation={[0.04, -0.32, 0]}>
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[0.72, 0.72, 1.55, 64, 1, true]} />
        <meshStandardMaterial ref={materialRef} color={COLOR_HEX[variant]} roughness={0.34} metalness={0.18} />
      </mesh>
      <mesh position={[0, 0, 0.01]}>
        <circleGeometry args={[0.69, 64]} />
        <meshStandardMaterial color="#17191c" roughness={0.78} />
      </mesh>
      <mesh position={[0, 0, 0.035]}>
        <circleGeometry args={[0.43, 64]} />
        <meshStandardMaterial color="#50565d" roughness={0.48} metalness={0.28} />
      </mesh>
      <mesh position={[0, 0, 0.055]}>
        <circleGeometry args={[0.12, 48]} />
        <meshStandardMaterial color="#151719" roughness={0.35} metalness={0.35} />
      </mesh>
      <mesh position={[0, 0.78, 0]} castShadow>
        <cylinderGeometry args={[0.69, 0.69, 0.08, 64]} />
        <meshStandardMaterial color="#202327" roughness={0.4} metalness={0.3} />
      </mesh>
      <mesh position={[0, -0.78, 0]}>
        <cylinderGeometry args={[0.69, 0.69, 0.08, 64]} />
        <meshStandardMaterial color="#202327" roughness={0.4} metalness={0.3} />
      </mesh>
    </group>
  );
}

export default function SceneCanvas() {
  const isNight = useWorkspaceStore((state) => state.isNight);

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true, toneMapping: THREE.AgXToneMapping, toneMappingExposure: 1.15 }}
      className="!absolute inset-0"
    >
      <PerspectiveCamera makeDefault position={[0, 1.8, 5.2]} fov={38} />
      <OrbitControls
        enablePan={false}
        enableZoom={false}
        minDistance={3.5}
        maxDistance={7}
        maxPolarAngle={Math.PI / 1.8}
      />
      <color attach="background" args={[isNight ? '#10151d' : '#e9e5de']} />
      <ambientLight intensity={isNight ? 0.22 : 0.55} />
      <directionalLight position={[4, 7, 5]} intensity={isNight ? 1.4 : 2.2} castShadow shadow-mapSize={[1024, 1024]} />
      <Environment preset={isNight ? 'night' : 'studio'} />
      <InteractiveSpeaker />
      <SuccessParticles />
      <ContactShadows position={[0, 0.02, 0]} opacity={isNight ? 0.34 : 0.24} scale={7} blur={2.8} far={3} />
    </Canvas>
  );
}
