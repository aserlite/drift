import React, { useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { useGameStore } from '../store/useGameStore';

const GRID_SIZE = 50;
const BUILDING_SIZE = 4;
const ROAD_WIDTH = 6;
export const SPACING = BUILDING_SIZE + ROAD_WIDTH;

export const ProceduralCity: React.FC = () => {
  const setBuildings = useGameStore((state) => state.setBuildings);

  // Use useMemo to generate the city matrix only once
  const { matrices, colors, buildingSet } = useMemo(() => {
    const tempObject = new THREE.Object3D();
    const tempColor = new THREE.Color();
    const matrices = [];
    const colors = [];
    const buildingSet = new Set<string>();

    // Simple procedural generation based on grid coordinates
    for (let x = -GRID_SIZE; x < GRID_SIZE; x++) {
      for (let z = -GRID_SIZE; z < GRID_SIZE; z++) {
        // Create some empty spaces for roads/parks
        // We leave gaps every 3 buildings or randomly
        if (Math.abs(x % 4) === 0 || Math.abs(z % 4) === 0) continue;
        if (Math.random() > 0.8) continue;

        const height = 2 + Math.random() * 15; // Random building height
        
        // Position
        tempObject.position.set(x * SPACING, height / 2, z * SPACING);
        
        // Scale
        tempObject.scale.set(BUILDING_SIZE, height, BUILDING_SIZE);
        
        tempObject.updateMatrix();
        matrices.push(tempObject.matrix.clone());

        // Color based on height and randomness
        const hue = 0.6 + Math.random() * 0.1; // Blues/purples
        const lightness = 0.2 + (height / 20) * 0.5;
        tempColor.setHSL(hue, 0.5, lightness);
        
        const colorArray = new Float32Array(3);
        tempColor.toArray(colorArray);
        colors.push(colorArray);

        // Save building coordinate for collision
        buildingSet.add(`${x},${z}`);
      }
    }

    // Flatten color arrays
    const flatColors = new Float32Array(colors.length * 3);
    colors.forEach((c, i) => flatColors.set(c, i * 3));

    return { matrices, colors: flatColors, buildingSet };
  }, []);

  useEffect(() => {
    setBuildings(buildingSet);
  }, [buildingSet, setBuildings]);

  const meshRef = React.useRef<THREE.InstancedMesh>(null);

  React.useLayoutEffect(() => {
    if (meshRef.current) {
      matrices.forEach((matrix, i) => {
        meshRef.current!.setMatrixAt(i, matrix);
      });
      meshRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [matrices]);

  return (
    <group>
      {/* Ground Plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[1000, 1000]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>

      {/* Buildings Instanced Mesh */}
      <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, matrices.length]}
        castShadow
        receiveShadow
      >
        <boxGeometry>
          <instancedBufferAttribute attach="attributes-color" args={[colors, 3]} />
        </boxGeometry>
        <meshStandardMaterial vertexColors roughness={0.8} />
      </instancedMesh>
    </group>
  );
};
