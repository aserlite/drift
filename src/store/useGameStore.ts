import { create } from 'zustand';

export interface BuildingData {
  x: number;
  z: number;
  w: number;
  d: number;
  rot: number;
}

interface GameState {
  score: number;
  highScore: number;
  gameOver: boolean;
  mainView: 'isometric' | 'tps';
  timeToNextCop: number;
  carPosition: [number, number, number];
  carHeading: number;
  buildings: BuildingData[];
  spatialHash: Map<string, BuildingData[]>;
  explosions: { id: number, position: [number, number, number], time: number }[];
  // Multiplayer State
  gameMode: 'single' | 'host' | 'client';
  peerId: string;
  connectedPeerId: string;
  networkCarPos: [number, number, number];
  networkCarHeading: number;
  networkCopPos: [number, number, number];
  networkCopHeading: number;

  addScore: (points: number) => void;
  resetScore: () => void;
  setGameOver: (isOver: boolean) => void;
  setMainView: (view: 'isometric' | 'tps') => void;
  setCarPosition: (pos: [number, number, number], heading: number) => void;
  setBuildings: (buildings: BuildingData[]) => void;
  addExplosion: (pos: [number, number, number]) => void;
  removeExplosion: (id: number) => void;
  setTimeToNextCop: (time: number) => void;
  
  // Multiplayer Actions
  setGameMode: (mode: 'single' | 'host' | 'client') => void;
  setPeerId: (id: string) => void;
  setConnectedPeerId: (id: string) => void;
  setNetworkCar: (pos: [number, number, number], heading: number) => void;
  setNetworkCop: (pos: [number, number, number], heading: number) => void;
}

const getStoredHighScore = () => {
  const stored = localStorage.getItem('drift_highscore');
  return stored ? parseInt(stored, 10) : 0;
};

export const useGameStore = create<GameState>((set) => ({
  score: 0,
  highScore: getStoredHighScore(),
  mainView: 'isometric',
  timeToNextCop: 15,
  gameOver: false,
  carPosition: [0, 0, 0],
  carHeading: 0,
  buildings: [],
  spatialHash: new Map(),
  explosions: [],
  gameMode: 'single',
  peerId: '',
  connectedPeerId: '',
  networkCarPos: [0, 0, 0],
  networkCarHeading: 0,
  networkCopPos: [0, 0, 0],
  networkCopHeading: 0,

  addScore: (points) => set((state) => {
    const newScore = state.score + points;
    let newHighScore = state.highScore;
    
    if (newScore > state.highScore) {
      newHighScore = Math.floor(newScore);
      localStorage.setItem('drift_highscore', newHighScore.toString());
    }
    
    return { score: newScore, highScore: newHighScore };
  }),
  resetScore: () => set({ score: 0, timeToNextCop: 15 }),
  setGameOver: (isOver) => set({ gameOver: isOver }),
  setMainView: (view) => set({ mainView: view }),
  setTimeToNextCop: (time) => set({ timeToNextCop: time }),
  setCarPosition: (pos, heading) => set({ carPosition: pos, carHeading: heading }),
  setBuildings: (buildings) => {
    const spatialHash = new Map<string, BuildingData[]>();
    buildings.forEach(b => {
      const cx = Math.floor(b.x / 20);
      const cz = Math.floor(b.z / 20);
      const key = `${cx},${cz}`;
      if (!spatialHash.has(key)) spatialHash.set(key, []);
      spatialHash.get(key)!.push(b);
    });
    set({ buildings, spatialHash });
  },
  addExplosion: (pos) => set((state) => ({ 
    explosions: [...state.explosions, { id: Date.now(), position: pos, time: Date.now() }] 
  })),
  removeExplosion: (id) => set((state) => ({
    explosions: state.explosions.filter(e => e.id !== id)
  })),
  setGameMode: (mode) => set({ gameMode: mode }),
  setPeerId: (id) => set({ peerId: id }),
  setConnectedPeerId: (id) => set({ connectedPeerId: id }),
  setNetworkCar: (pos, heading) => set({ networkCarPos: pos, networkCarHeading: heading }),
  setNetworkCop: (pos, heading) => set({ networkCopPos: pos, networkCopHeading: heading }),
}));
