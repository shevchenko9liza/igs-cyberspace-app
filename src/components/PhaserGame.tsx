'use client';

import { useEffect, useRef } from 'react';
import { useGameStore } from '@/store/useGameStore';

export default function PhaserGame() {
  const gameRef = useRef<HTMLDivElement>(null);
  const coins = useGameStore((state) => state.coins);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let game: any;
    let unmounted = false;

    const init = async () => {
      if (typeof window === 'undefined' || !gameRef.current) return;
      const Phaser = await import('phaser');
      const { MainScene } = await import('@/game/MainScene');
      if (unmounted) return;

      game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: gameRef.current,
        width: 800,
        height: 600,
        backgroundColor: '#0a0a12',
        scene: MainScene,
        scale: {
          mode: Phaser.Scale.FIT,
          autoCenter: Phaser.Scale.CENTER_BOTH,
        },
        transparent: false,
      });
    };

    init();
    return () => {
      unmounted = true;
      game?.destroy(true);
    };
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '60vh', overflow: 'hidden', background: '#0a0a12' }}>
      <div ref={gameRef} style={{ width: '100%', height: '100%' }} />
      <div style={{
        position: 'absolute', top: 12, left: 12, zIndex: 10,
        background: 'rgba(0,0,0,0.65)', color: '#facc15',
        padding: '6px 14px', borderRadius: 12,
        border: '1px solid rgba(250,204,21,0.4)',
        backdropFilter: 'blur(6px)',
        fontSize: 18, fontWeight: 800, letterSpacing: 1,
      }}>
        🪙 {coins}
      </div>
    </div>
  );
}
