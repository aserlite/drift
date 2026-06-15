import { Suspense, useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { GameScene } from './components/GameScene';
import { useGameStore } from './store/useGameStore';
import './index.css';

const MOCKING_QUOTES = [
  "Gros con t nul",
];

const UI = () => {
  const score = useGameStore((state) => state.score);
  const highScore = useGameStore((state) => state.highScore);
  const timeToNextCop = useGameStore((state) => state.timeToNextCop);
  const mainView = useGameStore((state) => state.mainView);
  const gameOver = useGameStore((state) => state.gameOver);
  const setGameOver = useGameStore((state) => state.setGameOver);
  const setMainView = useGameStore((state) => state.setMainView);
  const resetScore = useGameStore((state) => state.resetScore);

  const [quote, setQuote] = useState("");

  useEffect(() => {
    if (gameOver) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setQuote(MOCKING_QUOTES[Math.floor(Math.random() * MOCKING_QUOTES.length)]);
    }
  }, [gameOver]);

  const handleRestart = () => {
    resetScore();
    setGameOver(false);
  };

  const toggleView = () => {
    setMainView(mainView === 'isometric' ? 'tps' : 'isometric');
  };

  return (
    <div className="ui-container">
      <div className="score-box">
        <h2>Score</h2>
        <p>{Math.floor(score)}</p>
      </div>
      <div className="score-box" style={{ textAlign: 'right' }}>
        <h2>High Score</h2>
        <p style={{ color: '#00e5ff' }}>
          {Math.floor(highScore)}
        </p>
      </div>
      <div className="score-box" style={{ position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)', textAlign: 'center', borderColor: '#ff0055', fontSize: '16px' }}>
        <h2 style={{ color: '#ff0055' }}>Next Police Car In</h2>
        <p style={{ color: '#ff0055' }}>{timeToNextCop}s</p>
      </div>
      <div className="controls-hint">
        WASD / ARROWS to Drive • SPACE to Handbrake/Drift
      </div>
      
      <div className="pip-overlay" onClick={toggleView}>
        <button className="pip-switch-btn">Switch View</button>
      </div>

      {gameOver && (
        <div className="game-over-overlay">
          <div className="game-over-box goofy">
            <h1>CRASHED!</h1>
            <p className="mocking-text">"{quote}"</p>
            <p className="score-text">Score: {Math.floor(score)}</p>
            <button onClick={handleRestart}>Restart</button>
          </div>
        </div>
      )}
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
