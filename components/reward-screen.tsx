'use client';
import { useEffect, useRef, type CSSProperties } from 'react';
import {
  RotateCcw,
  Shield,
  Heart,
  Zap,
  Crosshair,
  Sparkles,
  Flame,
  Snowflake,
  Orbit,
  Move,
  TrendingUp,
  Dice5,
} from 'lucide-react';
import type { GameSnapshot } from '@/lib/game-model';
import { type Rarity, type Reward } from '@/lib/roguelike';

import { WeaponDiagram } from './weapon-diagram';
export { WeaponDiagram } from './weapon-diagram';

// Desaturated field labels keep rarity legible without changing gameplay colors.
export const FIELD_RARITY_COLOR: Record<Rarity, string> = {
  common: '#c4c0b4',
  uncommon: '#b4c5a3',
  rare: '#9ebac9',
  epic: '#c6afd0',
  legendary: '#e5bc76',
};

function RewardIcon({ reward }: { reward: Reward }) {
  const Icon =
    reward.relicId === 'hull'
      ? Heart
      : reward.relicId === 'reroll'
        ? Dice5
        : ['DEFENSE', 'SUPPLY'].includes(reward.category)
          ? Shield
          : reward.category === 'FIRE'
            ? Flame
            : reward.category === 'FROST'
              ? Snowflake
              : reward.category === 'ELECTRIC'
                ? Zap
                : reward.category === 'ORBITAL'
                  ? Orbit
                  : reward.category === 'MOBILITY'
                    ? Move
                    : reward.type === 'upgrade'
                      ? TrendingUp
                      : reward.category === 'FORTUNE'
                        ? Sparkles
                        : Crosshair;
  return <Icon size={36} strokeWidth={1.3} />;
}
export function RewardScreen({
  game,
  onChoose,
  onReroll,
}: {
  game: GameSnapshot;
  onChoose: (id: string) => void;
  onReroll: () => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, [game.wave]);
  const notes = [
    ...new Set(
      game.rewards.map((reward) => reward.comparisonNote).filter(Boolean),
    ),
  ];
  return (
    <section className="reward-screen" aria-label="Choose your wave reward">
      <div className="reward-heading">
        <h2 ref={heading} tabIndex={-1}>
          {game.wave === 1
            ? 'Choose a weapon'
            : game.wave === 5
              ? 'Add a weapon'
              : 'Choose a power-up'}
        </h2>
        {game.wave === 1 ? (
          <p>Add a second weapon after wave 5.</p>
        ) : game.wave === 5 ? (
          <p>Both weapons stay active.</p>
        ) : null}
      </div>
      <div className="reward-cards" aria-label="Three reward choices">
        {game.rewards.map((reward, i) => {
          const comparison = reward.changes
            ?.map(
              (change) =>
                `${change.label}: ${change.before} to ${change.after}.`,
            )
            .join(' ');
          const choiceLabel = [
            `Choose ${reward.name}.`,
            reward.type === 'weapon' ? `Level ${reward.amount}.` : '',
            reward.type !== 'upgrade' ? `${reward.rarity}.` : '',
            reward.description,
            comparison,
            reward.comparisonNote,
          ]
            .filter(Boolean)
            .join(' ');
          return (
            <button
              key={reward.id}
              className={`reward-card ${reward.type}`}
              style={
                {
                  '--rarity': FIELD_RARITY_COLOR[reward.rarity],
                } as CSSProperties
              }
              onClick={() => onChoose(reward.id)}
              aria-label={choiceLabel}
            >
              <div className="card-topline">
                {reward.type !== 'upgrade' ? (
                  <span className="rarity">
                    <i />
                    {reward.rarity}
                    {reward.type === 'weapon' && (
                      <span className="draft-level">Lv. {reward.amount}</span>
                    )}
                  </span>
                ) : (
                  <span />
                )}
                <kbd className="desktop-hint">{i + 1}</kbd>
              </div>
              {reward.type === 'weapon' && (
                <div className="reward-visual">
                  <WeaponDiagram
                    id={reward.weaponId!}
                    level={reward.amount}
                    color={FIELD_RARITY_COLOR[reward.rarity]}
                  />
                </div>
              )}
              <div className="reward-name">
                {reward.type !== 'weapon' && <RewardIcon reward={reward} />}
                <h3>{reward.name}</h3>
              </div>
              {reward.description && (
                <p
                  className={
                    reward.changes?.length ? 'quality-change' : undefined
                  }
                >
                  {reward.description}
                </p>
              )}
              {!!reward.changes?.length && (
                <dl className="upgrade-comparison">
                  {reward.changes.map((change) => (
                    <div key={change.label}>
                      <dt>{change.label}</dt>
                      <dd>
                        <span className="before-value">{change.before}</span>
                        <span className="comparison-arrow" aria-hidden="true">
                          →
                        </span>
                        <strong>{change.after}</strong>
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </button>
          );
        })}
      </div>
      {notes.length > 0 && (
        <p className="comparison-note">{notes.join(' · ')}</p>
      )}
      <div className="reward-bottom">
        <button
          className="reroll-button"
          onClick={onReroll}
          disabled={game.rerolls === 0}
          title={
            game.rerolls === 0
              ? 'No rerolls remaining'
              : 'Rerolls carry across the run (R)'
          }
          aria-label={`Reroll choices. ${game.rerolls} remaining for this run.`}
        >
          <RotateCcw size={15} />
          Reroll<span>{game.rerolls} left</span>
          <kbd className="desktop-hint">R</kbd>
        </button>
      </div>
    </section>
  );
}
