import { emptyStats, weaponProfile, type WeaponId } from '@/lib/roguelike';

const SHOT = '#f2c57c';
const CORE = '#fff3d2';
const TRACE = '#ac976c';

function Emitter({
  x = 32,
  y = 64,
  angle = 0,
  color,
}: {
  x?: number;
  y?: number;
  angle?: number;
  color: string;
}) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${angle})`}>
      <path
        d="M-12-9H0L7-5V5L0 9H-12Z"
        fill="#788477"
        stroke="#bac4b3"
        strokeWidth="1.5"
      />
      <path d="M-10-7H-3V7H-10Z" fill="#404c40" />
      <path
        d="M0-4H15V4H0Z"
        fill="#b6b9a5"
        stroke="#252e27"
        strokeWidth="1.5"
      />
      <path d="M11-5H16V5H11Z" fill="#d3b077" />
      <path d="M-8-4H-5V4H-8Z" fill={color} />
    </g>
  );
}

function Robot({
  x,
  y,
  hit = false,
  scale = 1,
}: {
  x: number;
  y: number;
  hit?: boolean;
  scale?: number;
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} data-target="robot">
      <path
        d="M-4-14H4V-7H-4ZM-7-5H7V6H-7ZM-11-4H-8V7H-11ZM8-4H11V7H8ZM-7 8H-2V15H-7ZM2 8H7V15H2Z"
        fill={hit ? '#a99b7f' : '#7b897c'}
        stroke={hit ? '#e9c990' : '#b4c0ad'}
        strokeWidth="1.2"
      />
      <path d="M-2-11H2" stroke="#19231e" strokeWidth="2" />
      <path d="M-3-1H3V3H-3Z" fill="#26332b" />
    </g>
  );
}

function Round({
  x,
  y = 64,
  angle = 0,
  heavy = false,
}: {
  x: number;
  y?: number;
  angle?: number;
  heavy?: boolean;
}) {
  return (
    <g
      transform={`translate(${x} ${y}) rotate(${angle})`}
      data-projectile="round"
    >
      <path
        d={heavy ? 'M-12-4H3L9 0L3 4H-12Z' : 'M-9-2.4H3L7 0L3 2.4H-9Z'}
        fill={SHOT}
      />
      <path d={heavy ? 'M-9-1H4' : 'M-7 0H3'} stroke={CORE} strokeWidth="1.6" />
    </g>
  );
}

function Impact({ x, y, size = 1 }: { x: number; y: number; size?: number }) {
  return (
    <path
      transform={`translate(${x} ${y}) scale(${size})`}
      d="M-8-8L-4-4M8-8L4-4M-8 8L-4 4M8 8L4 4"
      stroke={CORE}
      strokeWidth="2"
      strokeLinecap="round"
    />
  );
}

/** Intrinsic firing behavior at the offered level; relic effects remain in reward copy. */
export function WeaponDiagram({
  id,
  color,
  level = 1,
}: {
  id: WeaponId;
  color: string;
  level?: number;
}) {
  const profile = weaponProfile({ id, level, rarity: 'common' }, emptyStats());
  const count = profile.pellets;
  const fan = (distance: number) =>
    Array.from({ length: count }, (_, i) => {
      const angle = count === 1 ? 0 : (i / (count - 1) - 0.5) * profile.spread;
      return {
        x: 48 + Math.cos(angle) * distance,
        y: 64 + Math.sin(angle) * distance,
        angle: (angle * 180) / Math.PI,
      };
    });
  return (
    <svg
      viewBox="0 0 272 128"
      className="weapon-diagram"
      aria-hidden="true"
      data-weapon={id}
      data-pellets={count}
    >
      <rect
        x="1"
        y="1"
        width="270"
        height="126"
        rx="3"
        fill="#19261f"
        stroke="#65715b"
      />
      <path
        d="M10 22V10H22M250 10H262V22M10 106V118H22M250 118H262V106"
        fill="none"
        stroke="#a4ae91"
        strokeWidth="1.5"
        opacity=".55"
      />
      <path
        d="M64 13V115M112 13V115M160 13V115M208 13V115M13 32H259M13 64H259M13 96H259"
        stroke="#667963"
        opacity=".13"
      />
      {id === 'nova' ? (
        <>
          <circle
            cx="136"
            cy="64"
            r="43"
            fill="none"
            stroke={TRACE}
            strokeDasharray="2 6"
            opacity=".45"
          />
          {Array.from({ length: count }, (_, i) => {
            const a = (i / count) * Math.PI * 2;
            return (
              <g
                key={i}
                transform={`translate(136 64) rotate(${(a * 180) / Math.PI})`}
              >
                <path d="M18 0H34" stroke={TRACE} strokeWidth="2" />
                <Round x={43} y={0} />
              </g>
            );
          })}
          <circle
            cx="136"
            cy="64"
            r="12"
            fill="#74816e"
            stroke="#c4ccb5"
            strokeWidth="2"
          />
          <circle cx="136" cy="64" r="5" fill={color} />
          <Robot x={60} y={64} />
          <Robot x={213} y={64} />
        </>
      ) : id === 'ricochet' ? (
        <>
          <path
            d="M54 19H250V109H54"
            fill="none"
            stroke="#819078"
            strokeWidth="4"
          />
          {Array.from({ length: count }, (_, i) => {
            // Reflect each trajectory at the arena edge, exactly three times.
            const angle =
              -0.55 + (i / Math.max(1, count - 1) - 0.5) * profile.spread;
            let x = 46,
              y = 56,
              dx = Math.cos(angle),
              dy = Math.sin(angle);
            const contacts: { x: number; y: number }[] = [];
            for (let bounce = 0; bounce < profile.bounces!; bounce++) {
              const tx = ((dx > 0 ? 250 : 18) - x) / dx;
              const ty = ((dy > 0 ? 109 : 19) - y) / dy;
              const distance = Math.min(tx, ty);
              x += dx * distance;
              y += dy * distance;
              contacts.push({ x, y });
              if (tx < ty) dx = -dx;
              else dy = -dy;
            }
            const end = { x: x + dx * 39, y: y + dy * 39 };
            return (
              <g key={i} data-bounces={profile.bounces}>
                <path
                  d={`M46 56${contacts.map((p) => `L${p.x} ${p.y}`).join('')}L${end.x} ${end.y}`}
                  fill="none"
                  stroke={i % 2 ? CORE : SHOT}
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                />
                {contacts.map((p, j) => (
                  <Impact key={j} x={p.x} y={p.y} size={0.65} />
                ))}
                <Round
                  x={end.x}
                  y={end.y}
                  angle={(Math.atan2(dy, dx) * 180) / Math.PI}
                />
              </g>
            );
          })}
          <Emitter color={color} angle={-30} />
        </>
      ) : id === 'seeker' ? (
        <>
          {Array.from({ length: count }, (_, i) => {
            const y = 27 + (i / Math.max(1, count - 1)) * 74;
            const bend = y < 64 ? 10 : 118;
            return (
              <g key={i}>
                <Robot x={235} y={y} />
                <path
                  d={`M48 64C107 ${bend} 142 ${bend} 216 ${y}`}
                  fill="none"
                  stroke={TRACE}
                  strokeWidth="2"
                  strokeDasharray="5 4"
                />
                <g
                  transform={`translate(201 ${y + (y < 64 ? -6 : 6)}) rotate(${y < 64 ? 15 : -15})`}
                  data-projectile="missile"
                >
                  <path d="M-13-4L-17-8H-7L8 0L-7 8H-17L-13 4Z" fill={SHOT} />
                  <path d="M-11 0H2" stroke={CORE} strokeWidth="2.5" />
                </g>
              </g>
            );
          })}
          <Emitter color={color} />
        </>
      ) : id === 'rail' ? (
        <>
          <path
            d="M48 64H251"
            stroke={TRACE}
            strokeWidth="2"
            strokeDasharray="6 4"
          />
          {Array.from({ length: profile.pierce! + 1 }, (_, i) => (
            <Robot key={i} x={82 + i * 28} y={64} scale={0.75} hit />
          ))}
          <path d="M53 64H246" stroke={CORE} strokeWidth="2" opacity=".7" />
          <Round x={249} heavy />
          <Emitter color={color} />
        </>
      ) : id === 'tesla' ? (
        <>
          <path
            d="M48 64H103"
            stroke={TRACE}
            strokeWidth="2"
            strokeDasharray="5 5"
          />
          <Round x={81} />
          {[
            [111, 64],
            [153, 31],
            [195, 89],
            [241, 48],
          ].map(([x, y], i, points) => (
            <g key={i}>
              {i > 0 && (
                <path
                  data-chain-hop={i}
                  d={`M${points[i - 1][0]} ${points[i - 1][1]}L${x - 31} ${y + (i % 2 ? 15 : -20)}L${x - 15} ${y + (i % 2 ? 23 : -28)}L${x} ${y}`}
                  fill="none"
                  stroke={CORE}
                  strokeWidth={3.5 - i * 0.5}
                />
              )}
              <Robot x={x} y={y} hit />
              <Impact x={x} y={y} size={0.6} />
            </g>
          ))}
          <Emitter color={color} />
        </>
      ) : id === 'mortar' ? (
        <>
          <circle cx="206" cy="64" r="38" fill="#d5a055" opacity=".12" />
          <circle
            cx="206"
            cy="64"
            r="38"
            fill="none"
            stroke={SHOT}
            strokeWidth="2"
            strokeDasharray="6 4"
          />
          <Robot x={220} y={39} hit />
          <Robot x={233} y={82} hit />
          <Robot x={191} y={79} hit />
          <path
            d="M48 64H197"
            stroke={TRACE}
            strokeWidth="2"
            strokeDasharray="4 7"
          />
          <Round x={119} heavy />
          <path
            d="M206 45L210 57L224 53L216 65L225 75L211 72L205 86L201 72L187 77L194 64L185 54L200 57Z"
            fill={SHOT}
          />
          <circle cx="205" cy="64" r="6" fill={CORE} />
          <Emitter color={color} />
        </>
      ) : id === 'flame' ? (
        <>
          <path d="M49 64L135 42L145 64L135 86Z" fill="#d6964f" opacity=".1" />
          {fan(81).map((p, i) => (
            <g
              key={i}
              transform={`translate(48 64) rotate(${p.angle})`}
              data-projectile="flame"
            >
              <path
                d="M7 0Q31-9 64-6L86 0L64 6Q31 9 7 0Z"
                fill="#d39452"
                opacity=".75"
              />
              <path d="M7 0Q30-4 61 0Q30 4 7 0Z" fill={CORE} />
            </g>
          ))}
          <Robot x={137} y={64} hit />
          <path
            d="M129 77Q121 63 131 58Q128 66 134 67Q130 53 141 50Q136 64 144 67Q150 64 148 59Q159 72 146 80"
            fill="none"
            stroke={SHOT}
            strokeWidth="3"
          />
          <Robot x={238} y={64} />
          <Emitter color={color} />
        </>
      ) : id === 'scatter' || id === 'trident' ? (
        <>
          {fan(id === 'scatter' ? 110 : 172).map((p, i) => (
            <g key={i}>
              <path
                d={`M48 64L${p.x} ${p.y}`}
                stroke={TRACE}
                strokeWidth="1.5"
                opacity=".7"
              />
              <Round x={p.x} y={p.y} angle={p.angle} />
            </g>
          ))}
          {id === 'scatter' ? (
            <>
              <Robot x={191} y={37} />
              <Robot x={191} y={91} />
            </>
          ) : (
            <Robot x={248} y={64} />
          )}
          <Emitter color={color} />
        </>
      ) : (
        <>
          <path d="M48 64H231" stroke={TRACE} strokeWidth="1.5" opacity=".6" />
          {Array.from({ length: id === 'repeater' ? 8 : 4 }, (_, i) => (
            <Round key={i} x={62 + i * (id === 'repeater' ? 23 : 51)} />
          ))}
          <Robot x={248} y={64} />
          <Emitter color={color} />
        </>
      )}
    </svg>
  );
}
