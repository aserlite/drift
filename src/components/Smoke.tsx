import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { particles } from '../utils/smokeSystem';

export const Smoke: React.FC = () => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = new THREE.Object3D();

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    
    let activeCount = 0;
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= delta;
      if (p.life <= 0) {
        particles.splice(i, 1);
        continue;
      }
      
      // Smoke rises slowly
      p.pos.y += delta * 1.5;
      
      // Smoke expands as it dies
      const progress = 1 - (p.life / p.maxLife);
      const s = p.scale * (1 + progress * 3);
      
      dummy.position.copy(p.pos);
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      
      meshRef.current.setMatrixAt(activeCount, dummy.matrix);
      activeCount++;
      
      if (activeCount >= 1000) break; // Safety limit
    }
    
    meshRef.current.count = activeCount;
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, 1000]}>
      <sphereGeometry args={[0.5, 8, 8]} />
      <meshStandardMaterial color="#cccccc" transparent opacity={0.3} depthWrite={false} />
    </instancedMesh>
  );
};
