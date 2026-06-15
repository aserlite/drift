import * as THREE from 'three';

export interface SmokeParticle {
  pos: THREE.Vector3;
  life: number;
  maxLife: number;
  scale: number;
}

export const particles: SmokeParticle[] = [];

export const emitSmoke = (position: THREE.Vector3) => {
  // Emit a few particles at once to make a puff
  for (let i = 0; i < 2; i++) {
    particles.push({
      pos: position.clone().add(new THREE.Vector3((Math.random()-0.5)*2, -0.3, (Math.random()-0.5)*2)),
      life: 1 + Math.random() * 0.5,
      maxLife: 1.5,
      scale: 0.5 + Math.random() * 0.5
    });
  }
};
