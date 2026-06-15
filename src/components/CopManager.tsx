/* eslint-disable react-hooks/set-state-in-effect */
import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '../store/useGameStore';
import { Cop } from './Cop';

export const CopManager: React.FC = () => {
  const gameOver = useGameStore((state) => state.gameOver);
  const [cops, setCops] = useState<{ id: number; position: [number, number, number] }[]>([]);
  const timeSinceLastSpawn = useRef(0);

  React.useEffect(() => {
    if (!gameOver) {
      setCops([]);
      timeSinceLastSpawn.current = 0;
    }
  }, [gameOver]);

  useFrame((_, delta) => {
    if (gameOver) return;
    
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
      
      // Pick a random sector 1 to 2 sectors away from the player
      const playerSx = Math.floor(carPosition[0] / 50);
      const playerSz = Math.floor(carPosition[2] / 50);

      let offsetSx = 0;
      let offsetSz = 0;
      // Ensure they don't spawn in the exact same sector as the player
      while (Math.abs(offsetSx) <= 1 && Math.abs(offsetSz) <= 1) {
        offsetSx = Math.floor(Math.random() * 5) - 2; // -2, -1, 0, 1, 2
        offsetSz = Math.floor(Math.random() * 5) - 2;
      }
      
      const targetSx = playerSx + offsetSx;
      const targetSz = playerSz + offsetSz;
      
      // Calculate sector positions including the Staggered Grid offset
      const offset = Math.abs(targetSz) % 2 === 1 ? 25 : 0;
      const bx = targetSx * 50 + offset;
      const bz = targetSz * 50;

      let spawnX, spawnZ;
      if (Math.random() > 0.5) {
        // Spawn perfectly on the center of the Horizontal Road
        spawnX = bx + Math.random() * 50;
        spawnZ = bz + 25;
      } else {
        // Spawn perfectly on the center of the Vertical Road
        spawnX = bx + 25;
        spawnZ = bz + Math.random() * 50;
      }
      
      setCops(prev => [...prev, { id: Date.now(), position: [spawnX, 0.5, spawnZ] }]);
    }
  });

  return (
    <>
      {cops.map((cop) => (
        <Cop key={cop.id} initialPosition={cop.position} />
      ))}
    </>
  );
};
