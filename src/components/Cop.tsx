/* eslint-disable react-hooks/purity */
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../store/useGameStore';
import { emitSmoke } from '../utils/smokeSystem';

// Cop AI Physics Constants (Slightly slower than player)
const ACCELERATION = 35; // Player is 40
const MAX_SPEED = 50; // Player is 60
const TURN_SPEED = 2.5; // Player is 3.5
const FRICTION = 0.98;
const LATERAL_FRICTION_NORMAL = 0.90;
const LATERAL_FRICTION_DRIFT = 0.98;

interface CopProps {
  initialPosition: [number, number, number];
}

export const Cop: React.FC<CopProps> = ({ initialPosition }) => {
  const meshRef = useRef<THREE.Group>(null);
  const gameOver = useGameStore((state) => state.gameOver);
  const setGameOver = useGameStore((state) => state.setGameOver);
  const addExplosion = useGameStore((state) => state.addExplosion);
  
  const velocity = useRef(new THREE.Vector3());
  const heading = useRef(0);
  
  // To avoid flashing lights being synced across all cops, add random offset
  const lightOffset = useMemo(() => Math.random() * Math.PI, []);

  // Material refs for sirens
  const blueSirenRef = useRef<THREE.MeshStandardMaterial>(null);
  const redSirenRef = useRef<THREE.MeshStandardMaterial>(null);

  useFrame((state, delta) => {
    if (!meshRef.current || gameOver) return;
    
    // Siren blinking effect
    if (blueSirenRef.current && redSirenRef.current) {
      const time = state.clock.elapsedTime * 10 + lightOffset;
      blueSirenRef.current.emissiveIntensity = Math.sin(time) > 0 ? 5 : 0;
      redSirenRef.current.emissiveIntensity = Math.sin(time) <= 0 ? 5 : 0;
    }

    const { carPosition, spatialHash } = useGameStore.getState();
    const cx = meshRef.current.position.x;
    const cz = meshRef.current.position.z;
    const playerX = carPosition[0];
    const playerZ = carPosition[2];

    // Distance to player
    const distToPlayer = Math.hypot(playerX - cx, playerZ - cz);

    // Collision with Player!
    if (distToPlayer < 3.5) {
      addExplosion([cx, 2, cz]);
      addExplosion([playerX, 2, playerZ]);
      setGameOver(true);
      return;
    }

    // AI Logic: Steer towards player
    const angleToPlayer = Math.atan2(playerX - cx, playerZ - cz);
    
    // Normalize angle difference to [-PI, PI]
    let diff = angleToPlayer - heading.current;
    while (diff <= -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;

    const isTurningLeft = diff > 0.1;
    const isTurningRight = diff < -0.1;
    
    // Always accelerate unless very close
    const isAccelerating = distToPlayer > 5;
    const isSpace = Math.abs(diff) > 1.0; // Handbrake drift if turn is very sharp!

    const speed = velocity.current.length();
    const isMovingForward = velocity.current.dot(new THREE.Vector3(Math.sin(heading.current), 0, Math.cos(heading.current))) > 0;

    // Steering
    if (speed > 1) {
      const turnMultiplier = isMovingForward ? 1 : -1;
      if (isTurningLeft) heading.current += TURN_SPEED * delta * turnMultiplier;
      if (isTurningRight) heading.current -= TURN_SPEED * delta * turnMultiplier;
    }

    // Forward vector
    const forward = new THREE.Vector3(Math.sin(heading.current), 0, Math.cos(heading.current));
    const right = new THREE.Vector3(forward.z, 0, -forward.x);

    // Acceleration
    if (isAccelerating) {
      velocity.current.add(forward.clone().multiplyScalar(ACCELERATION * delta));
    }

    // Friction & Drift
    const forwardSpeed = velocity.current.dot(forward);
    const lateralSpeed = velocity.current.dot(right);
    const lateralFriction = (isSpace || Math.abs(lateralSpeed) > 15) ? LATERAL_FRICTION_DRIFT : LATERAL_FRICTION_NORMAL;
    
    const forwardVec = forward.clone().multiplyScalar(forwardSpeed * FRICTION);
    const lateralVec = right.clone().multiplyScalar(lateralSpeed * lateralFriction);
    
    velocity.current.copy(forwardVec.add(lateralVec));

    if (velocity.current.length() > MAX_SPEED) {
      velocity.current.normalize().multiplyScalar(MAX_SPEED);
    }

    meshRef.current.position.add(velocity.current.clone().multiplyScalar(delta));
    meshRef.current.rotation.y = heading.current;

    if (Math.abs(lateralSpeed) > 10 && speed > 20) {
      emitSmoke(meshRef.current.position);
    }

    // Building Collisions
    const chunkX = Math.floor(cx / 20);
    const chunkZ = Math.floor(cz / 20);
    let collided = false;

    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        if (collided) break;
        const key = `${chunkX + i},${chunkZ + j}`;
        const buildings = spatialHash.get(key);
        if (buildings) {
          for (const b of buildings) {
            const dx = cx - b.x;
            const dz = cz - b.z;
            const cos = Math.cos(-b.rot);
            const sin = Math.sin(-b.rot);
            const localX = dx * cos - dz * sin;
            const localZ = dx * sin + dz * cos;

            if (Math.abs(localX) < b.w && Math.abs(localZ) < b.d) {
              collided = true;
              break;
            }
          }
        }
      }
    }

    if (collided) {
      if (speed > 10) addExplosion([cx, 2, cz]);
      // Cops bounce back
      velocity.current.multiplyScalar(-0.5);
      meshRef.current.position.add(velocity.current.clone().multiplyScalar(delta * 2));
    }
  });

  return (
    <group ref={meshRef} position={initialPosition}>
      {/* Police Car Body */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[2, 1, 4]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      
      {/* Police Blue Stripe */}
      <mesh position={[0, 0.51, 0]}>
        <boxGeometry args={[0.8, 0.05, 4]} />
        <meshStandardMaterial color="#0055ff" />
      </mesh>

      {/* Windshield */}
      <mesh castShadow position={[0, 0.25, 0.8]}>
        <boxGeometry args={[1.8, 0.6, 1.2]} />
        <meshStandardMaterial color="#111111" />
      </mesh>

      {/* Sirens */}
      <mesh position={[-0.4, 0.6, 0]}>
        <boxGeometry args={[0.5, 0.2, 0.3]} />
        <meshStandardMaterial ref={blueSirenRef} color="#0055ff" emissive="#0055ff" />
      </mesh>
      <mesh position={[0.4, 0.6, 0]}>
        <boxGeometry args={[0.5, 0.2, 0.3]} />
        <meshStandardMaterial ref={redSirenRef} color="#ff0000" emissive="#ff0000" />
      </mesh>

      {/* Headlights */}
      <mesh position={[-0.6, 0, 2.01]}>
        <boxGeometry args={[0.5, 0.3, 0.1]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={1} />
      </mesh>
      <mesh position={[0.6, 0, 2.01]}>
        <boxGeometry args={[0.5, 0.3, 0.1]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={1} />
      </mesh>

      {/* Tail lights */}
      <mesh position={[-0.6, 0, -2.01]}>
        <boxGeometry args={[0.5, 0.2, 0.1]} />
        <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[0.6, 0, -2.01]}>
        <boxGeometry args={[0.5, 0.2, 0.1]} />
        <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={0.5} />
      </mesh>
      
      {/* Wheels */}
      <mesh castShadow position={[-1.1, -0.4, 1.2]}>
        <boxGeometry args={[0.4, 0.6, 0.8]} />
        <meshStandardMaterial color="#111111" />
      </mesh>
      <mesh castShadow position={[1.1, -0.4, 1.2]}>
        <boxGeometry args={[0.4, 0.6, 0.8]} />
        <meshStandardMaterial color="#111111" />
      </mesh>
      <mesh castShadow position={[-1.1, -0.4, -1.2]}>
        <boxGeometry args={[0.4, 0.6, 0.8]} />
        <meshStandardMaterial color="#111111" />
      </mesh>
      <mesh castShadow position={[1.1, -0.4, -1.2]}>
        <boxGeometry args={[0.4, 0.6, 0.8]} />
        <meshStandardMaterial color="#111111" />
      </mesh>
    </group>
  );
};
