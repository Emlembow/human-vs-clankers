'use client';
import { useEffect, useRef, useState, type SyntheticEvent } from 'react';
import Link from 'next/link';
import {
  Expand,
  Minimize,
  Volume2,
  VolumeX,
  Play,
  Zap,
  Pause,
  Trophy,
  RotateCcw,
  Shield,
  Heart,
  CircleHelp,
} from 'lucide-react';
import type { GameEngine } from '@/lib/game-engine';
import { GameModel } from '@/lib/game-model';
import { RewardScreen, FIELD_RARITY_COLOR } from '@/components/reward-screen';
import { Credits } from '@/components/credits';

function ControlHelp() {
  return (
    <div className="control-help-content">
      <dl className="desktop-controls">
        <div>
          <dt>Move</dt>
          <dd>
            <kbd>WASD</kbd> / arrows
          </dd>
        </div>
        <div>
          <dt>Aim &amp; fire</dt>
          <dd>
            Hold click / <kbd>IJKL</kbd>
          </dd>
        </div>
        <div>
          <dt>Bomb</dt>
          <dd>
            <kbd>Space</kbd>
          </dd>
        </div>
        <div>
          <dt>Pause</dt>
          <dd>
            <kbd>Esc</kbd> / <kbd>P</kbd>
          </dd>
        </div>
      </dl>
      <dl className="touch-controls">
        <div>
          <dt>Move</dt>
          <dd>Left thumb</dd>
        </div>
        <div>
          <dt>Aim &amp; fire</dt>
          <dd>Right thumb</dd>
        </div>
        <div>
          <dt>Bomb</dt>
          <dd>
            Tap <Zap size={13} aria-label="bomb" />
          </dd>
        </div>
      </dl>
    </div>
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
  const [fullscreen, setFullscreen] = useState(false);
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
            () => {},
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
            'Enable hardware acceleration in your browser, then reload.',
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
  const hasRun = game.status !== 'ready';
  const pauseForDetails = (event: SyntheticEvent<HTMLDetailsElement>) => {
    if (event.currentTarget.open && engine.current?.model.status === 'playing')
      engine.current.togglePause();
  };
  return (
    <main className="arcade">
      <header className="topbar">
        <h1>
          <Link className="brand" href="/">
            MAN vs. CLANKERS
          </Link>
        </h1>
      </header>
      <section className="game-section" aria-label="Survival game">
        <div
          className={`game-shell ${fullscreen ? 'fullscreen' : ''}`}
          ref={shell}
        >
          {hasRun && game.status !== 'over' && !error && (
            <div className="hud">
              <div className="score">
                <span>Score</span>
                <strong>{scoreText(game.score)}</strong>
              </div>
              <div className="hud-center">
                <div className="wave-status">
                  <span>Wave</span>
                  <strong>{String(game.wave).padStart(2, '0')}</strong>
                  <progress
                    aria-label={`Wave ${game.wave} cleared`}
                    max={1}
                    value={game.waveProgress}
                    title={`${Math.round(game.waveProgress * 100)}% cleared`}
                  />
                </div>
                <div>
                  <span>Multiplier</span>
                  <strong className="amber">{game.multiplier}×</strong>
                </div>
              </div>
              <div className="lives">
                <span>Lives / shields</span>
                <div className="ship-resources">
                  <b
                    aria-label={`${game.lives} lives remaining`}
                    title={`${game.lives} lives remaining`}
                  >
                    <Heart size={17} />
                    {game.lives}
                  </b>
                  <b
                    className="shield-count"
                    aria-label={`${game.shields} shields`}
                    title={`${game.shields} shields`}
                  >
                    <Shield size={17} />
                    {game.shields}
                  </b>
                </div>
              </div>
            </div>
          )}
          <div
            className={`arena ${active ? 'active-arena' : ''} ${game.status === 'reward' ? 'reward-arena' : ''}`}
            id="arena"
          >
            <div className="canvas-host" ref={arena} />
            {error ? (
              <div className="start-screen error-screen" role="alert">
                <h2>Unable to load</h2>
                <p>{error}</p>
                <button
                  className="start-button"
                  onClick={() => window.location.reload()}
                >
                  <RotateCcw size={17} />
                  Reload
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
                <button
                  className="start-button"
                  onClick={start}
                  disabled={!ready}
                  title="Start run (Enter)"
                >
                  <Play size={17} fill="currentColor" />
                  {ready ? 'Start run' : 'Loading…'}
                  <kbd className="desktop-hint">Enter</kbd>
                </button>
                <ControlHelp />
              </div>
            ) : game.status === 'paused' ? (
              <div className="start-screen pause-screen">
                <h2>Paused</h2>
                <button
                  className="start-button"
                  onClick={() => engine.current?.togglePause()}
                  title="Resume (Esc or P)"
                >
                  <Play size={17} fill="currentColor" />
                  Resume
                </button>
              </div>
            ) : game.status === 'over' ? (
              <div className="start-screen over-screen">
                <h2>Run ended</h2>
                <div className="end-score">
                  {scoreText(game.score)}
                  <span>
                    {game.score > 0 && game.score >= game.best
                      ? 'New best score'
                      : 'Score'}
                  </span>
                </div>
                <div className="run-stats">
                  <span>
                    Wave <b>{game.wave}</b>
                  </span>
                  <span>
                    Kills <b>{game.kills}</b>
                  </span>
                  <span>
                    Time <b>{timeText(game.time)}</b>
                  </span>
                </div>
                <button
                  className="start-button"
                  onClick={start}
                  title="Play again (Enter)"
                >
                  <RotateCcw size={17} />
                  Play again
                </button>
              </div>
            ) : null}
            {(active || game.status === 'paused') && (
              <button
                className="bomb-button"
                onClick={() => engine.current?.bomb()}
                disabled={!active || game.bombs === 0}
                aria-label={`Use bomb. ${game.bombs} remaining`}
                title={`Bomb (Space) · ${game.bombs} remaining`}
              >
                <Zap size={17} />
                <span>{game.bombs}</span>
                <kbd>Space</kbd>
              </button>
            )}
          </div>
          {hasRun && !error && (
            <div className="loadout-bar" aria-label="Current loadout">
              {game.weapons.map((weapon) => (
                <div className="equipped-weapon" key={weapon.id}>
                  <b>{weapon.name}</b>
                  <span>Lv. {weapon.level}</span>
                  <small style={{ color: FIELD_RARITY_COLOR[weapon.rarity] }}>
                    {weapon.rarity}
                  </small>
                </div>
              ))}
            </div>
          )}
          <div className="game-toolbar">
            {game.best > 0 && game.status !== 'over' ? (
              <div className="best">
                <Trophy size={14} />
                <span>Best</span>
                <b>{scoreText(game.best)}</b>
              </div>
            ) : (
              <div />
            )}
            <div className="game-tools">
              {hasRun && !error && (
                <details className="controls-help" onToggle={pauseForDetails}>
                  <summary aria-label="Controls" title="Controls">
                    <CircleHelp size={17} />
                  </summary>
                  <ControlHelp />
                </details>
              )}
              <button
                onClick={toggleSound}
                aria-label={muted ? 'Unmute sound' : 'Mute sound'}
                title={muted ? 'Unmute sound' : 'Mute sound'}
                aria-pressed={!muted}
              >
                {muted ? <VolumeX size={17} /> : <Volume2 size={17} />}
              </button>
              {hasRun && game.status !== 'over' && (
                <button
                  onClick={() => engine.current?.togglePause()}
                  disabled={
                    game.status !== 'playing' && game.status !== 'paused'
                  }
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
              )}
              <button
                onClick={expand}
                aria-label={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                title="Fullscreen"
              >
                {fullscreen ? <Minimize size={17} /> : <Expand size={17} />}
              </button>
            </div>
          </div>
          <Credits onToggle={pauseForDetails} />
          {notice && <output className="notice">{notice}</output>}
        </div>
        {game.relics.length > 0 && (
          <details className="run-build" onToggle={pauseForDetails}>
            <summary>
              Power-ups <span>{game.relics.length}</span>
            </summary>
            <div className="owned-relics">
              {game.relics.map((relic, i) => (
                <div key={i}>
                  <b style={{ color: FIELD_RARITY_COLOR[relic.rarity] }}>
                    {relic.name}
                  </b>
                  <p>{relic.description}</p>
                </div>
              ))}
            </div>
          </details>
        )}
      </section>
    </main>
  );
}
