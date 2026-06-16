import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../store/useGameStore';
import { emitSmoke } from '../utils/smokeSystem';

// Simple Arcade Drift Physics Constants
const ACCELERATION = 40;
const BRAKING = 60;
const REVERSE_ACCEL = 30;
const MAX_SPEED = 60;
const TURN_SPEED = 3.5;
const FRICTION = 0.98; // General velocity decay
const LATERAL_FRICTION_NORMAL = 0.90; // Grippy
const LATERAL_FRICTION_DRIFT = 0.98; // Slippy (Drifting)

export const Car: React.FC = () => {
  const meshRef = useRef<THREE.Group>(null);
  const addScore = useGameStore((state) => state.addScore);
  const setCarPosition = useGameStore((state) => state.setCarPosition);
  const gameOver = useGameStore((state) => state.gameOver);
  const setGameOver = useGameStore((state) => state.setGameOver);
  
  // Physics State
  const velocity = useRef(new THREE.Vector3());
  const heading = useRef(0); // Angle in radians
  
  // Input State
  const keys = useRef<{ [key: string]: boolean }>({});

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { keys.current[e.code] = true; };
    const handleKeyUp = (e: KeyboardEvent) => { keys.current[e.code] = false; };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  React.useEffect(() => {
    if (!gameOver && meshRef.current) {
      // Reset car when game is restarted
      meshRef.current.position.set(0, 0.5, 0);
      velocity.current.set(0, 0, 0);
      heading.current = 0;
    }
  }, [gameOver]);

  useFrame((_, delta) => {
    if (!meshRef.current || gameOver) return;
    
    const isAccelerating = keys.current['ArrowUp'] || keys.current['KeyW'];
    const isBraking = keys.current['ArrowDown'] || keys.current['KeyS'];
    const isTurningLeft = keys.current['ArrowLeft'] || keys.current['KeyA'];
    const isTurningRight = keys.current['ArrowRight'] || keys.current['KeyD'];
    const isSpace = keys.current['Space']; // Handbrake / Drift init

    const speed = velocity.current.length();
    const isMovingForward = velocity.current.dot(new THREE.Vector3(Math.sin(heading.current), 0, Math.cos(heading.current))) > 0;

    // Steering
    if (speed > 1) {
      const turnMultiplier = isMovingForward ? 1 : -1;
      if (isTurningLeft) heading.current += TURN_SPEED * delta * turnMultiplier;
      if (isTurningRight) heading.current -= TURN_SPEED * delta * turnMultiplier;
    }

    // Forward vector based on current heading
    const forward = new THREE.Vector3(Math.sin(heading.current), 0, Math.cos(heading.current));
    const right = new THREE.Vector3(forward.z, 0, -forward.x); // Right vector

    // Acceleration
    if (isAccelerating) {
      velocity.current.add(forward.clone().multiplyScalar(ACCELERATION * delta));
    }
    if (isBraking) {
      const forwardSpeed = velocity.current.dot(forward);
      if (forwardSpeed > 0.5) {
        // Strong brakes if moving forward
        velocity.current.sub(forward.clone().multiplyScalar(BRAKING * delta));
      } else {
        // Weak acceleration if in reverse
        velocity.current.sub(forward.clone().multiplyScalar(REVERSE_ACCEL * delta));
      }
    }

    // Separate velocity into forward and lateral components
    const forwardSpeedFinal = velocity.current.dot(forward);
    const lateralSpeed = velocity.current.dot(right);

    // Apply friction
    const lateralFriction = (isSpace || Math.abs(lateralSpeed) > 15) ? LATERAL_FRICTION_DRIFT : LATERAL_FRICTION_NORMAL;
    
    const forwardVec = forward.clone().multiplyScalar(forwardSpeedFinal * FRICTION);
    const lateralVec = right.clone().multiplyScalar(lateralSpeed * lateralFriction);
    
    velocity.current.copy(forwardVec.add(lateralVec));

    // Cap speed
    if (velocity.current.length() > MAX_SPEED) {
      velocity.current.normalize().multiplyScalar(MAX_SPEED);
    }

    // Update position
    meshRef.current.position.add(velocity.current.clone().multiplyScalar(delta));
    meshRef.current.rotation.y = heading.current;

    // Scoring: Score increases if lateral speed is high (drifting)
    if (Math.abs(lateralSpeed) > 10 && speed > 20) {
      addScore(Math.abs(lateralSpeed) * delta * 5); // Add score based on drift intensity
      emitSmoke(meshRef.current.position);
    }
    
    // Collision Detection with Buildings (Spatial Hash Point-vs-OBB)
    const { spatialHash, addExplosion } = useGameStore.getState();
    const cx = meshRef.current.position.x;
    const cz = meshRef.current.position.z;
    
    const chunkX = Math.floor(cx / 20);
    const chunkZ = Math.floor(cz / 20);
    
    let collided = false;

    // Check current chunk and 8 neighbors
    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        if (collided) break;
        const key = `${chunkX + i},${chunkZ + j}`;
        const buildings = spatialHash.get(key);
        if (buildings) {
          for (const b of buildings) {
            // Transform car center into building's local space
            const dx = cx - b.x;
            const dz = cz - b.z;
            const cos = Math.cos(-b.rot);
            const sin = Math.sin(-b.rot);
            const localX = dx * cos - dz * sin;
            const localZ = dx * sin + dz * cos;

            // OBB Collision check
            if (Math.abs(localX) < b.w && Math.abs(localZ) < b.d) {
              collided = true;
              break;
            }
          }
        }
      }
    }

    if (collided) {
      if (speed > 10) {
        addExplosion([cx, 2, cz]); // Trigger explosion
      }
      // Bounce back a little and trigger game over
      velocity.current.multiplyScalar(-0.5);
      meshRef.current.position.add(velocity.current.clone().multiplyScalar(delta * 2));
      setGameOver(true);
    }

    // Update store position for camera follow
    setCarPosition([meshRef.current.position.x, meshRef.current.position.y, meshRef.current.position.z], heading.current);
  });

  return (
    <group ref={meshRef} position={[0, 0.5, 0]}>
      {/* Car Body */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[2, 1, 4]} />
        <meshStandardMaterial color="#ff3366" />
      </mesh>
      
      {/* Windshield */}
      <mesh castShadow position={[0, 0.25, 0.8]}>
        <boxGeometry args={[1.8, 0.6, 1.2]} />
        <meshStandardMaterial color="#111111" />
      </mesh>

      {/* Headlights (Front Indicator) */}
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
