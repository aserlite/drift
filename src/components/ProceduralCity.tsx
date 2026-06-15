/* eslint-disable react-hooks/purity */
import React, { useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';
import { useGameStore } from '../store/useGameStore';
import type { BuildingData } from '../store/useGameStore';

const SECTOR_SIZE = 50;
const ROAD_WIDTH = 12;
const BLOCK_SIZE = SECTOR_SIZE - ROAD_WIDTH; // 38
const GRID_EXTENT = 15; // Renders from -15 to 15 sectors (30x30 total sectors)

export const ProceduralCity: React.FC = () => {
  const setBuildings = useGameStore((state) => state.setBuildings);

  const { matrices, colors, buildingData, roadMatrices, lineMatrices } = useMemo(() => {
    const noise2D = createNoise2D();
    const tempObject = new THREE.Object3D();
    const tempColor = new THREE.Color();
    
    const matrices: THREE.Matrix4[] = [];
    const colors: Float32Array[] = [];
    const buildingData: BuildingData[] = [];
    
    const roadMatrices: THREE.Matrix4[] = [];
    const lineMatrices: THREE.Matrix4[] = [];

    for (let sx = -GRID_EXTENT; sx <= GRID_EXTENT; sx++) {
      for (let sz = -GRID_EXTENT; sz <= GRID_EXTENT; sz++) {
        
        // Staggered grid (Brick Pattern)
        const offset = Math.abs(sz) % 2 === 1 ? SECTOR_SIZE / 2 : 0;
        const bx = sx * SECTOR_SIZE + offset;
        const bz = sz * SECTOR_SIZE;

        // Generate Roads for this sector
        // Vertical Road (right side of the block)
        if (sx < GRID_EXTENT) {
          tempObject.position.set(bx + SECTOR_SIZE / 2, 0.05, bz);
          tempObject.scale.set(ROAD_WIDTH, 0.1, SECTOR_SIZE);
          tempObject.rotation.set(0, 0, 0);
          tempObject.updateMatrix();
          roadMatrices.push(tempObject.matrix.clone());

          // Vertical dashed lines
          for (let i = -SECTOR_SIZE / 2; i < SECTOR_SIZE / 2; i += 8) {
            // Stop before intersecting the horizontal road
            if (i + 2 > SECTOR_SIZE / 2 - ROAD_WIDTH) continue;
            
            tempObject.position.set(bx + SECTOR_SIZE / 2, 0.11, bz + i + 2);
            tempObject.scale.set(0.4, 0.1, 4);
            tempObject.updateMatrix();
            lineMatrices.push(tempObject.matrix.clone());
          }
        }

        // Horizontal Road (bottom side of the block)
        if (sz < GRID_EXTENT) {
          tempObject.position.set(bx, 0.05, bz + SECTOR_SIZE / 2);
          tempObject.scale.set(SECTOR_SIZE, 0.1, ROAD_WIDTH);
          tempObject.rotation.set(0, 0, 0);
          tempObject.updateMatrix();
          roadMatrices.push(tempObject.matrix.clone());

          // Horizontal dashed lines
          for (let i = -SECTOR_SIZE / 2; i < SECTOR_SIZE / 2; i += 8) {
            tempObject.position.set(bx + i + 2, 0.11, bz + SECTOR_SIZE / 2);
            tempObject.scale.set(4, 0.1, 0.4);
            tempObject.updateMatrix();
            lineMatrices.push(tempObject.matrix.clone());
          }
        }

        // Generate City Block interior using Perlin Noise
        const noiseVal = noise2D(sx * 0.15, sz * 0.15); // Value between -1 and 1
        
        // Block logic: Subdivide the block into a local grid to prevent overlapping buildings
        // Dense areas get a 3x3 grid (up to 9 small buildings). Suburbs get a 2x2 grid (up to 4 large buildings).
        const isDense = noiseVal > 0;
        const subDivisions = isDense ? 3 : 2;
        const innerArea = BLOCK_SIZE - 6; // Leave a margin so buildings don't spill onto roads
        const cellSize = innerArea / subDivisions;
        
        const baseHeight = 4 + (noiseVal + 1) * 10; // Height from 4 to ~24
        
        for (let r = 0; r < subDivisions; r++) {
          for (let c = 0; c < subDivisions; c++) {
            // Randomly skip a few cells in dense blocks to create organic small courtyards
            if (subDivisions === 3 && Math.random() < 0.2) continue;

            const localX = -innerArea / 2 + cellSize / 2 + c * cellSize;
            const localZ = -innerArea / 2 + cellSize / 2 + r * cellSize;
            
            // Jitter position slightly within the local cell
            const jitter = cellSize * 0.15;
            const px = bx + localX + (Math.random() - 0.5) * jitter;
            const pz = bz + localZ + (Math.random() - 0.5) * jitter;
            
            // Keep clear of the absolute center [0,0] for the initial spawn
            if (Math.abs(px) < 15 && Math.abs(pz) < 15) continue;

            // Dimensions: strictly fit inside the cell to prevent overlap
            const maxBuildingSize = cellSize * 0.8;
            const width = 3 + Math.random() * (maxBuildingSize - 3);
            const depth = 3 + Math.random() * (maxBuildingSize - 3);
            const height = baseHeight * (0.6 + Math.random() * 0.8);
            
            // Mix of aligned and chaotic rotations
            // 70% chance to be snapped to 90-degree angles, 30% chance for random chaos
            const rot = Math.random() > 0.3 ? (Math.floor(Math.random() * 4) * Math.PI / 2) : (Math.random() * Math.PI);
            
            tempObject.position.set(px, height / 2, pz);
            tempObject.scale.set(width, height, depth);
            tempObject.rotation.set(0, rot, 0);
            tempObject.updateMatrix();
            
            matrices.push(tempObject.matrix.clone());

            buildingData.push({
              x: px,
              z: pz,
              w: (width / 2) + 1,
              d: (depth / 2) + 2,
              rot: rot
            });

            // Cyberpunk Color Palette: higher buildings get more vibrant colors
            const hue = 0.55 + Math.random() * 0.15; // Blues and Purples
            const lightness = Math.min(0.8, 0.1 + (height / 60)); // Taller = brighter
            tempColor.setHSL(hue, 0.8, lightness);
            
            const colorArray = new Float32Array(3);
            tempColor.toArray(colorArray);
            colors.push(colorArray);
          }
        }
      }
    }

    const flatColors = new Float32Array(colors.length * 3);
    colors.forEach((c, i) => flatColors.set(c, i * 3));

    return { matrices, colors: flatColors, buildingData, roadMatrices, lineMatrices };
  }, []);

  useEffect(() => {
    setBuildings(buildingData);
  }, [buildingData, setBuildings]);

  const meshRef = React.useRef<THREE.InstancedMesh>(null);
  const roadRef = React.useRef<THREE.InstancedMesh>(null);
  const lineRef = React.useRef<THREE.InstancedMesh>(null);

  React.useLayoutEffect(() => {
    if (meshRef.current) {
      matrices.forEach((matrix, i) => meshRef.current!.setMatrixAt(i, matrix));
      meshRef.current.instanceMatrix.needsUpdate = true;
    }
    if (roadRef.current) {
      roadMatrices.forEach((matrix, i) => roadRef.current!.setMatrixAt(i, matrix));
      roadRef.current.instanceMatrix.needsUpdate = true;
    }
    if (lineRef.current) {
      lineMatrices.forEach((matrix, i) => lineRef.current!.setMatrixAt(i, matrix));
      lineRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [matrices, roadMatrices, lineMatrices]);

  return (
    <group>
      {/* Base Ground Plane (Dark Dirt/Foundation) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[2000, 2000]} />
        <meshStandardMaterial color="#0f0f13" roughness={1} />
      </mesh>

      {/* Roads Asphalt */}
      {roadMatrices.length > 0 && (
        <instancedMesh ref={roadRef} args={[undefined, undefined, roadMatrices.length]} receiveShadow>
          <boxGeometry />
          <meshStandardMaterial color="#1a1a1c" roughness={0.9} />
        </instancedMesh>
      )}

      {/* Roads Dashed Lines */}
      {lineMatrices.length > 0 && (
        <instancedMesh ref={lineRef} args={[undefined, undefined, lineMatrices.length]} receiveShadow>
          <boxGeometry />
          <meshStandardMaterial color="#ffffff" roughness={0.5} emissive="#ffffff" emissiveIntensity={0.2} />
        </instancedMesh>
      )}

      {/* Organic Buildings */}
      {matrices.length > 0 && (
        <instancedMesh
          ref={meshRef}
          args={[undefined, undefined, matrices.length]}
          castShadow
          receiveShadow
        >
          <boxGeometry>
            <instancedBufferAttribute attach="attributes-color" args={[colors, 3]} />
          </boxGeometry>
          <meshStandardMaterial vertexColors roughness={0.7} metalness={0.2} />
        </instancedMesh>
      )}
    </group>
  );
};
