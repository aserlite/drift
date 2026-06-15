import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../store/useGameStore';

const ExplosionParticle = ({ id, position }: { id: number, position: [number, number, number] }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const removeExplosion = useGameStore(state => state.removeExplosion);
  
  const startTime = useRef(Date.now());
  const duration = 500; // 500ms explosion

  useFrame(() => {
    if (!meshRef.current || !materialRef.current) return;
    const elapsed = Date.now() - startTime.current;
    const progress = elapsed / duration;

    if (progress > 1) {
      removeExplosion(id);
      return;
    }

    // Scale up
    const scale = 1 + progress * 8;
    meshRef.current.scale.set(scale, scale, scale);

    // Fade out and change color from white to orange/red
    materialRef.current.opacity = 1 - progress;
    materialRef.current.color.lerpColors(
      new THREE.Color('#ffffff'), 
      new THREE.Color('#ff3300'), 
      progress * 2
    );
  });

  return (
    <mesh ref={meshRef} position={position}>
      <sphereGeometry args={[1, 16, 16]} />
      <meshStandardMaterial 
        ref={materialRef} 
        transparent 
        emissive="#ff3300"
        emissiveIntensity={2}
      />
    </mesh>
  );
};

export const Explosions: React.FC = () => {
  const explosions = useGameStore(state => state.explosions);

  return (
    <>
      {explosions.map(exp => (
        <ExplosionParticle key={exp.id} id={exp.id} position={exp.position} />
      ))}
    </>
  );
};
