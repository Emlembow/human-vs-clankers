'use client';
import { useEffect, useRef, type CSSProperties } from 'react';
import {
  ArrowUpRight,
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
import { type Rarity, type Reward, type WeaponId } from '@/lib/roguelike';

// Desaturated field labels keep rarity legible without changing gameplay colors.
export const FIELD_RARITY_COLOR: Record<Rarity, string> = {
  common: '#c4c0b4',
  uncommon: '#b4c5a3',
  rare: '#9ebac9',
  epic: '#c6afd0',
  legendary: '#e5bc76',
};

export function WeaponDiagram({ id, color }: { id: WeaponId; color: string }) {
  const longBarrel = id === 'rail' || id === 'needle' || id === 'repeater';
  return (
    <svg viewBox="0 0 220 92" className="weapon-diagram" aria-hidden="true">
      <ellipse cx="112" cy="76" rx="81" ry="8" fill="#000" opacity=".25" />
      <path d="M57 54h71l11 13H46z" fill="#383b37" />
      <rect x="59" y="61" width="63" height="8" rx="2" fill="#686c63" />
      <path d="M49 26h80l15 12v24H44V34z" fill="#72776d" />
      <path d="M49 26h80l15 12H44z" fill="#a0a396" />
      <path d="M49 41h81v20H49z" fill="#51564f" />
      <path d="M53 30h47v7H53z" fill={color} opacity=".8" />
      <path d="M55 47h20v9H55z" fill="#292d29" />
      <path d="M57 49h3v5h-3zm5 0h3v5h-3zm5 0h3v5h-3z" fill="#83887c" />
      <circle cx="49" cy="38" r="2" fill="#d4d3c6" />
      <circle cx="136" cy="42" r="2" fill="#d4d3c6" />
      <circle cx="127" cy="57" r="2" fill="#d4d3c6" />
      {longBarrel ? (
        <>
          <path
            d={`M120 39h${id === 'rail' ? 85 : 68}v12h-${id === 'rail' ? 85 : 68}z`}
            fill="#aeb2a5"
          />
          <path
            d={`M120 46h${id === 'rail' ? 85 : 68}v5h-${id === 'rail' ? 85 : 68}z`}
            fill="#555b52"
          />
          <rect
            x={id === 'rail' ? 191 : 172}
            y="36"
            width="16"
            height="18"
            rx="2"
            fill="#464c44"
          />
          <path d="M113 35h14v22h-14z" fill="#868d7e" />
          {id === 'repeater' && (
            <path
              d="M91 44h5v22h-5zm8 0h5v22h-5zm8 0h5v22h-5z"
              fill="#c29d62"
            />
          )}
        </>
      ) : id === 'trident' ? (
        [29, 43, 57].map((y) => (
          <g key={y}>
            <rect x="119" y={y} width="72" height="10" fill="#8f9688" />
            <rect
              x="177"
              y={y - 1}
              width="15"
              height="12"
              rx="2"
              fill="#3c433a"
            />
          </g>
        ))
      ) : id === 'seeker' ? (
        <>
          <path d="M104 20h72l17 15v32h-89z" fill="#5f685a" />
          <path d="M104 20h72l17 15h-73z" fill="#a3aa95" />
          {[41, 56].map((y) => (
            <g key={y}>
              <circle cx="150" cy={y} r="6" fill="#292e27" />
              <circle cx="174" cy={y} r="6" fill="#292e27" />
              <circle cx="150" cy={y} r="3" fill="#bbaa89" />
              <circle cx="174" cy={y} r="3" fill="#bbaa89" />
            </g>
          ))}
        </>
      ) : id === 'nova' || id === 'ricochet' ? (
        <>
          <ellipse
            cx="128"
            cy="40"
            rx={id === 'nova' ? 44 : 33}
            ry="24"
            fill="#444d43"
          />
          <ellipse
            cx="128"
            cy="33"
            rx={id === 'nova' ? 44 : 33}
            ry="20"
            fill="#8a9585"
          />
          <ellipse cx="128" cy="33" rx="18" ry="11" fill="#4b5548" />
          <ellipse cx="128" cy="30" rx="11" ry="6" fill={color} />
          <path d="M159 35h31v10h-31z" fill="#565f51" />
        </>
      ) : id === 'tesla' ? (
        <>
          <path d="M120 33h74v26h-74z" fill="#484e47" />
          {[125, 140, 155, 170].map((x) => (
            <g key={x}>
              <rect x={x} y="27" width="8" height="37" rx="3" fill="#ac9e82" />
              <rect x={x + 2} y="28" width="3" height="33" fill="#dbceb0" />
            </g>
          ))}
          <rect x="190" y="29" width="12" height="32" rx="3" fill="#697267" />
        </>
      ) : id === 'flame' ? (
        <>
          <rect x="42" y="18" width="36" height="53" rx="9" fill="#a88859" />
          <path d="M49 24h20v6H49zm0 31h20v6H49z" fill="#d4bc89" />
          <path d="M126 33h54v23h-54z" fill="#9a9c87" />
          <path d="M172 29h22v31h-22z" fill="#4c5247" />
          <path
            d="M123 57q25 17 54 1"
            fill="none"
            stroke="#a18452"
            strokeWidth="6"
          />
        </>
      ) : (
        <>
          <rect
            x="111"
            y="28"
            width={id === 'mortar' ? 64 : 78}
            height="34"
            rx="4"
            fill="#878d7d"
          />
          <rect
            x={id === 'mortar' ? 164 : 179}
            y="25"
            width="18"
            height="40"
            rx="4"
            fill="#444c3f"
          />
          <rect x="120" y="31" width="32" height="7" fill="#b8bdac" />
          {id === 'scatter' && <path d="M113 46h40v6h-40z" fill="#585f52" />}
        </>
      )}
    </svg>
  );
}
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
  const synergies = [...new Set(game.weapons.flatMap((w) => w.synergies))];
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, [game.wave]);
  return (
    <section className="reward-screen" aria-label="Choose your wave reward">
      <div className="reward-heading">
        <div>
          <div className="eyebrow amber">
            WAVE {String(game.wave).padStart(2, '0')} CLEARED
          </div>
          <h2 ref={heading} tabIndex={-1}>
            {game.wave === 1
              ? 'Arm yourself.'
              : game.wave === 5
                ? 'Add a second weapon.'
                : 'Refit. Then redeploy.'}
          </h2>
          <p>
            {game.wave === 1
              ? 'Three options from ten weapons. Choose one; add a second after wave 5.'
              : game.wave === 5
                ? 'Both weapons fire together. This is your final weapon selection.'
                : 'Upgrade an equipped weapon or take a power-up for your build.'}
          </p>
        </div>
        <div className="draft-badge">
          <Sparkles size={16} />
          <span>
            CHOOSE
            <br />
            <b>1 OF 3</b>
          </span>
        </div>
      </div>
      <div className="reward-cards" aria-label="Three reward choices">
        {game.rewards.map((reward, i) => (
          <button
            key={reward.id}
            className={`reward-card ${reward.type}`}
            style={
              { '--rarity': FIELD_RARITY_COLOR[reward.rarity] } as CSSProperties
            }
            onClick={() => onChoose(reward.id)}
            aria-label={`Choose ${reward.rarity} ${reward.name}. ${reward.description}`}
          >
            <div className="card-topline">
              <span className="rarity">
                <i />
                {reward.rarity}
              </span>
              <kbd>{i + 1}</kbd>
            </div>
            <div className="reward-visual">
              {reward.type === 'weapon' ? (
                <WeaponDiagram
                  id={reward.weaponId!}
                  color={FIELD_RARITY_COLOR[reward.rarity]}
                />
              ) : (
                <RewardIcon reward={reward} />
              )}
            </div>
            <span className="reward-category">{reward.category}</span>
            <h3>{reward.name}</h3>
            <p>{reward.description}</p>
            <div className="card-choose">
              {reward.type === 'weapon'
                ? `${game.wave === 5 ? 'ADD WEAPON' : 'EQUIP'} · LEVEL ${reward.amount}`
                : reward.type === 'upgrade'
                  ? 'UPGRADE & CONTINUE'
                  : 'TAKE & CONTINUE'}
              <ArrowUpRight size={18} />
            </div>
          </button>
        ))}
      </div>
      <div className="reward-bottom">
        <div>
          <button
            className="reroll-button"
            onClick={onReroll}
            disabled={game.rerolls === 0}
          >
            <RotateCcw size={16} />
            REROLL CHOICES<span>{game.rerolls} LEFT</span>
            <kbd>R</kbd>
          </button>
          <p>
            {game.rerolls === 0
              ? 'No rerolls left. Second Opinion rewards can grant more.'
              : 'Shared across the entire run. Spend wisely.'}
          </p>
        </div>
        <div className="current-weapon">
          <span>
            YOUR LOADOUT{game.weapons.length === 2 ? ' · BOTH ACTIVE' : ''}
          </span>
          {game.weapons.map((weapon) => (
            <b
              key={weapon.id}
              style={{ color: FIELD_RARITY_COLOR[weapon.rarity] }}
            >
              {weapon.name}{' '}
              <small>
                LV. {weapon.level} · {weapon.rarity}
              </small>
            </b>
          ))}
          <span className="current-quality">{game.relics.length} relics</span>
        </div>
      </div>
      {synergies.length > 0 && (
        <div className="synergy-strip">
          <Sparkles size={13} />
          {synergies.join('  /  ')}
        </div>
      )}
    </section>
  );
}
