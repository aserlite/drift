import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { OrthographicCamera, Environment } from '@react-three/drei';
import { Car } from './Car';
import { ProceduralCity } from './ProceduralCity';
import { Explosions } from './Explosions';
import { Smoke } from './Smoke';
import { useGameStore } from '../store/useGameStore';
import * as THREE from 'three';

const CameraController = () => {
  const cameraRef = useRef<THREE.OrthographicCamera>(null);
  const carPosition = useGameStore((state) => state.carPosition);

  useFrame(() => {
    if (cameraRef.current) {
      // Offset for Isometric view
      const targetPos = new THREE.Vector3(
        carPosition[0] + 50,
        carPosition[1] + 50,
        carPosition[2] + 50
      );
      
      // Smoothly move camera towards target
      cameraRef.current.position.lerp(targetPos, 0.1);
      
      // Look at the car
      cameraRef.current.lookAt(carPosition[0], carPosition[1], carPosition[2]);
    }
  });

  return (
    <OrthographicCamera
      ref={cameraRef}
      makeDefault
      zoom={20}
      near={-1000}
      far={1000}
    />
  );
};

export const GameScene: React.FC = () => {
  return (
    <>
      <CameraController />
      
      <ambientLight intensity={0.4} />
      <directionalLight 
        position={[100, 100, 50]} 
        intensity={1.5} 
        castShadow 
        shadow-camera-left={-100}
        shadow-camera-right={100}
        shadow-camera-top={100}
        shadow-camera-bottom={-100}
      />
      
      <Environment preset="city" />

      <Car />
      <ProceduralCity />
      <Explosions />
      <Smoke />
    </>
  );
};
