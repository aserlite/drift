import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { GameScene } from './components/GameScene';
import { useGameStore } from './store/useGameStore';
import './index.css';

const UI = () => {
  const score = useGameStore((state) => state.score);
  const highScore = useGameStore((state) => state.highScore);

  return (
    <div className="ui-container">
      <div className="score-box">
        <h2>Score</h2>
        <p>{Math.floor(score)}</p>
      </div>
      <div className="score-box" style={{ textAlign: 'right' }}>
        <h2>High Score</h2>
        <p style={{ color: '#00e5ff', textShadow: '0 0 20px rgba(0, 229, 255, 0.5)' }}>
          {Math.floor(highScore)}
        </p>
      </div>
      <div className="controls-hint">
        WASD / ARROWS to Drive • SPACE to Handbrake/Drift
      </div>
    </div>
  );
};

function App() {
  return (
    <>
      <UI />
      <Canvas shadows>
        <Suspense fallback={null}>
          <GameScene />
        </Suspense>
      </Canvas>
    </>
  );
}

export default App;
