/* eslint-disable react-hooks/immutability */
import React from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../store/useGameStore';

export const PipRenderer: React.FC = () => {
  const { gl, scene, camera, size } = useThree();

  useFrame(() => {
    // 1. Render main scene first
    gl.setViewport(0, 0, size.width, size.height);
    gl.setScissorTest(false);
    gl.render(scene, camera);

    // 2. Identify the alternative camera
    const { mainView } = useGameStore.getState();
    const altCameraName = mainView === 'isometric' ? 'tpsCam' : 'isoCam';
    const altCamera = scene.getObjectByName(altCameraName) as THREE.Camera;

    if (altCamera) {
      // 3. Render Picture-in-Picture (PiP)
      gl.autoClear = false;
      gl.clearDepth(); // Draw on top of main scene
      gl.setScissorTest(true);
      
      // Bottom left corner
      const pipWidth = Math.max(150, Math.min(size.width * 0.25, 300));
      const pipHeight = pipWidth * 0.6;
      const margin = 20;
      
      gl.setViewport(margin, margin, pipWidth, pipHeight);
      gl.setScissor(margin, margin, pipWidth, pipHeight);
      
      if (altCamera.type === 'PerspectiveCamera') {
        const pCam = altCamera as THREE.PerspectiveCamera;
        pCam.aspect = pipWidth / pipHeight;
        pCam.updateProjectionMatrix();
      }
      
      gl.render(scene, altCamera);
      
      // Restore for next frame
      gl.setScissorTest(false);
      gl.setViewport(0, 0, size.width, size.height);
    }
  }, 1); // priority 1 takes over the R3F render loop

  return null;
};
