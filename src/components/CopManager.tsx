/* eslint-disable react-hooks/set-state-in-effect */
import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '../store/useGameStore';
import { Cop } from './Cop';

export const CopManager: React.FC = () => {
  const gameOver = useGameStore((state) => state.gameOver);
  const [cops, setCops] = useState<{ id: number; position: [number, number, number] }[]>([]);
  const timeSinceLastSpawn = useRef(0);
  const positionHistory = useRef<{ time: number; position: [number, number, number] }[]>([]);

  React.useEffect(() => {
    if (!gameOver) {
      setCops([]);
      timeSinceLastSpawn.current = 0;
    }
  }, [gameOver]);

  useFrame((state, delta) => {
    if (gameOver) return;
    
    // Record position history
    const { carPosition } = useGameStore.getState();
    positionHistory.current.push({ time: state.clock.elapsedTime, position: [...carPosition] });
    
    // Clean up old history (older than 2 seconds)
    while (positionHistory.current.length > 0 && state.clock.elapsedTime - positionHistory.current[0].time > 2.0) {
      positionHistory.current.shift();
    }
    
    timeSinceLastSpawn.current += delta;
    const targetTime = cops.length === 0 ? 15 : 30;
    const remaining = Math.max(0, Math.ceil(targetTime - timeSinceLastSpawn.current));
    
    // Update store state for UI but throttle to avoid excessive re-renders if it was perfectly synced
    // Actually, useGameStore.setState is fine but we can just call it
    useGameStore.getState().setTimeToNextCop(remaining);
    
    // Spawn a cop
    if (timeSinceLastSpawn.current >= targetTime) {
      timeSinceLastSpawn.current = 0;
      
      const { carPosition } = useGameStore.getState();
      
      // Find the position from ~1.0 second ago
      const spawnTargetTime = state.clock.elapsedTime - 1.0;
      let spawnX = carPosition[0];
      let spawnZ = carPosition[2];
      let minDiff = Infinity;
      
      for (const entry of positionHistory.current) {
        const diff = Math.abs(entry.time - spawnTargetTime);
        if (diff < minDiff) {
          minDiff = diff;
          spawnX = entry.position[0];
          spawnZ = entry.position[2];
        }
      }

      // Check if player stood still (distance is too small)
      const dist = Math.hypot(spawnX - carPosition[0], spawnZ - carPosition[2]);
      if (dist < 15) {
        // Fallback: spawn a bit further back
        spawnX -= 20;
        spawnZ -= 20;
      }
      
      setCops(prev => [...prev, { id: Date.now(), position: [spawnX, 0.5, spawnZ] }]);
    }
  });

  return (
    <>
      {cops.map((cop) => (
        <Cop key={cop.id} id={cop.id} initialPosition={cop.position} />
      ))}
    </>
  );
};
