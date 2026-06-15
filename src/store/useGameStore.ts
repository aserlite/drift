import { create } from 'zustand';

interface GameState {
  score: number;
  highScore: number;
  gameOver: boolean;
  carPosition: [number, number, number];
  buildings: Set<string>;
  explosions: { id: number, position: [number, number, number], time: number }[];
  addScore: (points: number) => void;
  resetScore: () => void;
  setGameOver: (isOver: boolean) => void;
  setCarPosition: (pos: [number, number, number]) => void;
  setBuildings: (buildings: Set<string>) => void;
  addExplosion: (pos: [number, number, number]) => void;
  removeExplosion: (id: number) => void;
}

const getStoredHighScore = () => {
  const stored = localStorage.getItem('drift_highscore');
  return stored ? parseInt(stored, 10) : 0;
};

export const useGameStore = create<GameState>((set) => ({
  score: 0,
  highScore: getStoredHighScore(),
  gameOver: false,
  carPosition: [0, 0, 0],
  buildings: new Set(),
  explosions: [],
  addScore: (points) => set((state) => {
    const newScore = state.score + points;
    let newHighScore = state.highScore;
    
    if (newScore > state.highScore) {
      newHighScore = Math.floor(newScore);
      localStorage.setItem('drift_highscore', newHighScore.toString());
    }
    
    return { score: newScore, highScore: newHighScore };
  }),
  resetScore: () => set({ score: 0 }),
  setGameOver: (isOver) => set({ gameOver: isOver }),
  setCarPosition: (pos) => set({ carPosition: pos }),
  setBuildings: (buildings) => set({ buildings }),
  addExplosion: (pos) => set((state) => ({ 
    explosions: [...state.explosions, { id: Date.now(), position: pos, time: Date.now() }] 
  })),
  removeExplosion: (id) => set((state) => ({
    explosions: state.explosions.filter(e => e.id !== id)
  })),
}));
