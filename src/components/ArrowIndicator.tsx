import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../store/useGameStore';

export const ArrowIndicator: React.FC = () => {
  const meshRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!meshRef.current) return;
    
    const { gameMode, carPosition, networkCopPos, networkCarPos, gameOver } = useGameStore.getState();

    // Hide if singleplayer or game over
    if (gameMode === 'single' || gameOver) {
      meshRef.current.visible = false;
      return;
    }
    
    meshRef.current.visible = true;

    // The local player's camera follows `carPosition`, which is the true position of the player's controlled entity
    // The opponent is the "network" position of the entity they are NOT controlling.
    let targetPos: [number, number, number];
    
    if (gameMode === 'host') {
      // Host controls Car, target is Cop
      targetPos = networkCopPos;
    } else {
      // Client controls Cop, target is Car
      targetPos = networkCarPos;
    }

    // Position the arrow above the player
    meshRef.current.position.set(carPosition[0], carPosition[1] + 3, carPosition[2]);

    // Look at the target
    meshRef.current.lookAt(targetPos[0], targetPos[1] + 3, targetPos[2]);
  });

  return (
    <group ref={meshRef}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.5, 1.5, 3]} />
        <meshStandardMaterial color="#ffff00" emissive="#ffff00" emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
};
