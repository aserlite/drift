/* eslint-disable react-hooks/purity */
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../store/useGameStore';
import { emitSmoke } from '../utils/smokeSystem';
import { mpManager } from '../utils/multiplayer';

// Cop AI Physics Constants (Same as Car when in Multiplayer)
const ACCELERATION = 40; 
const BRAKING = 60;
const REVERSE_ACCEL = 30;
const MAX_SPEED = 60; 
const TURN_SPEED = 3.5; 
const FRICTION = 0.98;
const LATERAL_FRICTION_NORMAL = 0.90;
const LATERAL_FRICTION_DRIFT = 0.98;

export const globalCops = new Map<number, { meshRef: React.RefObject<THREE.Group | null>, velocity: React.MutableRefObject<THREE.Vector3> }>();

interface CopProps {
  id: number;
  initialPosition: [number, number, number];
}

export const Cop: React.FC<CopProps> = ({ id, initialPosition }) => {
  const meshRef = useRef<THREE.Group>(null);
  const gameOver = useGameStore((state) => state.gameOver);
  const setGameOver = useGameStore((state) => state.setGameOver);
  
  const velocity = useRef(new THREE.Vector3());
  const heading = useRef(0);
  const stuckTimer = useRef(0);
  
  // Anti-stuck tracking
  const lastPos = useRef(new THREE.Vector3().fromArray(initialPosition));
  const realStuckTimer = useRef(0);
  const positionCheckTimer = useRef(0);
  
  // To avoid flashing lights being synced across all cops, add random offset
  const lightOffset = useMemo(() => Math.random() * Math.PI, []);

  // Material refs for sirens
  const blueSirenRef = useRef<THREE.MeshStandardMaterial>(null);
  const redSirenRef = useRef<THREE.MeshStandardMaterial>(null);

  React.useEffect(() => {
    globalCops.set(id, { meshRef, velocity });
    return () => {
      globalCops.delete(id);
    };
  }, [id]);

  const chaseTimer = useRef(0);

  // Input State (for Client mode)
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

  useFrame((state, delta) => {
    if (!meshRef.current || gameOver) return;
    
    const { carPosition, carHeading, spatialHash, gameMode, networkCopPos, networkCopHeading } = useGameStore.getState();

    // If Host, update cop position from network and exit early
    if (gameMode === 'host') {
      meshRef.current.position.set(networkCopPos[0], networkCopPos[1], networkCopPos[2]);
      meshRef.current.rotation.y = networkCopHeading;
      return;
    }

    // Anti-stuck teleport logic (Only in Singleplayer)
    if (gameMode === 'single') {
      positionCheckTimer.current += delta;
      if (positionCheckTimer.current >= 0.5) {
        const distMoved = lastPos.current.distanceTo(meshRef.current.position);
        if (distMoved < 2.0) { // Moved less than 2 units in 0.5s
          realStuckTimer.current += 0.5;
        } else {
          realStuckTimer.current = 0;
        }
        lastPos.current.copy(meshRef.current.position);
        positionCheckTimer.current = 0;
      }

      if (realStuckTimer.current >= 1.0) {
        const offsetDistance = 20 + Math.random() * 10;
        const offsetX = -Math.sin(carHeading) * offsetDistance;
        const offsetZ = -Math.cos(carHeading) * offsetDistance;
        
        meshRef.current.position.set(carPosition[0] + offsetX, 1, carPosition[2] + offsetZ);
        heading.current = carHeading;
        velocity.current.set(0, 0, 0);
        realStuckTimer.current = 0;
        stuckTimer.current = 0;
        
        meshRef.current.position.x += (Math.random() - 0.5) * 10;
        meshRef.current.position.z += (Math.random() - 0.5) * 10;
        return; 
      }
    }

    // Siren blinking effect
    if (blueSirenRef.current && redSirenRef.current) {
      const time = state.clock.elapsedTime * 10 + lightOffset;
      blueSirenRef.current.emissiveIntensity = Math.sin(time) > 0 ? 5 : 0;
      redSirenRef.current.emissiveIntensity = Math.sin(time) <= 0 ? 5 : 0;
    }

    const cx = meshRef.current.position.x;
    const cz = meshRef.current.position.z;
    
    // In client mode, 'carPosition' in the store is hijacked to make the camera follow the cop.
    // So the actual drifter is at networkCarPos.
    const { networkCarPos } = useGameStore.getState();
    const playerX = gameMode === 'client' ? networkCarPos[0] : carPosition[0];
    const playerZ = gameMode === 'client' ? networkCarPos[2] : carPosition[2];

    // Distance to player
    const distToPlayer = Math.hypot(playerX - cx, playerZ - cz);

    // Collision with Player!
    if (distToPlayer < 3.5) {
      useGameStore.getState().addExplosion([cx, 2, cz]);
      useGameStore.getState().addExplosion([playerX, 2, playerZ]);
      setGameOver(true);
      if (gameMode === 'client') mpManager.sendGameOver();
      return;
    }

    chaseTimer.current += delta;
    // In multiplayer, no crazy boosts, keep it fair
    const isMultiplayer = gameMode !== 'single';
    const currentAcceleration = (!isMultiplayer && chaseTimer.current >= 60) ? ACCELERATION * 1.5 : ACCELERATION;
    const currentMaxSpeed = (!isMultiplayer && chaseTimer.current >= 60) ? MAX_SPEED * 1.3 : MAX_SPEED;

    // Cop vs Cop collision (Only in singleplayer really, but harmless otherwise)
    globalCops.forEach((otherCop, otherId) => {
      if (otherId === id) return;
      if (!otherCop.meshRef.current) return;
      
      const otherPos = otherCop.meshRef.current.position;
      const dist = meshRef.current!.position.distanceTo(otherPos);
      if (dist < 4.5) { 
        // Push apart gently
        const pushDir = meshRef.current!.position.clone().sub(otherPos).normalize();
        velocity.current.add(pushDir.multiplyScalar(currentAcceleration * delta * 2));
      }
    });

    const speed = velocity.current.length();
    const isMovingForward = velocity.current.dot(new THREE.Vector3(Math.sin(heading.current), 0, Math.cos(heading.current))) > 0;
    const forward = new THREE.Vector3(Math.sin(heading.current), 0, Math.cos(heading.current));
    const right = new THREE.Vector3(forward.z, 0, -forward.x);
    let isSpace = false;

    if (gameMode === 'client') {
      // Manual Control Logic for Player 2
      const isAccelerating = keys.current['ArrowUp'] || keys.current['KeyW'];
      const isBraking = keys.current['ArrowDown'] || keys.current['KeyS'];
      const isTurningLeft = keys.current['ArrowLeft'] || keys.current['KeyA'];
      const isTurningRight = keys.current['ArrowRight'] || keys.current['KeyD'];
      isSpace = keys.current['Space'];

      if (speed > 1) {
        const turnMultiplier = isMovingForward ? 1 : -1;
        if (isTurningLeft) heading.current += TURN_SPEED * delta * turnMultiplier;
        if (isTurningRight) heading.current -= TURN_SPEED * delta * turnMultiplier;
      }

      if (isAccelerating) {
        velocity.current.add(forward.clone().multiplyScalar(currentAcceleration * delta));
      }
      if (isBraking) {
        const forwardSpeed = velocity.current.dot(forward);
        if (forwardSpeed > 0.5) {
          velocity.current.sub(forward.clone().multiplyScalar(BRAKING * delta));
        } else {
          velocity.current.sub(forward.clone().multiplyScalar(REVERSE_ACCEL * delta));
        }
      }
    } else {
      // AI Logic for Singleplayer
      const angleToPlayer = Math.atan2(playerX - cx, playerZ - cz);
      
      let diff = angleToPlayer - heading.current;
      while (diff <= -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;

      const isTurningLeft = diff > 0.1;
      const isTurningRight = diff < -0.1;
      
      const isAccelerating = distToPlayer > 5;
      isSpace = Math.abs(diff) > 1.0; 

      if (stuckTimer.current > 0) {
        stuckTimer.current -= delta;
        velocity.current.add(forward.clone().multiplyScalar(-currentAcceleration * delta));
      } else {
        if (speed > 1) {
          const turnMultiplier = isMovingForward ? 1 : -1;
          if (isTurningLeft) heading.current += TURN_SPEED * delta * turnMultiplier;
          if (isTurningRight) heading.current -= TURN_SPEED * delta * turnMultiplier;
        }

        if (isAccelerating) {
          velocity.current.add(forward.clone().multiplyScalar(currentAcceleration * delta));
        }
      }
    }

    // Friction & Drift
    const forwardSpeed = velocity.current.dot(forward);
    const lateralSpeed = velocity.current.dot(right);
    const lateralFriction = (isSpace || Math.abs(lateralSpeed) > 15) ? LATERAL_FRICTION_DRIFT : LATERAL_FRICTION_NORMAL;
    
    const forwardVec = forward.clone().multiplyScalar(forwardSpeed * FRICTION);
    const lateralVec = right.clone().multiplyScalar(lateralSpeed * lateralFriction);
    
    velocity.current.copy(forwardVec.add(lateralVec));

    if (velocity.current.length() > currentMaxSpeed) {
      velocity.current.normalize().multiplyScalar(currentMaxSpeed);
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

    if (collided && gameMode === 'single') {
      // Cops bounce back
      velocity.current.multiplyScalar(-0.5);
      meshRef.current.position.add(velocity.current.clone().multiplyScalar(delta * 2));
      stuckTimer.current = 1.0; // Reverse for 1 second to unstuck
    } else if (collided && gameMode === 'client') {
      // Manual cop bounce
      velocity.current.multiplyScalar(-0.5);
      meshRef.current.position.add(velocity.current.clone().multiplyScalar(delta * 2));
    }

    if (gameMode === 'client') {
      // Set the camera to follow the cop if you are the client!
      useGameStore.getState().setCarPosition(
        [meshRef.current.position.x, meshRef.current.position.y, meshRef.current.position.z],
        heading.current
      );
      mpManager.sendCopPos([meshRef.current.position.x, meshRef.current.position.y, meshRef.current.position.z], heading.current);
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
