import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../store/useGameStore';

// Simple Arcade Drift Physics Constants
const ACCELERATION = 40;
const BRAKING = 50;
const MAX_SPEED = 60;
const TURN_SPEED = 3.5;
const FRICTION = 0.98; // General velocity decay
const LATERAL_FRICTION_NORMAL = 0.90; // Grippy
const LATERAL_FRICTION_DRIFT = 0.98; // Slippy (Drifting)

export const Car: React.FC = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  const addScore = useGameStore((state) => state.addScore);
  const setCarPosition = useGameStore((state) => state.setCarPosition);
  
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

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    
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
      velocity.current.sub(forward.clone().multiplyScalar(BRAKING * delta));
    }

    // Separate velocity into forward and lateral components
    const forwardSpeed = velocity.current.dot(forward);
    const lateralSpeed = velocity.current.dot(right);

    // Apply friction
    const lateralFriction = (isSpace || Math.abs(lateralSpeed) > 15) ? LATERAL_FRICTION_DRIFT : LATERAL_FRICTION_NORMAL;
    
    const forwardVec = forward.clone().multiplyScalar(forwardSpeed * FRICTION);
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
    }
    
    // Collision Detection with Buildings
    const { buildings, addExplosion } = useGameStore.getState();
    const cx = meshRef.current.position.x;
    const cz = meshRef.current.position.z;
    const gx = Math.round(cx / 10); // SPACING = 10 (4 + 6)
    const gz = Math.round(cz / 10);
    
    if (buildings.has(`${gx},${gz}`)) {
      const bx = gx * 10;
      const bz = gz * 10;
      // Simple AABB collision check (Car is roughly 4x4 for this check, Building is 4x4)
      if (Math.abs(cx - bx) < 3 && Math.abs(cz - bz) < 3) {
        // Collision happened!
        if (speed > 10) {
          addExplosion([cx, 2, cz]); // Trigger explosion
        }
        
        // Bounce back
        velocity.current.multiplyScalar(-0.5);
        meshRef.current.position.add(velocity.current.clone().multiplyScalar(delta * 2));
      }
    }

    // Update store position for camera follow
    setCarPosition([meshRef.current.position.x, meshRef.current.position.y, meshRef.current.position.z]);
  });

  return (
    <mesh ref={meshRef} castShadow receiveShadow position={[0, 0.5, 0]}>
      {/* Simple car shape (Rectangle) */}
      <boxGeometry args={[2, 1, 4]} />
      <meshStandardMaterial color="#ff3366" />
    </mesh>
  );
};
