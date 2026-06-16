import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { OrthographicCamera, PerspectiveCamera, Environment } from '@react-three/drei';
import { Car } from './Car';
import { ProceduralCity } from './ProceduralCity';
import { Explosions } from './Explosions';
import { CopManager } from './CopManager';
import { PipRenderer } from './PipRenderer';
import { Smoke } from './Smoke';
import { useGameStore } from '../store/useGameStore';
import * as THREE from 'three';

const CameraController = () => {
  const isoCamRef = useRef<THREE.OrthographicCamera>(null);
  const tpsCamRef = useRef<THREE.PerspectiveCamera>(null);
  const carPosition = useGameStore((state) => state.carPosition);
  const carHeading = useGameStore((state) => state.carHeading);
  const mainView = useGameStore((state) => state.mainView);

  const camHeadingRef = useRef(carHeading);

  useFrame((state, delta) => {
    if (isoCamRef.current) {
      // Offset for Isometric view
      const targetPos = new THREE.Vector3(
        carPosition[0] + 50,
        carPosition[1] + 50,
        carPosition[2] + 50
      );
      // Smoothly move camera towards target
      isoCamRef.current.position.lerp(targetPos, 0.1);
      // Look at the car
      isoCamRef.current.lookAt(carPosition[0], carPosition[1], carPosition[2]);
    }
    
    // Smooth camera heading
    let diff = carHeading - camHeadingRef.current;
    while (diff <= -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    
    camHeadingRef.current += diff * (4.0 * delta); // Adjust 4.0 for stiffness

    if (tpsCamRef.current) {
      // TPS Camera Logic
      // Put camera slightly above and behind the car, using smoothed heading
      const offset = new THREE.Vector3(0, 3, -6); 
      offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), camHeadingRef.current);
      
      tpsCamRef.current.position.set(
        carPosition[0] + offset.x,
        carPosition[1] + offset.y,
        carPosition[2] + offset.z
      );
      
      // Look slightly ahead using the smoothed heading
      const lookAtTarget = new THREE.Vector3(0, 0.5, 4);
      lookAtTarget.applyAxisAngle(new THREE.Vector3(0, 1, 0), camHeadingRef.current);
      
      tpsCamRef.current.lookAt(
        carPosition[0] + lookAtTarget.x,
        carPosition[1] + lookAtTarget.y,
        carPosition[2] + lookAtTarget.z
      );
    }
  });

  return (
    <>
      <OrthographicCamera
        name="isoCam"
        ref={isoCamRef}
        makeDefault={mainView === 'isometric'}
        zoom={20}
        near={-1000}
        far={1000}
      />
      <PerspectiveCamera
        name="tpsCam"
        ref={tpsCamRef}
        makeDefault={mainView === 'tps'}
        fov={75}
        near={0.1}
        far={1000}
      />
    </>
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
      <CopManager />
      <Smoke />
      <PipRenderer />
    </>
  );
};
