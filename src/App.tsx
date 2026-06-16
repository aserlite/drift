import { Suspense, useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { GameScene } from './components/GameScene';
import { useGameStore } from './store/useGameStore';
import { MobileControls } from './components/MobileControls';
import './index.css';

import { mpManager } from './utils/multiplayer';

const MOCKING_QUOTES = [
  "Gros con t nul",
];

const MultiplayerPanel = () => {
  const gameMode = useGameStore((state) => state.gameMode);
  const setGameMode = useGameStore((state) => state.setGameMode);
  const peerId = useGameStore((state) => state.peerId);
  const connectedPeerId = useGameStore((state) => state.connectedPeerId);
  const [joinId, setJoinId] = useState("");
  const [expanded, setExpanded] = useState(false);

  const handleHost = () => {
    setGameMode('host');
    mpManager.initHost();
  };

  const handleJoin = () => {
    setGameMode('client');
    mpManager.joinGame(joinId);
  };

  const handleDisconnect = () => {
    mpManager.disconnect();
    setGameMode('single');
  };

  if (connectedPeerId) {
    return (
      <div style={{ pointerEvents: 'auto', zIndex: 100, position: 'absolute', bottom: 20, right: 20, background: 'rgba(0,0,0,0.8)', padding: '10px', borderRadius: '8px', color: '#00ff00', border: '1px solid #00ff00' }}>
        <p style={{ margin: 0 }}>P2P Connected!</p>
        <button onClick={handleDisconnect} style={{ marginTop: '10px', background: '#ff0055', padding: '5px 10px', fontSize: '12px' }}>Disconnect</button>
      </div>
    );
  }

  if (gameMode === 'host') {
    return (
      <div style={{ pointerEvents: 'auto', zIndex: 100, position: 'absolute', bottom: 20, right: 20, background: 'rgba(0,0,0,0.8)', padding: '15px', borderRadius: '8px', border: '1px solid #0055ff', width: '250px' }}>
        <h3 style={{ margin: '0 0 10px 0', color: '#0055ff' }}>Waiting for Cop...</h3>
        <p style={{ margin: '0 0 5px 0', fontSize: '12px' }}>Share this ID:</p>
        <div style={{ background: '#222', padding: '5px', marginBottom: '10px', userSelect: 'all', wordBreak: 'break-all', fontSize: '11px', color: '#fff' }}>
          {peerId || "Generating ID..."}
        </div>
        <button onClick={handleDisconnect} style={{ background: '#333', padding: '5px 10px', fontSize: '12px', width: '100%' }}>Cancel</button>
      </div>
    );
  }

  if (gameMode === 'client') {
    return (
      <div style={{ pointerEvents: 'auto', zIndex: 100, position: 'absolute', bottom: 20, right: 20, background: 'rgba(0,0,0,0.8)', padding: '15px', borderRadius: '8px', border: '1px solid #ff0055', width: '200px' }}>
        <h3 style={{ margin: '0 0 10px 0', color: '#ff0055' }}>Connecting...</h3>
        <button onClick={handleDisconnect} style={{ background: '#333', padding: '5px 10px', fontSize: '12px', width: '100%' }}>Cancel</button>
      </div>
    );
  }

  return (
    <div style={{ pointerEvents: 'auto', zIndex: 100, position: 'absolute', bottom: 20, right: 20, display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
      {expanded && (
        <div style={{ background: 'rgba(0,0,0,0.8)', padding: '15px', borderRadius: '8px', border: '1px solid #fff', width: '250px', marginBottom: '10px' }}>
          <h3 style={{ margin: '0 0 15px 0' }}>Multiplayer</h3>
          <button onClick={handleHost} style={{ padding: '8px', background: '#0055ff', width: '100%', marginBottom: '10px', fontSize: '14px' }}>Host Game (Drifter)</button>
          <div style={{ display: 'flex', gap: '5px' }}>
            <input 
              type="text" 
              placeholder="Enter Host ID..." 
              value={joinId} 
              onChange={(e) => setJoinId(e.target.value)}
              style={{ padding: '8px', flex: 1, borderRadius: '5px', border: 'none', fontSize: '12px' }}
            />
            <button onClick={handleJoin} style={{ background: '#ff0055', padding: '8px', fontSize: '14px' }}>Join</button>
          </div>
        </div>
      )}
      <button 
        onClick={() => setExpanded(!expanded)} 
        style={{ width: '50px', height: '50px', borderRadius: '25px', background: '#fff', color: '#000', fontSize: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', border: 'none', boxShadow: '0 4px 10px rgba(0,0,0,0.5)' }}
        title="Multiplayer"
      >
        🌐
      </button>
    </div>
  );
};

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

      <MobileControls />

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

      <MultiplayerPanel />
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
