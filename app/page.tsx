'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Crosshair, Expand, Minimize, Volume2, VolumeX, Play, Zap, Pause, Move, MousePointer2, Trophy, RotateCcw, Shield, Layers, Sparkles } from 'lucide-react';
import type { GameEngine } from '@/lib/game-engine';
import { GameModel } from '@/lib/game-model';
import { RewardScreen } from '@/components/reward-screen';
import { RARITY_COLOR } from '@/lib/roguelike';

const initial = new GameModel().snapshot();
const scoreText = (n: number) => String(n).padStart(6, '0');
const timeText = (n: number) => `${Math.floor(n / 60).toString().padStart(2, '0')}:${Math.floor(n % 60).toString().padStart(2, '0')}`;

export default function Home() {
  const arena = useRef<HTMLDivElement>(null), shell = useRef<HTMLDivElement>(null), engine = useRef<GameEngine | null>(null);
  const [game, setGame] = useState(initial), [muted, setMuted] = useState(false), [ready, setReady] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [fps, setFps] = useState(0), [fullscreen, setFullscreen] = useState(false);
  useEffect(() => {
    let disposed = false; let cleanupTools: (() => void) | undefined;
    import('@/lib/game-engine').then(async ({ GameEngine }) => {
      if (disposed || !arena.current) return;
      try {
        engine.current = new GameEngine(arena.current, setGame, setFps, setError);
        setMuted(engine.current.muted); setReady(true);
        const { registerGameTools } = await import('@/lib/game-tools');
        if (!disposed && engine.current) cleanupTools = registerGameTools(engine.current);
      } catch (e) { console.error('Arena initialization failed', e); setError('This arena needs WebGL graphics. Enable hardware acceleration in your browser, then reload.'); }
    }).catch(() => { if (!disposed) setError('The game could not load. Reload to try again.'); });
    const changed = () => setFullscreen(document.fullscreenElement === shell.current);
    document.addEventListener('fullscreenchange', changed);
    return () => { disposed = true; cleanupTools?.(); engine.current?.dispose(); engine.current = null; document.removeEventListener('fullscreenchange', changed); };
  }, []);
  useEffect(() => { if (!notice) return; const timer = setTimeout(() => setNotice(''), 4000); return () => clearTimeout(timer); }, [notice]);
  const start = () => engine.current?.start();
  const toggleSound = () => { const value = !engine.current?.muted; engine.current?.setMuted(value); setMuted(value); };
  const expand = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (shell.current?.requestFullscreen) await shell.current.requestFullscreen();
      else setNotice('Fullscreen is unavailable in this browser.');
    } catch { setNotice('Fullscreen is unavailable in this view.'); }
  };
  const active = game.status === 'playing';
  const synergies = [...new Set(game.weapons.flatMap(w => w.synergies))];
  return (
    <main className="arcade">
      <header className="topbar">
        <Link className="brand" href="/" aria-label="Geometry Conflict home"><span className="brand-mark"><Crosshair size={24}/></span> GEOMETRY<span className="brand-light">CONFLICT</span></Link>
        <div className="system-status"><span/> SYSTEM ONLINE <b>{fps ? `${fps} FPS` : 'THREE.JS'}</b></div>
      </header>
      <section className="game-section" aria-label="Geometry Conflict arcade game">
        <div className="section-heading"><div><div className="eyebrow"><span>01</span> THE ARENA</div><h1>Order meets <em>chaos.</em></h1></div><div className="mode"><span/> ROGUELIKE SURVIVAL <ArrowUpRight size={15}/></div></div>
        <div className={`game-shell ${fullscreen ? 'fullscreen' : ''}`} ref={shell}>
          <div className="hud"><div className="score"><span>SCORE</span><strong>{scoreText(game.score)}</strong></div><div className="hud-center"><div><span>WAVE</span><strong>{String(game.wave).padStart(2, '0')}</strong></div><i/><div><span>MULTIPLIER</span><strong className="mint">{game.multiplier}×</strong></div></div><div className="lives"><span>SHIP STATUS</span><div className="ship-resources"><b aria-label={`${game.lives} lives remaining`}>△ {game.lives}</b><b className="shield-count" aria-label={`${game.shields} shields`}><Shield size={17}/>{game.shields}</b></div></div></div>
          <div className={`arena ${active ? 'active-arena' : ''} ${game.status === 'reward' ? 'reward-arena' : ''}`} id="arena">
            <div className="canvas-host" ref={arena}/>
            {game.status !== 'reward' && <div className="arena-coordinate coordinate-top">{active ? `WAVE ${game.wave} / ${Math.max(0, Math.round(game.waveProgress * 100))}% CLEARED` : 'GC—01 / SECTOR ZERO'}</div>}
            {error ? <div className="start-screen error-screen" role="alert"><Crosshair size={36}/><h2>CONNECTION<br/><span>LOST.</span></h2><p>{error}</p><button className="start-button" onClick={() => window.location.reload()}><RotateCcw size={17}/> RELOAD ARENA</button></div> : game.status === 'reward' ? <RewardScreen game={game} onChoose={id => engine.current?.chooseReward(id)} onReroll={() => engine.current?.rerollRewards()}/> : game.status === 'ready' ? (
              <div className="start-screen"><div className="ready-pill"><span/> 10 WEAPONS · 36 RELICS · ONE RUN</div><h2>ENTER<br/>THE <span>GRID.</span></h2><p>Choose weapons after waves 1 and 5. Fire both together. Power up between waves.</p><button className="start-button" onClick={start} disabled={!ready}><Play size={17} fill="currentColor"/> {ready ? 'START GAME' : 'CONNECTING…'} <ArrowUpRight size={20}/></button><div className="enter-hint desktop-hint">or press <kbd>ENTER</kbd></div><div className="enter-hint mobile-hint">Two thumbs. Total control.</div></div>
            ) : game.status === 'paused' ? (
              <div className="start-screen pause-screen"><div className="ready-pill">TAKE A BREATHER</div><h2>GAME<br/><span>PAUSED.</span></h2><p>The grid can wait.</p><button className="start-button" onClick={() => engine.current?.togglePause()}><Play size={17} fill="currentColor"/> RESUME GAME <ArrowUpRight size={20}/></button><div className="enter-hint">or press <kbd>ESC</kbd> / <kbd>P</kbd></div></div>
            ) : game.status === 'over' ? (
              <div className="start-screen over-screen"><div className="ready-pill">{game.score > 0 && game.score >= game.best ? 'PERSONAL BEST' : 'RUN COMPLETE'}</div><h2>SIGNAL<br/><span>LOST.</span></h2><div className="final-weapon">{game.weapons.map(weapon => <div key={weapon.id} style={{ color: weapon.color }}>{weapon.name} · LV. {weapon.level}</div>)}<span>{game.relics.length} RELICS</span></div><div className="end-score">{scoreText(game.score)}<span>FINAL SCORE</span></div><div className="run-stats"><span>WAVE <b>{game.wave}</b></span><span>KILLS <b>{game.kills}</b></span><span>TIME <b>{timeText(game.time)}</b></span></div><button className="start-button" onClick={start}><RotateCcw size={17}/> PLAY AGAIN <ArrowUpRight size={20}/></button><div className="enter-hint desktop-hint">or press <kbd>ENTER</kbd></div></div>
            ) : null}
            {active && game.waveBanner && <output className="wave-banner"><span>STAY SHARP</span>WAVE {String(game.wave).padStart(2, '0')}</output>}
            <div className={`arena-coordinate coordinate-bottom ${game.status === 'reward' ? 'hidden-coordinate' : ''}`}><span/> {game.status === 'ready' ? 'ALL SYSTEMS READY' : game.status === 'paused' ? 'SIMULATION SUSPENDED' : game.status === 'over' ? 'PILOT DISCONNECTED' : `SURVIVAL TIME / ${timeText(game.time)}`}</div>
            {(active || game.status === 'paused') && <button className="bomb-button" onClick={() => engine.current?.bomb()} disabled={!active || game.bombs === 0} aria-label={`Use bomb. ${game.bombs} remaining`}><Zap size={15}/><span>{game.bombs}</span><kbd>SPACE</kbd></button>}
            <div className="arena-corner tl"/><div className="arena-corner tr"/><div className="arena-corner bl"/><div className="arena-corner br"/>
          </div>
          <div className="loadout-bar"><div className="loadout-weapons" aria-label="Active weapons">{game.weapons.map(weapon => <div className="equipped-weapon" key={weapon.id} style={{ color: weapon.color }}><Crosshair size={15}/><b>{weapon.name}</b><span>LV. {weapon.level}</span><small style={{ color: RARITY_COLOR[weapon.rarity] }}>{weapon.rarity}</small></div>)}</div><div className="run-resources"><Layers size={14}/>{game.relics.length} RELICS<i/><RotateCcw size={13}/>{game.rerolls} REROLLS</div></div>
          <div className="game-toolbar"><div className="best"><Trophy size={14}/><span>PERSONAL BEST</span><b>{scoreText(game.best)}</b></div><div className="game-tools"><button onClick={toggleSound} aria-label={muted ? 'Unmute sound' : 'Mute sound'} title={muted ? 'Unmute sound' : 'Mute sound'} aria-pressed={!muted}>{muted ? <VolumeX size={17}/> : <Volume2 size={17}/>}</button><span/><button onClick={() => engine.current?.togglePause()} disabled={game.status !== 'playing' && game.status !== 'paused'} aria-label={game.status === 'paused' ? 'Resume game' : 'Pause game'} title="Pause / resume (P or Esc)">{game.status === 'paused' ? <Play size={17}/> : <Pause size={17}/>}</button><button onClick={expand} aria-label={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'} title="Fullscreen">{fullscreen ? <Minimize size={17}/> : <Expand size={17}/>}</button></div></div>
          {notice && <output className="notice">{notice}</output>}
        </div>
        <div className="below-arena"><div className="controls"><div className="control"><Move/><div><b>MOVE</b><span className="desktop-controls"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd><small> / arrows</small></span><span className="touch-controls">Left thumb</span></div></div><div className="control"><MousePointer2/><div><b>AIM & SHOOT</b><span className="desktop-controls">Hold click <small> / I J K L</small></span><span className="touch-controls">Right thumb</span></div></div><div className="control"><Zap/><div><b>CLEAR THE ARENA</b><span className="desktop-controls"><kbd>SPACE</kbd><small> / {game.bombs} bombs</small></span><span className="touch-controls">Tap <Zap size={13}/><small> / {game.bombs} bombs</small></span></div></div></div><div className="enemy-legend"><span className="legend-title">KNOW YOUR ENEMY</span><div><span className="legend-enemy cyan">◇ <b>DRIFTER</b></span><span className="legend-enemy pink">□ <b>CHASER</b></span><span className="legend-enemy orange">△ <b>SPINNER</b></span></div></div></div>
        {game.relics.length > 0 && <details className="run-build" onToggle={e => { if (e.currentTarget.open && game.status === 'playing') engine.current?.togglePause(); }}><summary><Layers size={16}/> YOUR RUN BUILD <span>{game.relics.length} RELICS</span></summary>{synergies.length > 0 && <div className="build-synergies"><Sparkles size={16}/>{synergies.join(' / ')}</div>}<div className="owned-relics">{game.relics.map((relic, i) => <div key={i}><b style={{ color: RARITY_COLOR[relic.rarity] }}>{relic.name}<small>{relic.rarity}</small></b><p>{relic.description}</p></div>)}</div></details>}
      </section>
      <footer><span>STAY SHARP. STAY ALIVE.</span><span>BUILT FOR THE HIGH SCORE <span className="footer-star">✳</span></span></footer>
    </main>
  );
}
