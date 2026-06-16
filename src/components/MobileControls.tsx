import React, { useRef, useState, useEffect } from 'react';
import { useGameStore } from '../store/useGameStore';

export const MobileControls: React.FC = () => {
  const setJoystick = useGameStore((state) => state.setJoystick);
  const setDrifting = useGameStore((state) => state.setDrifting);
  
  // Joystick state
  const [joystickActive, setJoystickActive] = useState(false);
  const [joystickBase, setJoystickBase] = useState({ x: 0, y: 0 });
  const [joystickNub, setJoystickNub] = useState({ x: 0, y: 0 });
  const touchIdRef = useRef<number | null>(null);
  
  // Drift state
  const [isDriftingVisual, setIsDriftingVisual] = useState(false);
  const driftTouchIdRef = useRef<number | null>(null);

  const maxRadius = 50;

  useEffect(() => {
    const preventDefault = (e: TouchEvent) => {
      if (e.target instanceof Element && e.target.classList.contains('mobile-controls-layer')) {
        e.preventDefault();
      }
    };
    document.addEventListener('touchmove', preventDefault, { passive: false });
    return () => document.removeEventListener('touchmove', preventDefault);
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.clientX < window.innerWidth / 2) {
        if (touchIdRef.current === null) {
          touchIdRef.current = touch.identifier;
          setJoystickBase({ x: touch.clientX, y: touch.clientY });
          setJoystickNub({ x: touch.clientX, y: touch.clientY });
          setJoystickActive(true);
        }
      } else {
        if (driftTouchIdRef.current === null) {
          driftTouchIdRef.current = touch.identifier;
          setDrifting(true);
          setIsDriftingVisual(true);
        }
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === touchIdRef.current) {
        const dx = touch.clientX - joystickBase.x;
        const dy = touch.clientY - joystickBase.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        let nubX = touch.clientX;
        let nubY = touch.clientY;
        
        if (distance > maxRadius) {
          const angle = Math.atan2(dy, dx);
          nubX = joystickBase.x + Math.cos(angle) * maxRadius;
          nubY = joystickBase.y + Math.sin(angle) * maxRadius;
        }
        
        setJoystickNub({ x: nubX, y: nubY });
        
        const normX = (nubX - joystickBase.x) / maxRadius;
        const normY = (nubY - joystickBase.y) / maxRadius;
        setJoystick(normX, normY);
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === touchIdRef.current) {
        touchIdRef.current = null;
        setJoystickActive(false);
        setJoystick(0, 0);
      }
      if (touch.identifier === driftTouchIdRef.current) {
        driftTouchIdRef.current = null;
        setDrifting(false);
        setIsDriftingVisual(false);
      }
    }
  };

  return (
    <div 
      className="mobile-controls-layer"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 50,
        pointerEvents: 'auto',
        touchAction: 'none'
      }}
    >
      {/* Visual Joystick */}
      {joystickActive && (
        <div style={{
          position: 'absolute',
          left: joystickBase.x - 60,
          top: joystickBase.y - 60,
          width: 120,
          height: 120,
          borderRadius: '50%',
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          border: '2px solid rgba(255, 255, 255, 0.3)',
          pointerEvents: 'none'
        }}>
          <div style={{
            position: 'absolute',
            left: 60 - 25 + (joystickNub.x - joystickBase.x),
            top: 60 - 25 + (joystickNub.y - joystickBase.y),
            width: 50,
            height: 50,
            borderRadius: '50%',
            backgroundColor: 'rgba(255, 255, 255, 0.5)',
            boxShadow: '0 0 10px rgba(0,0,0,0.5)',
            pointerEvents: 'none'
          }} />
        </div>
      )}

      {/* Visual Drift Button */}
      <div className="mobile-drift-btn" style={{
        position: 'absolute',
        right: '10%',
        bottom: '20%',
        width: 80,
        height: 80,
        borderRadius: '50%',
        backgroundColor: isDriftingVisual ? 'rgba(255, 51, 102, 0.6)' : 'rgba(255, 255, 255, 0.1)',
        border: '2px solid rgba(255, 255, 255, 0.3)',
        pointerEvents: 'none',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        color: 'rgba(255, 255, 255, 0.5)',
        fontWeight: 'bold',
        fontSize: '12px'
      }}>
        DRIFT
      </div>
    </div>
  );
};
