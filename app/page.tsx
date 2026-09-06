'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  Crosshair,
  Expand,
  Minimize,
  Volume2,
  VolumeX,
  Play,
  Zap,
  Pause,
  Move,
  MousePointer2,
  Trophy,
  RotateCcw,
  Shield,
  Layers,
  Sparkles,
  Heart,
  Factory,
} from 'lucide-react';
import type { GameEngine } from '@/lib/game-engine';
import { GameModel } from '@/lib/game-model';
import { RewardScreen, FIELD_RARITY_COLOR } from '@/components/reward-screen';

function MachineMark({
  type,
}: {
  type: 'crawler' | 'interceptor' | 'turbine';
}) {
  return (
    <svg viewBox="0 0 36 28" aria-hidden="true" className="machine-mark">
      {type === 'crawler' ? (
        <>
          <rect x="2" y="3" width="8" height="23" rx="3" fill="currentColor" />
          <rect x="26" y="3" width="8" height="23" rx="3" fill="currentColor" />
          <path d="M10 7h16v17H10z" fill="currentColor" opacity=".7" />
          <rect x="14" y="8" width="8" height="10" rx="2" fill="#272824" />
          <path d="M17 1h3v11h-3z" fill="currentColor" />
        </>
      ) : type === 'interceptor' ? (
        <>
          <path d="M12 5h12l4 9-3 11H11L8 14z" fill="currentColor" />
          <path
            d="M4 7h5v8H4zm23 0h5v8h-5zM4 19h5v7H4zm23 0h5v7h-5z"
            fill="currentColor"
            opacity=".7"
          />
          <path d="M16 0h4v13h-4z" fill="currentColor" />
          <path d="M13 16h10v5H13z" fill="#272824" />
        </>
      ) : (
        <>
          <circle cx="18" cy="14" r="12" fill="currentColor" opacity=".4" />
          <path
            d="M17 2h3l2 8 8-2 2 3-7 6 5 6-3 2-8-5-6 6-3-2 2-9-9-2 1-4 10 1z"
            fill="currentColor"
          />
          <circle cx="18" cy="14" r="5" fill="#272824" />
          <circle cx="18" cy="14" r="2" fill="currentColor" />
        </>
      )}
    </svg>
  );
}

const initial = new GameModel().snapshot();
const scoreText = (n: number) => String(n).padStart(6, '0');
const timeText = (n: number) =>
  `${Math.floor(n / 60)
    .toString()
    .padStart(2, '0')}:${Math.floor(n % 60)
    .toString()
    .padStart(2, '0')}`;

export default function Home() {
  const arena = useRef<HTMLDivElement>(null),
    shell = useRef<HTMLDivElement>(null),
    engine = useRef<GameEngine | null>(null);
  const [game, setGame] = useState(initial),
    [muted, setMuted] = useState(false),
    [ready, setReady] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const [fps, setFps] = useState(0),
    [fullscreen, setFullscreen] = useState(false);
  useEffect(() => {
    let disposed = false;
    let cleanupTools: (() => void) | undefined;
    import('@/lib/game-engine')
      .then(async ({ GameEngine }) => {
        if (disposed || !arena.current) return;
        try {
          engine.current = new GameEngine(
            arena.current,
            setGame,
            setFps,
            setError,
          );
          setMuted(engine.current.muted);
          setReady(true);
          const { registerGameTools } = await import('@/lib/game-tools');
          if (!disposed && engine.current)
            cleanupTools = registerGameTools(engine.current);
        } catch (e) {
          console.error('Arena initialization failed', e);
          setError(
            'This arena needs WebGL graphics. Enable hardware acceleration in your browser, then reload.',
          );
        }
      })
      .catch(() => {
        if (!disposed)
          setError('The game could not load. Reload to try again.');
      });
    const changed = () =>
      setFullscreen(document.fullscreenElement === shell.current);
    document.addEventListener('fullscreenchange', changed);
    return () => {
      disposed = true;
      cleanupTools?.();
      engine.current?.dispose();
      engine.current = null;
      document.removeEventListener('fullscreenchange', changed);
    };
  }, []);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 4000);
    return () => clearTimeout(timer);
  }, [notice]);
  const start = () => engine.current?.start();
  const toggleSound = () => {
    const value = !engine.current?.muted;
    engine.current?.setMuted(value);
    setMuted(value);
  };
  const expand = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (shell.current?.requestFullscreen)
        await shell.current.requestFullscreen();
      else setNotice('Fullscreen is unavailable in this browser.');
    } catch {
      setNotice('Fullscreen is unavailable in this view.');
    }
  };
  const active = game.status === 'playing';
  const synergies = [...new Set(game.weapons.flatMap((w) => w.synergies))];
  return (
    <main className="arcade">
      <header className="topbar">
        <Link className="brand" href="/" aria-label="Man vs. Clankers home">
          <span className="brand-mark">
            <Factory size={23} />
          </span>
          <span className="brand-wordmark">
            MAN vs. CLANKERS<small>HUMAN vs. MACHINE</small>
          </span>
        </Link>
        <div className="system-status">
          <span />{' '}
          {!ready
            ? 'LOADING YARD'
            : game.status === 'playing'
              ? 'RUN IN PROGRESS'
              : game.status === 'reward'
                ? 'REFIT AVAILABLE'
                : game.status === 'paused'
                  ? 'HOLDING POSITION'
                  : game.status === 'over'
                    ? 'RUN COMPLETE'
                    : 'READY TO DEPLOY'}{' '}
          <b>{fps ? `${fps} FPS` : '—'}</b>
        </div>
      </header>
      <section
        className="game-section"
        aria-label="Man vs. Clankers survival game"
      >
        <div className="section-heading">
          <div>
            <div className="eyebrow">
              AN ABANDONED TEST YARD. <span>ONE WAY THROUGH.</span>
            </div>
            <h1>Steel yourself.</h1>
          </div>
          <div className="mode">
            <span /> WAVE SURVIVAL <ArrowUpRight size={15} />
          </div>
        </div>
        <div
          className={`game-shell ${fullscreen ? 'fullscreen' : ''}`}
          ref={shell}
        >
          <div className="hud">
            <div className="score">
              <span>SCORE</span>
              <strong>{scoreText(game.score)}</strong>
            </div>
            <div className="hud-center">
              <div>
                <span>WAVE</span>
                <strong>{String(game.wave).padStart(2, '0')}</strong>
              </div>
              <i />
              <div>
                <span>MULTIPLIER</span>
                <strong className="amber">{game.multiplier}×</strong>
              </div>
            </div>
            <div className="lives">
              <span>LIVES / SHIELDS</span>
              <div className="ship-resources">
                <b aria-label={`${game.lives} lives remaining`}>
                  <Heart size={17} />
                  {game.lives}
                </b>
                <b
                  className="shield-count"
                  aria-label={`${game.shields} shields`}
                >
                  <Shield size={17} />
                  {game.shields}
                </b>
              </div>
            </div>
          </div>
          <div
            className={`arena ${active ? 'active-arena' : ''} ${game.status === 'reward' ? 'reward-arena' : ''}`}
            id="arena"
          >
            <div className="canvas-host" ref={arena} />
            {game.status !== 'reward' && (
              <div className="arena-coordinate coordinate-top">
                {active
                  ? `WAVE ${game.wave} / ${Math.max(0, Math.round(game.waveProgress * 100))}% CLEARED`
                  : 'MAN vs. CLANKERS / LIVE FIRE'}
              </div>
            )}
            {error ? (
              <div className="start-screen error-screen" role="alert">
                <Factory size={36} />
                <h2>
                  UNABLE TO
                  <br />
                  <span>DEPLOY.</span>
                </h2>
                <p>{error}</p>
                <button
                  className="start-button"
                  onClick={() => window.location.reload()}
                >
                  <RotateCcw size={17} /> RELOAD YARD
                </button>
              </div>
            ) : game.status === 'reward' ? (
              <RewardScreen
                game={game}
                onChoose={(id) => engine.current?.chooseReward(id)}
                onReroll={() => engine.current?.rerollRewards()}
              />
            ) : game.status === 'ready' ? (
              <div className="start-screen deploy-screen">
                <div className="ready-pill">
                  <span /> ROGUELIKE · LIVE FIRE SURVIVAL
                </div>
                <h2>
                  BUILT TO
                  <br />
                  <span>OUTLAST.</span>
                </h2>
                <p>
                  One survivor. An army of clankers.
                  <br />
                  Build your arsenal. Break their ranks.
                </p>
                <div className="deployment-note">
                  Choose weapons after waves 1 &amp; 5.
                  <br />
                  Both fire together. Upgrade between waves.
                </div>
                <button
                  className="start-button"
                  onClick={start}
                  disabled={!ready}
                >
                  <Play size={17} fill="currentColor" />{' '}
                  {ready ? 'DEPLOY' : 'PREPARING…'} <ArrowUpRight size={20} />
                </button>
                <div className="enter-hint desktop-hint">
                  or press <kbd>ENTER</kbd>
                </div>
                <div className="enter-hint mobile-hint">
                  Left thumb to move. Right thumb to fire.
                </div>
              </div>
            ) : game.status === 'paused' ? (
              <div className="start-screen pause-screen">
                <div className="ready-pill">HOLD POSITION</div>
                <h2>
                  RUN
                  <br />
                  <span>PAUSED.</span>
                </h2>
                <p>Your run will resume right here.</p>
                <button
                  className="start-button"
                  onClick={() => engine.current?.togglePause()}
                >
                  <Play size={17} fill="currentColor" /> RESUME RUN{' '}
                  <ArrowUpRight size={20} />
                </button>
                <div className="enter-hint">
                  or press <kbd>ESC</kbd> / <kbd>P</kbd>
                </div>
              </div>
            ) : game.status === 'over' ? (
              <div className="start-screen over-screen">
                <div className="ready-pill">
                  {game.score > 0 && game.score >= game.best
                    ? 'PERSONAL BEST'
                    : 'RUN COMPLETE'}
                </div>
                <h2>
                  SURVIVOR
                  <br />
                  <span>DOWN.</span>
                </h2>
                <div className="final-weapon">
                  {game.weapons.map((weapon) => (
                    <div
                      key={weapon.id}
                      style={{ color: FIELD_RARITY_COLOR[weapon.rarity] }}
                    >
                      {weapon.name} · LV. {weapon.level}
                    </div>
                  ))}
                  <span>{game.relics.length} RELICS</span>
                </div>
                <div className="end-score">
                  {scoreText(game.score)}
                  <span>FINAL SCORE</span>
                </div>
                <div className="run-stats">
                  <span>
                    WAVE <b>{game.wave}</b>
                  </span>
                  <span>
                    KILLS <b>{game.kills}</b>
                  </span>
                  <span>
                    TIME <b>{timeText(game.time)}</b>
                  </span>
                </div>
                <button className="start-button" onClick={start}>
                  <RotateCcw size={17} /> PLAY AGAIN <ArrowUpRight size={20} />
                </button>
                <div className="enter-hint desktop-hint">
                  or press <kbd>ENTER</kbd>
                </div>
              </div>
            ) : null}
            {active && game.waveBanner && (
              <output className="wave-banner">
                <span>INCOMING CLANKERS</span>WAVE{' '}
                {String(game.wave).padStart(2, '0')}
              </output>
            )}
            <div
              className={`arena-coordinate coordinate-bottom ${game.status === 'reward' ? 'hidden-coordinate' : ''}`}
            >
              <span />{' '}
              {game.status === 'ready'
                ? '10 WEAPONS / 36 RELICS'
                : game.status === 'paused'
                  ? 'RUN PAUSED'
                  : game.status === 'over'
                    ? 'RUN COMPLETE'
                    : `SURVIVAL TIME / ${timeText(game.time)}`}
            </div>
            {(active || game.status === 'paused') && (
              <button
                className="bomb-button"
                onClick={() => engine.current?.bomb()}
                disabled={!active || game.bombs === 0}
                aria-label={`Use bomb. ${game.bombs} remaining`}
              >
                <Zap size={15} />
                <span>{game.bombs}</span>
                <kbd>SPACE</kbd>
              </button>
            )}
            <div className="arena-corner tl" />
            <div className="arena-corner tr" />
            <div className="arena-corner bl" />
            <div className="arena-corner br" />
          </div>
          <div className="loadout-bar">
            <div className="loadout-weapons" aria-label="Active weapons">
              {game.weapons.map((weapon) => (
                <div
                  className="equipped-weapon"
                  key={weapon.id}
                  style={{ color: FIELD_RARITY_COLOR[weapon.rarity] }}
                >
                  <Crosshair size={15} />
                  <b>{weapon.name}</b>
                  <span>LV. {weapon.level}</span>
                  <small style={{ color: FIELD_RARITY_COLOR[weapon.rarity] }}>
                    {weapon.rarity}
                  </small>
                </div>
              ))}
            </div>
            <div className="run-resources">
              <Layers size={14} />
              {game.relics.length} RELICS
              <i />
              <RotateCcw size={13} />
              {game.rerolls} REROLLS
            </div>
          </div>
          <div className="game-toolbar">
            <div className="best">
              <Trophy size={14} />
              <span>PERSONAL BEST</span>
              <b>{scoreText(game.best)}</b>
            </div>
            <div className="game-tools">
              <button
                onClick={toggleSound}
                aria-label={muted ? 'Unmute sound' : 'Mute sound'}
                title={muted ? 'Unmute sound' : 'Mute sound'}
                aria-pressed={!muted}
              >
                {muted ? <VolumeX size={17} /> : <Volume2 size={17} />}
              </button>
              <span />
              <button
                onClick={() => engine.current?.togglePause()}
                disabled={game.status !== 'playing' && game.status !== 'paused'}
                aria-label={
                  game.status === 'paused' ? 'Resume game' : 'Pause game'
                }
                title="Pause / resume (P or Esc)"
              >
                {game.status === 'paused' ? (
                  <Play size={17} />
                ) : (
                  <Pause size={17} />
                )}
              </button>
              <button
                onClick={expand}
                aria-label={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                title="Fullscreen"
              >
                {fullscreen ? <Minimize size={17} /> : <Expand size={17} />}
              </button>
            </div>
          </div>
          {notice && <output className="notice">{notice}</output>}
        </div>
        <div className="below-arena">
          <div className="controls">
            <div className="control">
              <Move />
              <div>
                <b>MOVE</b>
                <span className="desktop-controls">
                  <kbd>W</kbd>
                  <kbd>A</kbd>
                  <kbd>S</kbd>
                  <kbd>D</kbd>
                  <small> / arrows</small>
                </span>
                <span className="touch-controls">Left thumb</span>
              </div>
            </div>
            <div className="control">
              <MousePointer2 />
              <div>
                <b>AIM & SHOOT</b>
                <span className="desktop-controls">
                  Hold click <small> / I J K L</small>
                </span>
                <span className="touch-controls">Right thumb</span>
              </div>
            </div>
            <div className="control">
              <Zap />
              <div>
                <b>CLEAR THE ARENA</b>
                <span className="desktop-controls">
                  <kbd>SPACE</kbd>
                  <small> / {game.bombs} bombs</small>
                </span>
                <span className="touch-controls">
                  Tap <Zap size={13} />
                  <small> / {game.bombs} bombs</small>
                </span>
              </div>
            </div>
          </div>
          <div className="enemy-legend">
            <span className="legend-title">KNOW YOUR CLANKERS</span>
            <div>
              <span className="legend-enemy crawler">
                <MachineMark type="crawler" />
                <b>CRAWLER</b>
              </span>
              <span className="legend-enemy interceptor">
                <MachineMark type="interceptor" />
                <b>INTERCEPTOR</b>
              </span>
              <span className="legend-enemy turbine">
                <MachineMark type="turbine" />
                <b>TURBINE</b>
              </span>
            </div>
          </div>
        </div>
        {game.relics.length > 0 && (
          <details
            className="run-build"
            onToggle={(e) => {
              if (e.currentTarget.open && game.status === 'playing')
                engine.current?.togglePause();
            }}
          >
            <summary>
              <Layers size={16} /> YOUR RUN BUILD{' '}
              <span>{game.relics.length} RELICS</span>
            </summary>
            {synergies.length > 0 && (
              <div className="build-synergies">
                <Sparkles size={16} />
                {synergies.join(' / ')}
              </div>
            )}
            <div className="owned-relics">
              {game.relics.map((relic, i) => (
                <div key={i}>
                  <b style={{ color: FIELD_RARITY_COLOR[relic.rarity] }}>
                    {relic.name}
                    <small>{relic.rarity}</small>
                  </b>
                  <p>{relic.description}</p>
                </div>
              ))}
            </div>
          </details>
        )}
      </section>
      <footer>
        <span>
          MAN vs. CLANKERS <span className="footer-divider">/</span> BUILT TO
          OUTLAST
        </span>
        <span>EVERY RUN LEAVES A MARK.</span>
      </footer>
    </main>
  );
}
